/**
 * MonsterDistanceModel — gap calculation and alert thresholds
 * between the dog and the player along the route path.
 *
 * Gap = distance on path between dog's progress and player's progress.
 * Positive gap = dog is behind the player.
 */
export interface AlertState {
  /** Dog is within the close-warning distance */
  close: boolean;
  /** Dog is close enough to catch the player */
  caught: boolean;
  /** Raw distance on path between dog and player */
  gap: number;
}

export class MonsterDistanceModel {
  /** Threshold for the "dog close" warning UI (units along route) */
  closeThreshold: number;
  /** Threshold for catch (units along route) */
  catchThreshold: number;

  constructor(closeThreshold: number = 8, catchThreshold: number = 1.5) {
    this.closeThreshold = closeThreshold;
    this.catchThreshold = catchThreshold;
  }

  /**
   * Compute the alert state given the dog's and player's progress
   * along the route and the route's total length.
   *
   * @param dogProgress  Dog progress along route (0..1)
   * @param playerProgress  Player progress along route (0..1)
   * @param routeTotalLength  Total length of the route path in world units
   */
  evaluate(
    dogProgress: number,
    playerProgress: number,
    routeTotalLength: number,
  ): AlertState {
    const gap = (playerProgress - dogProgress) * routeTotalLength;
    const absGap = Math.abs(gap);

    return {
      gap,
      close: absGap <= this.closeThreshold,
      caught: absGap <= this.catchThreshold,
    };
  }
}
