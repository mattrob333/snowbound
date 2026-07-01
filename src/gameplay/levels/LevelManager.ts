import { LevelLoader, type LevelRuntime } from './LevelLoader';
import type { LevelData, HazardSpawn, AABB } from './LevelData';
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
import type { VoiceLineService } from '../../engine/audio/VoiceLineService';

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

/** Convert a position + halfExtents (centre and size) to an AABB (min/max) */
function halfExtentsToAABB(pos: { x: number; y: number; z: number }, half: { x: number; y: number; z: number }): AABB {
  return {
    min: { x: pos.x - half.x, y: pos.y - half.y, z: pos.z - half.z },
    max: { x: pos.x + half.x, y: pos.y + half.y, z: pos.z + half.z },
  };
}

/** Collect ice zones from level data hazards and obstacles */
function collectIceZones(data: LevelData): AABB[] {
  const zones: AABB[] = [];
  for (const hazard of data.hazards) {
    if (hazard.type === 'cracked_ice' || hazard.type === 'sliding_ice') {
      zones.push(halfExtentsToAABB(hazard.position, hazard.halfExtents));
    }
  }
  for (const obstacle of data.obstacles) {
    if (obstacle.type === 'cracked_ice') {
      zones.push(halfExtentsToAABB(obstacle.position, obstacle.halfExtents));
    }
  }
  return zones;
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
  private _voiceLines: VoiceLineService | null = null;

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

  /** Set the voice line service for Jim's audio callouts */
  setVoiceLines(vls: VoiceLineService | null): void {
    this._voiceLines = vls;
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
      this.removeRawObjectivePlaceholders(runtime);

      if (data.helicopterPart) {
        const pickup = new HelicopterPartPickup(
          this.physics,
          this.renderer,
          data.helicopterPart.position,
          data.helicopterPart.partId,
        );
        const partCollectedCallbacks: (() => void)[] = [];
        if (onPartCollect) {
          partCollectedCallbacks.push(onPartCollect);
        }
        if (this._voiceLines) {
          partCollectedCallbacks.push(() => this._voiceLines!.playPartCollected());
        }
        if (partCollectedCallbacks.length > 0) {
          pickup.onCollect = () => {
            for (const cb of partCollectedCallbacks) cb();
          };
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
      // Wire level complete voice line
      if (this._voiceLines) {
        const originalOnComplete = this._safeZone.onLevelComplete;
        this._safeZone.onLevelComplete = () => {
          originalOnComplete?.();
          this._voiceLines!.playLevelComplete();
        };
      }
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
        collectIceZones(data),
      );
      // Wire caught voice line
      if (this._voiceLines) {
        const originalOnCatch = this._chaseDirector.onCatchPlayer;
        this._chaseDirector.onCatchPlayer = () => {
          originalOnCatch?.();
          this._voiceLines!.playCaught();
        };
      }
      entityManager.add(this._chaseDirector);

      // Create hazard entities from level data
      data.hazards.forEach((spawn, index) => {
        const hazard = createHazardFromSpawn(spawn, runtime);
        if (hazard) {
          if (hazard instanceof CrackedIceHazard) {
            const visualMesh = runtime.hazardMeshes[index];
            if (visualMesh) {
              hazard.setVisualMesh(visualMesh);
            }
          }

          entityManager.add(hazard);
          // Wire hazards to close the dog gap on activation + play stumble voice line
          const spawnedHazard = hazard;
          const hazardActivateCallbacks: (() => void)[] = [];
          hazardActivateCallbacks.push(() => {
            if (this._chaseDirector && !this._chaseDirector.caught) {
              if ('dogGapPenalty' in spawnedHazard) {
                const penalty = (spawnedHazard as unknown as { dogGapPenalty: number }).dogGapPenalty;
                this._chaseDirector.closeDogGap(penalty);
              } else {
                this._chaseDirector.closeDogGap(0.08);
              }
            }
          });
          if (this._voiceLines) {
            hazardActivateCallbacks.push(() => this._voiceLines!.playStumble());
          }
          spawnedHazard.onActivate = () => {
            for (const cb of hazardActivateCallbacks) cb();
          };
        }
      });
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

  private removeRawObjectivePlaceholders(_runtime: LevelRuntime): void {
    // No-op: LevelLoader no longer spawns raw part/safezone placeholders.
    // HelicopterPartPickup and SafeZone entities handle their own creation.
  }

  }
