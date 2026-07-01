import type { GameContext } from '../../app/GameContext';
import type { IGameEntity } from '../entities/EntityManager';

export type HazardType = 'falling_ice' | 'avalanche' | 'cracked_ice' | 'cliff_death' | 'sliding_ice';

/**
 * Hazard — base class for all environmental hazards.
 *
 * Hazards are entities added to the EntityManager. Each hazard has:
 * - A world position (from the level JSON's HazardSpawn)
 * - A trigger radius for player detection
 * - Lifecycle hooks: onTrigger(), update(), dispose()
 *
 * NOTE: LevelLoader already creates static visual meshes + physics bodies for
 * hazards. Hazard entities here provide interactive behavior only.
 * Do NOT create additional visualization meshes in this base class.
 */
export abstract class Hazard implements IGameEntity {
  readonly hazardType: HazardType;
  readonly position: { x: number; y: number; z: number };
  readonly halfExtents: { x: number; y: number; z: number };
  readonly triggerRadius: number;

  /** Whether this hazard has been activated */
  activated = false;
  /** Whether this hazard is spent (no longer active) */
  spent = false;

  /** Called when the player enters the trigger zone */
  onActivate: (() => void) | null = null;
  /** Called when a major hazard hits the player (e.g. falling ice) — triggers game over */
  onMajorHazard: (() => void) | null = null;

  constructor(
    hazardType: HazardType,
    position: { x: number; y: number; z: number },
    halfExtents: { x: number; y: number; z: number },
    triggerRadius: number = 2,
  ) {
    this.hazardType = hazardType;
    this.position = position;
    this.halfExtents = halfExtents;
    this.triggerRadius = triggerRadius;
  }

  /** Check if the player is within the trigger radius (XZ only) */
  protected isPlayerInRange(ctx: GameContext): boolean {
    if (this.spent) return false;
    const playerPos = ctx.player.kcc.getPosition();
    const dx = playerPos.x - this.position.x;
    const dz = playerPos.z - this.position.z;
    const distSq = dx * dx + dz * dz;
    return distSq <= this.triggerRadius * this.triggerRadius;
  }

  /**
   * Template method: check range, activate if not yet activated,
   * then run the subclass's behavior.
   */
  update(_dt: number, ctx: GameContext): void {
    if (this.spent) return;

    if (!this.activated && this.isPlayerInRange(ctx)) {
      this.activated = true;
      this.onActivate?.();
      this.onPlayerEnter(ctx);
    } else if (this.activated && !this.spent) {
      this.onActiveUpdate(_dt, ctx);
    }
  }

  /** Subclass hook: called once when the player first enters the trigger zone */
  protected abstract onPlayerEnter(ctx: GameContext): void;

  /** Subclass hook: called each frame while the hazard is active (between activate and spent) */
  protected abstract onActiveUpdate(_dt: number, ctx: GameContext): void;

  abstract dispose(): void;
}