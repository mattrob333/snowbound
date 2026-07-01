import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage before importing SaveService
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

import { SaveService } from '../gameplay/save/SaveService';
import type { SaveData } from '../gameplay/save/SaveData';

describe('SaveService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(store).forEach(k => delete store[k]);
  });

  it('should start with fresh save when no localStorage data exists', () => {
    const svc = new SaveService();
    const data = svc.getAll();
    expect(data.version).toBe(1);
    expect(data.totalParts).toBe(0);
    expect(data.storyCluesFound).toBe(0);
    expect(data.endingUnlocked).toBe(false);
    expect(data.lastLevelId).toBe('level-01');
    expect(Object.keys(data.levels).length).toBe(0);
  });

  it('should load existing save from localStorage', () => {
    const existing: SaveData = {
      version: 1,
      levels: { 'level-01': { completed: true, bestTime: 45.2, partsCollected: 1, upgradesFound: 0, dogAvoided: true } },
      upgrades: [],
      totalParts: 1,
      storyCluesFound: 0,
      endingUnlocked: false,
      lastLevelId: 'level-02',
    };
    store['snowbound_save'] = JSON.stringify(existing);

    const svc = new SaveService();
    expect(svc.isLevelCompleted('level-01')).toBe(true);
    expect(svc.getTotalParts()).toBe(1);
    expect(svc.getLastLevelId()).toBe('level-02');
    expect(svc.isLevelCompleted('level-02')).toBe(false);
  });

  it('should handle corrupted save data gracefully', () => {
    store['snowbound_save'] = '{malformed json!!!';
    const svc = new SaveService();
    // Should start fresh
    expect(svc.getTotalParts()).toBe(0);
    expect(svc.getAll().version).toBe(1);
  });

  it('should mark a level as completed', () => {
    const svc = new SaveService();
    expect(svc.isLevelCompleted('level-01')).toBe(false);
    svc.completeLevel('level-01', 60, 1, 0, true);
    expect(svc.isLevelCompleted('level-01')).toBe(true);
    const lvl = svc.getLevel('level-01');
    expect(lvl?.bestTime).toBe(60);
    expect(lvl?.partsCollected).toBe(1);
    expect(lvl?.dogAvoided).toBe(true);
  });

  it('should keep the best (lowest) time when completing a level again', () => {
    const svc = new SaveService();
    svc.completeLevel('level-01', 60, 1, 0, true);
    svc.completeLevel('level-01', 45, 2, 1, true);
    const lvl = svc.getLevel('level-01');
    expect(lvl?.bestTime).toBe(45);
    expect(lvl?.partsCollected).toBe(2); // max of both completions
  });

  it('should persist to localStorage', () => {
    const svc = new SaveService();
    svc.completeLevel('level-01', 30, 1, 0, true);
    expect(localStorageMock.setItem).toHaveBeenCalled();
    const saved = JSON.parse(store['snowbound_save']);
    expect(saved.levels['level-01'].completed).toBe(true);
    expect(saved.totalParts).toBe(0);
  });

  it('should increment parts and story clues', () => {
    const svc = new SaveService();
    expect(svc.getTotalParts()).toBe(0);
    expect(svc.getStoryCluesFound()).toBe(0);
    svc.addPart();
    svc.addPart();
    svc.addPart();
    expect(svc.getTotalParts()).toBe(3);
    svc.addStoryClue();
    expect(svc.getStoryCluesFound()).toBe(1);
  });

  it('should add upgrades without duplicates', () => {
    const svc = new SaveService();
    svc.addUpgrade('sprint_boost');
    svc.addUpgrade('jump_boost');
    svc.addUpgrade('sprint_boost'); // duplicate — should be ignored
    expect(svc.getUpgrades()).toEqual(['sprint_boost', 'jump_boost']);
  });

  it('should track last level ID', () => {
    const svc = new SaveService();
    expect(svc.getLastLevelId()).toBe('level-01');
    svc.setLastLevelId('level-05');
    expect(svc.getLastLevelId()).toBe('level-05');
  });

  it('should unlock levels sequentially', () => {
    const svc = new SaveService();
    // Only level-01 should be unlocked initially
    expect(svc.isLevelUnlocked('level-01')).toBe(true);
    expect(svc.isLevelUnlocked('level-02')).toBe(false);
    expect(svc.isLevelUnlocked('level-03')).toBe(false);

    svc.completeLevel('level-01', 50, 1, 0, true);
    expect(svc.isLevelUnlocked('level-02')).toBe(true);
    expect(svc.isLevelUnlocked('level-03')).toBe(false);

    svc.completeLevel('level-02', 60, 1, 0, false);
    expect(svc.isLevelUnlocked('level-03')).toBe(true);
  });

  it('should get list of unlocked levels', () => {
    const svc = new SaveService();
    expect(svc.getUnlockedLevels()).toEqual(['level-01']);

    svc.completeLevel('level-01', 50, 1, 0, true);
    const unlocked = svc.getUnlockedLevels();
    expect(unlocked).toContain('level-01');
    expect(unlocked).toContain('level-02');
    expect(unlocked).not.toContain('level-03');
  });

  it('should unlock ending', () => {
    const svc = new SaveService();
    expect(svc.isEndingUnlocked()).toBe(false);
    svc.unlockEnding();
    expect(svc.isEndingUnlocked()).toBe(true);
  });

  it('should reset all progress', () => {
    const svc = new SaveService();
    svc.completeLevel('level-01', 30, 1, 0, true);
    svc.addPart();
    svc.addUpgrade('sprint_boost');
    svc.setLastLevelId('level-05');

    const beforeUpgrades = svc.getUpgrades();
    expect(beforeUpgrades.length).toBe(1); // sprint_boost only
    expect(svc.isLevelCompleted('level-01')).toBe(true);
    expect(svc.getTotalParts()).toBe(1);
    expect(svc.getLastLevelId()).toBe('level-05');

    svc.resetAll();

    // After reset, check the upgrades
    const afterUpgrades = svc.getUpgrades();
    // Debug logging
    if (afterUpgrades.length > 0) {
      console.log('After reset, upgrades still contain:', afterUpgrades);
      console.log('Store contents:', store['snowbound_save']);
    }

    expect(svc.isLevelCompleted('level-01')).toBe(false);
    expect(svc.getTotalParts()).toBe(0);
    expect(afterUpgrades.length).toBe(0);
    expect(svc.getLastLevelId()).toBe('level-01');
  });

  it('should recover from corrupted save after reset', () => {
    store['snowbound_save'] = 'utter-garbage';
    const svc = new SaveService();
    // Fresh start
    expect(svc.getTotalParts()).toBe(0);
    // Reset should work
    svc.resetAll();
    expect(svc.getLastLevelId()).toBe('level-01');
  });
});