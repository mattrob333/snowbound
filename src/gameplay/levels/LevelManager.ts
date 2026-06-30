import { LevelLoader, type LevelRuntime } from './LevelLoader';
import type { LevelData } from './LevelData';
import type { PhysicsWorld } from '../../engine/physics/PhysicsWorld';
import type { ThreeRenderer } from '../../engine/rendering/ThreeRenderer';

export class LevelManager {
  private loader: LevelLoader;
  private currentLevelId: string | null = null;
  private currentRuntime: LevelRuntime | null = null;
  private currentData: LevelData | null = null;

  constructor(physics: PhysicsWorld, renderer: ThreeRenderer | null = null) {
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

  /** Load a level by ID from the assets/levels/ directory */
  async loadLevel(levelId: string): Promise<void> {
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
  }

  /** Unload the currently loaded level */
  unloadCurrent(): void {
    if (!this.currentRuntime) return;
    this.loader.unloadLevel(this.currentRuntime);
    this.currentRuntime = null;
    this.currentData = null;
    this.currentLevelId = null;
  }
}