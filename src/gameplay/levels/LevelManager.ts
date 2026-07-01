import { LevelLoader, type LevelRuntime } from './LevelLoader';
import type { LevelData, HazardSpawn } from './LevelData';
import type { PhysicsWorld } from '../../engine/physics/PhysicsWorld';
import type { ThreeRenderer } from '../../engine/rendering/ThreeRenderer';
import type { AudioManager } from '../../engine/audio/AudioManager';
import type { EntityManager } from '../entities/EntityManager';
import { HelicopterPartPickup } from '../pickups/HelicopterPartPickup';
import { SafeZone } from './SafeZone';
import { MonsterChaseDirector } from '../monster/MonsterChaseDirector';
import { FallingIceHazard } from '../hazards/FallingIceHazard';
import { CrackedIceHazard } from '../hazards/CrackedIceHazard';
import type { Hazard } from '../hazards/Hazard';
import { MusicLayerManager } from '../../engine/audio/MusicLayerManager';

function createHazardFromSpawn(spawn: HazardSpawn, _runtime: LevelRuntime): Hazard | null {
  switch (spawn.type) {
    case 'falling_ice':
      return new FallingIceHazard(
        spawn.position,
        spawn.halfExtents,
        spawn.triggerRadius ?? 2,
        spawn.fallDelay ?? 1.0,
      );
    case 'cracked_ice':
      return new CrackedIceHazard(
        spawn.position,
        spawn.halfExtents,
        spawn.triggerRadius ?? 2.5,
        // Cracked ice defaults to 2s active duration
      );
    default:
      // Other hazard types not yet implemented
      return null;
  }
}

export class LevelManager {
  private loader: LevelLoader;
  private physics: PhysicsWorld;
  private renderer: ThreeRenderer | null;
  private audioManager: AudioManager | null;
  private currentLevelId: string | null = null;
  private currentRuntime: LevelRuntime | null = null;
  private currentData: LevelData | null = null;
  private _safeZone: SafeZone | null = null;
  private _chaseDirector: MonsterChaseDirector | null = null;
  private _musicLayer: MusicLayerManager | null = null;

  constructor(physics: PhysicsWorld, renderer: ThreeRenderer | null = null, audioManager: AudioManager | null = null) {
    this.physics = physics;
    this.renderer = renderer;
    this.audioManager = audioManager;
    this.loader = new LevelLoader(physics, renderer);
  }

  get isLevelLoaded(): boolean {
    return this.currentRuntime !== null;
  }

  get currentId(): string | null {
    return this.currentLevelId;
  }

  get runtime(): LevelRuntime | null {
    return this.currentRuntime;
  }

  get levelData(): LevelData | null {
    return this.currentData;
  }

  /** The current level's SafeZone entity (null until level loads) */
  get safeZone(): SafeZone | null {
    return this._safeZone;
  }

  /** The current level's MonsterChaseDirector (null until level loads) */
  get chaseDirector(): MonsterChaseDirector | null {
    return this._chaseDirector;
  }

  /** The current level's MusicLayerManager (null until level loads, or no audio) */
  get musicLayer(): MusicLayerManager | null {
    return this._musicLayer;
  }

  /** Load a level by ID from the assets/levels/ directory */
  async loadLevel(
    levelId: string,
    entityManager?: EntityManager,
    onPartCollect?: () => void,
  ): Promise<void> {
    // Unload current if any
    if (this.currentRuntime) {
      this.unloadCurrent();
    }

    const path = `/assets/levels/${levelId}.json`;
    const data = await this.loader.loadLevelData(path);
    const runtime = this.loader.spawnLevel(data);
    this.loader.applyAtmosphere(data);

    this.currentLevelId = levelId;
    this.currentRuntime = runtime;
    this.currentData = data;

    // Create pickup, safe zone, and monster chase director entities after level is loaded
    if (entityManager) {
      if (data.helicopterPart) {
        const pickup = new HelicopterPartPickup(
          this.physics,
          this.renderer,
          data.helicopterPart.position,
          data.helicopterPart.partId,
        );
        if (onPartCollect) {
          pickup.onCollect = onPartCollect;
        }
        entityManager.add(pickup);
      }

      const sz = data.safeZone;
      this._safeZone = new SafeZone(
        this.physics,
        this.renderer,
        sz.position,
        sz.radius,
        sz.requiresPart,
      );
      entityManager.add(this._safeZone);

      // Create the monster chase director with dog route + tuning
      const scene = this.renderer?.scene ?? null;

      // Create music layer manager for chase crossfade (if audio available)
      if (this.audioManager) {
        this._musicLayer = new MusicLayerManager(this.audioManager, {
          patrolKey: 'music_patrol',
          chaseKey: 'music_chase',
          closeThreshold: data.dogTuning.patrolDistance * 0.5,
          catchThreshold: data.dogTuning.catchRadius * 2,
        });
      }

      this._chaseDirector = new MonsterChaseDirector(
        data.dogRoute,
        data.dogTuning,
        scene,
        this.audioManager ?? undefined,
        this._musicLayer ?? undefined,
      );
      entityManager.add(this._chaseDirector);

      // Create hazard entities from level data
      for (const spawn of data.hazards) {
        const hazard = createHazardFromSpawn(spawn, runtime);
        if (hazard) {
          entityManager.add(hazard);
          // Wire hazards to close the dog gap on activation
          const spawnedHazard = hazard;
          spawnedHazard.onActivate = () => {
            if (this._chaseDirector && !this._chaseDirector.caught) {
              if ('dogGapPenalty' in spawnedHazard) {
                const penalty = (spawnedHazard as unknown as { dogGapPenalty: number }).dogGapPenalty;
                this._chaseDirector.closeDogGap(penalty);
              } else {
                this._chaseDirector.closeDogGap(0.08);
              }
            }
          };
        }
      }
    }
  }

  /** Unload the currently loaded level */
  unloadCurrent(): void {
    if (!this.currentRuntime) return;
    this.loader.unloadLevel(this.currentRuntime);
    this._chaseDirector?.dispose();
    this._musicLayer?.dispose();
    this._musicLayer = null;
    this._chaseDirector = null;
    this.currentRuntime = null;
    this.currentData = null;
    this.currentLevelId = null;
    this._safeZone = null;
  }
}