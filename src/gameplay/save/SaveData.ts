import type { UpgradeType } from '../player/PlayerUpgradeService';

/** Per-level completion data saved to localStorage */
export interface LevelSaveData {
  completed: boolean;
  bestTime: number; // seconds
  partsCollected: number;
  upgradesFound: number;
  dogAvoided: boolean; // completed without being caught
}

/** Full save data structure */
export interface SaveData {
  /** Per-level data keyed by level ID (e.g. 'level-01') */
  levels: Record<string, LevelSaveData>;
  /** Set of permanently collected upgrades */
  upgrades: UpgradeType[];
  /** Total helicopter parts collected across all levels */
  totalParts: number;
  /** Total story clues found */
  storyCluesFound: number;
  /** Whether the player has seen the ending */
  endingUnlocked: boolean;
  /** Last played level ID */
  lastLevelId: string;
  /** Version for migration */
  version: number;
}

/** Default save data for a fresh start */
export const DEFAULT_SAVE_DATA: SaveData = {
  levels: {},
  upgrades: [],
  totalParts: 0,
  storyCluesFound: 0,
  endingUnlocked: false,
  lastLevelId: 'level-01',
  version: 1,
};