import { PLAYER_TUNING } from '../../config/tuning';

/** The types of permanent upgrades a player can collect */
export const UpgradeType = {
  SprintBoost: 'sprint_boost',
  WallrunExtender: 'wallrun_extender',
  JumpBoost: 'jump_boost',
  SlidePower: 'slide_power',
} as const;
export type UpgradeType = (typeof UpgradeType)[keyof typeof UpgradeType];

/** Stat multipliers applied by each upgrade */
export interface UpgradeMultipliers {
  sprintSpeed: number;
  wallRunDuration: number;
  jumpVelocity: number;
  slideSpeed: number;
}

/** Upgrade definition — what stat changes and the display name */
interface UpgradeDef {
  displayName: string;
  description: string;
  multiplier: Partial<UpgradeMultipliers>;
}

const UPGRADE_DEFS: Record<UpgradeType, UpgradeDef> = {
  sprint_boost: {
    displayName: 'Sprint Boost',
    description: 'Run 15% faster',
    multiplier: { sprintSpeed: 1.15 },
  },
  wallrun_extender: {
    displayName: 'Climbing Gloves',
    description: 'Wall-run lasts 25% longer',
    multiplier: { wallRunDuration: 1.25 },
  },
  jump_boost: {
    displayName: 'Spring Boots',
    description: 'Jump 20% higher',
    multiplier: { jumpVelocity: 1.20 },
  },
  slide_power: {
    displayName: 'Slide Pads',
    description: 'Slide 15% faster',
    multiplier: { slideSpeed: 1.15 },
  },
};

/**
 * PlayerUpgradeService — tracks permanent upgrades collected across levels.
 * Currently in-memory; will be integrated with SaveService in Phase 9.
 */
export class PlayerUpgradeService {
  private upgrades: Set<UpgradeType> = new Set();
  private _enabled = true;

  /** Get the list of all collected upgrades */
  getCollected(): UpgradeType[] {
    return Array.from(this.upgrades);
  }

  /** Number of upgrades collected */
  get count(): number {
    return this.upgrades.size;
  }

  /** Whether a specific upgrade has been collected */
  hasUpgrade(type: UpgradeType): boolean {
    return this.upgrades.has(type);
  }

  /** Register a permanent upgrade */
  addUpgrade(type: UpgradeType): void {
    if (!this._enabled) return;
    this.upgrades.add(type);
  }

  /** Remove an upgrade (for testing or reset) */
  removeUpgrade(type: UpgradeType): void {
    this.upgrades.delete(type);
  }

  /** Clear all upgrades */
  reset(): void {
    this.upgrades.clear();
  }

  /** Enable/disable upgrade collection (for testing) */
  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  /** Get display info for a collected upgrade */
  getDisplayName(type: UpgradeType): string {
    return UPGRADE_DEFS[type]?.displayName ?? type;
  }

  /** Get description for a collected upgrade */
  getDescription(type: UpgradeType): string {
    return UPGRADE_DEFS[type]?.description ?? '';
  }

  /**
   * Compute the combined stat multipliers from all collected upgrades.
   * Returns a flat multipliers object applying product of all upgrade effects.
   */
  getCombinedMultipliers(): UpgradeMultipliers {
    const result: UpgradeMultipliers = {
      sprintSpeed: 1,
      wallRunDuration: 1,
      jumpVelocity: 1,
      slideSpeed: 1,
    };

    for (const upgrade of this.upgrades) {
      const def = UPGRADE_DEFS[upgrade];
      if (!def) continue;
      const mult = def.multiplier;
      if (mult.sprintSpeed !== undefined) result.sprintSpeed *= mult.sprintSpeed;
      if (mult.wallRunDuration !== undefined) result.wallRunDuration *= mult.wallRunDuration;
      if (mult.jumpVelocity !== undefined) result.jumpVelocity *= mult.jumpVelocity;
      if (mult.slideSpeed !== undefined) result.slideSpeed *= mult.slideSpeed;
    }

    return result;
  }

  /**
   * Apply combined multipliers to base tuning values.
   * Returns a plain object with adjusted number values.
   */
  applyToTuning(): Record<string, number> {
    const mults = this.getCombinedMultipliers();
    return {
      ...PLAYER_TUNING,
      sprintSpeed: PLAYER_TUNING.sprintSpeed * mults.sprintSpeed,
      wallRunDuration: PLAYER_TUNING.wallRunDuration * mults.wallRunDuration,
      jumpVelocity: PLAYER_TUNING.jumpVelocity * mults.jumpVelocity,
      slideSpeed: PLAYER_TUNING.slideSpeed * mults.slideSpeed,
    } as Record<string, number>;
  }
}