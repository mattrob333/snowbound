import type { SaveData, LevelSaveData } from './SaveData';
import type { UpgradeType } from '../player/PlayerUpgradeService';

const STORAGE_KEY = 'snowbound_save';

/**
 * SaveService — localStorage persistence for game progress.
 *
 * Handles saving/loading level completion, upgrades, parts, and
 * story flags. Provides a simple key-value abstraction over
 * localStorage with JSON serialisation and version migration.
 */
export class SaveService {
  private data: SaveData;

  constructor() {
    this.data = this.loadFromDisk();
  }

  /** Create a fresh copy of default save data (deep copy to avoid mutation of the const) */
  private static createDefaultData(): SaveData {
    return {
      version: 1,
      levels: {},
      upgrades: [],
      totalParts: 0,
      storyCluesFound: 0,
      endingUnlocked: false,
      lastLevelId: 'level-01',
    };
  }

  // ---- Public query API ----

  /** Get the full save data (for UI or debugging) */
  getAll(): SaveData {
    return { ...this.data, levels: { ...this.data.levels } };
  }

  /** Get the save data for a specific level */
  getLevel(levelId: string): LevelSaveData | undefined {
    return this.data.levels[levelId];
  }

  /** Whether a specific level has been completed */
  isLevelCompleted(levelId: string): boolean {
    return this.data.levels[levelId]?.completed ?? false;
  }

  /** The highest unlocked level ID */
  getUnlockedLevels(): string[] {
    // Level-01 is always unlocked
    const unlocked = ['level-01'];
    for (let i = 2; i <= 15; i++) {
      const prev = `level-${String(i - 1).padStart(2, '0')}`;
      const curr = `level-${String(i).padStart(2, '0')}`;
      if (this.data.levels[prev]?.completed) {
        unlocked.push(curr);
      } else {
        break;
      }
    }
    return unlocked;
  }

  /** Whether the player can play a given level */
  isLevelUnlocked(levelId: string): boolean {
    return this.getUnlockedLevels().includes(levelId);
  }

  /** Last played level ID */
  getLastLevelId(): string {
    return this.data.lastLevelId;
  }

  /** Total parts collected */
  getTotalParts(): number {
    return this.data.totalParts;
  }

  /** Total story clues found */
  getStoryCluesFound(): number {
    return this.data.storyCluesFound;
  }

  /** Whether the ending has been unlocked */
  isEndingUnlocked(): boolean {
    return this.data.endingUnlocked;
  }

  /** Get the set of permanently collected upgrades */
  getUpgrades(): UpgradeType[] {
    return [...this.data.upgrades];
  }

  // ---- Mutations (auto-save) ----

  /** Mark a level as completed with its details */
  completeLevel(
    levelId: string,
    time: number,
    partsCollected: number,
    upgradesFound: number,
    dogAvoided: boolean,
  ): void {
    const existing = this.data.levels[levelId];
    const current = existing?.completed ? existing.bestTime : Infinity;
    this.data.levels[levelId] = {
      completed: true,
      bestTime: Math.min(current, time),
      partsCollected: Math.max(existing?.partsCollected ?? 0, partsCollected),
      upgradesFound: Math.max(existing?.upgradesFound ?? 0, upgradesFound),
      dogAvoided: existing?.dogAvoided ?? dogAvoided,
    };
    this.saveToDisk();
  }

  /** Record a collected part (additive, counts across levels) */
  addPart(): void {
    this.data.totalParts++;
    this.saveToDisk();
  }

  /** Record a found story clue */
  addStoryClue(): void {
    this.data.storyCluesFound++;
    this.saveToDisk();
  }

  /** Record a permanently collected upgrade */
  addUpgrade(type: UpgradeType): void {
    if (!this.data.upgrades.includes(type)) {
      this.data.upgrades.push(type);
      this.saveToDisk();
    }
  }

  /** Set the last played level ID */
  setLastLevelId(levelId: string): void {
    this.data.lastLevelId = levelId;
    this.saveToDisk();
  }

  /** Unlock the ending (beats level 15) */
  unlockEnding(): void {
    this.data.endingUnlocked = true;
    this.saveToDisk();
  }

  /** Reset all progress back to defaults */
  resetAll(): void {
    this.data = SaveService.createDefaultData();
    this.saveToDisk();
  }

  // ---- Internal persistence ----

  private loadFromDisk(): SaveData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return SaveService.createDefaultData();
      }
      const parsed = JSON.parse(raw) as SaveData;
      return this.migrate(parsed);
    } catch {
      // Corrupted save — start fresh
      return SaveService.createDefaultData();
    }
  }

  private saveToDisk(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // localStorage full or unavailable — silently fail
    }
  }

  /** Apply version migrations in sequence */
  private migrate(data: SaveData): SaveData {
    const current = { ...data, levels: { ...data.levels } };

    // Future migrations: if (current.version < 2) { ...; current.version = 2; }

    return current;
  }
}