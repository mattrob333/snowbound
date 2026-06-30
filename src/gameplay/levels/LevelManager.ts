import { LevelLoader, type LevelRuntime } from './LevelLoader';
import type { LevelData, HazardSpawn } from './LevelData';
import type { PhysicsWorld } from '../../engine/physics/PhysicsWorld';
import type { ThreeRenderer } from '../../engine/rendering/ThreeRenderer';
import type { EntityManager } from '../entities/EntityManager';
import { HelicopterPartPickup } from '../pickups/HelicopterPartPickup';
import { SafeZone } from './SafeZone';
import { MonsterChaseDirector } from '../monster/MonsterChaseDirector';
import { FallingIceHazard } from '../hazards/FallingIceHazard';
import type { Hazard } from '../hazards/Hazard';

function createHazardFromSpawn(spawn: HazardSpawn): Hazard | null {
  switch (spawn.type) {
    case 'falling_ice':
      return new FallingIceHazard(
        spawn.position,
        spawn.halfExtents,
        spawn.triggerRadius ?? 2,
        spawn.fallDelay ?? 1.0,
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
  private currentLevelId: string | null = null;
  private currentRuntime: LevelRuntime | null = null;
  private currentData: LevelData | null = null;
  private _safeZone: SafeZone | null = null;
  private _chaseDirector: MonsterChaseDirector | null = null;

  constructor(physics: PhysicsWorld, renderer: ThreeRenderer | null = null) {
    this.physics = physics;
    this.renderer = renderer;
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
      this._chaseDirector = new MonsterChaseDirector(
        data.dogRoute,
        data.dogTuning,
        scene,
      );
      entityManager.add(this._chaseDirector);

      // Create hazard entities from level data
      for (const spawn of data.hazards) {
        const hazard = createHazardFromSpawn(spawn);
        if (hazard) {
          entityManager.add(hazard);
        }
      }
    }
  }

  /** Unload the currently loaded level */
  unloadCurrent(): void {
    if (!this.currentRuntime) return;
    this.loader.unloadLevel(this.currentRuntime);
    this._chaseDirector?.dispose();
    this._chaseDirector = null;
    this.currentRuntime = null;
    this.currentData = null;
    this.currentLevelId = null;
    this._safeZone = null;
  }
}