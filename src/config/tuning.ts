export const PLAYER_TUNING = {
  walkSpeed: 4.0,
  runSpeed: 6.5,
  sprintSpeed: 9.0,
  jumpVelocity: 7.5,
  gravity: -18.0,
  airControl: 0.45,
  groundAcceleration: 40,
  airAcceleration: 16,
  slideSpeed: 11,
  slideDuration: 0.75,
  wallRunDuration: 1.1,
  wallRunCooldown: 0.5,
  wallRunGravityScale: 0.25,
  wallRunMinSpeed: 6.0,
  stumbleDuration: 0.65,
  /** Grace period after walking off a ledge where jump still works */
  coyoteTime: 0.12,
  /** How early a jump press is remembered before landing */
  jumpBufferTime: 0.15,
  /** Extra gravity while rising with jump released — tap = short hop, hold = full jump */
  lowJumpGravityMultiplier: 1.7,
} as const;

export const DOG_TUNING = {
  startGap: 30,
  warningGap: 15,
  dangerGap: 8,
  catchGap: 3.2,
  slipGapBonus: 8,
  smokeBombGapBonus: 12,
  roarCooldownMin: 8,
  roarCooldownMax: 18,
} as const;

export function getDogSpeedForLevel(levelNumber: number): number {
  const base = 6.0;
  const perLevel = 0.35;
  const max = 12.5;
  return Math.min(base + (levelNumber - 1) * perLevel, max);
}

export function getDifficultyForLevel(level: number) {
  return {
    dogSpeedMultiplier: 1 + (level - 1) * 0.055,
    obstacleDensity: Math.min(0.2 + (level - 1) * 0.05, 0.9),
    hazardFrequency: Math.min(0.1 + (level - 1) * 0.04, 0.7),
    visibility: Math.max(1.0 - (level - 1) * 0.025, 0.65),
    dogStartGap: Math.max(34 - (level - 1) * 1.2, 18),
  };
}