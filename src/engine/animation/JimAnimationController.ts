import type { PlayerState } from '../../gameplay/player/PlayerMovementState';

/** Animation states for Jim (the player character) */
export const JimAnimState = {
  Idle: 'Idle',
  Run: 'Run',
  Sprint: 'Sprint',
  Jump: 'Jump',
  Fall: 'Fall',
  Slide: 'Slide',
  WallRun: 'WallRun',
} as const;
export type JimAnimState = (typeof JimAnimState)[keyof typeof JimAnimState];

/** Maps PlayerState → JimAnimState (1:1 mapping for now) */
const PLAYER_TO_ANIM: Record<string, JimAnimState> = {
  Idle: JimAnimState.Idle,
  Run: JimAnimState.Run,
  Sprint: JimAnimState.Sprint,
  Jump: JimAnimState.Jump,
  Fall: JimAnimState.Fall,
  Slide: JimAnimState.Slide,
  WallRun: JimAnimState.WallRun,
};

const DEFAULT_ANIM_NAMES: Record<JimAnimState, string> = {
  [JimAnimState.Idle]: 'idle',
  [JimAnimState.Run]: 'run',
  [JimAnimState.Sprint]: 'sprint',
  [JimAnimState.Jump]: 'jump',
  [JimAnimState.Fall]: 'fall',
  [JimAnimState.Slide]: 'slide',
  [JimAnimState.WallRun]: 'wall_run',
};

export interface JimAnimationControllerOptions {
  /** Duration of smooth crossfade between states (seconds) */
  transitionDuration?: number;
  /** Custom animation name overrides per state */
  animationNames?: Partial<Record<JimAnimState, string>>;
}

/**
 * JimAnimationController — maps the player's movement state to animation
 * names with smooth crossfade transitions. Pure logic, no Three.js dependency.
 */
export class JimAnimationController {
  private _currentAnimState: JimAnimState = JimAnimState.Idle;
  private _transitionProgress = 0;
  private _transitionDuration: number;
  private _animationNames: Record<JimAnimState, string>;
  private _targetAnimState: JimAnimState = JimAnimState.Idle;

  constructor(options?: JimAnimationControllerOptions) {
    this._transitionDuration = options?.transitionDuration ?? 0.2;
    this._animationNames = { ...DEFAULT_ANIM_NAMES, ...options?.animationNames };
  }

  /**
   * Update from a PlayerMovementState player state.
   * Call once per frame with the player's current state.
   */
  setPlayerState(state: PlayerState): void {
    const animState = PLAYER_TO_ANIM[state] ?? JimAnimState.Idle;
    if (animState !== this._targetAnimState) {
      // Snap current animation immediately when transitioning
      this._currentAnimState = this._targetAnimState;
      this._transitionProgress = 0;
      this._targetAnimState = animState;
    }
  }

  /** Advance the transition timer by delta seconds */
  update(dt: number): void {
    if (this._transitionProgress < 1) {
      this._transitionProgress = Math.min(
        1,
        this._transitionProgress + dt / this._transitionDuration,
      );
    }
  }

  /** Progress of current crossfade (0–1) */
  get crossfadeProgress(): number {
    return this._transitionProgress;
  }

  /** Current animation state (the state being faded from) */
  get currentAnimState(): JimAnimState {
    return this._currentAnimState;
  }

  /** Target animation state (the state being faded to) */
  get targetAnimState(): JimAnimState {
    return this._targetAnimState;
  }

  /** Name of the animation to play for the current state */
  get currentAnimation(): string {
    return this._animationNames[this._targetAnimState];
  }

  /** Name of the animation we are crossfading from (or same as currentAnimation if no transition) */
  get previousAnimation(): string {
    return this._animationNames[this._currentAnimState];
  }

  /** Whether a crossfade transition is in progress */
  get isTransitioning(): boolean {
    return this._currentAnimState !== this._targetAnimState && this._transitionProgress < 1;
  }

  /** Blend weight for the current animation (1 = fully on target, 0 = fully on previous) */
  get blendWeight(): number {
    if (this._currentAnimState === this._targetAnimState) return 1;
    return this._transitionProgress;
  }

  /** Reset to a specific state immediately (no transition) */
  reset(state?: JimAnimState): void {
    const s = state ?? JimAnimState.Idle;
    this._currentAnimState = s;
    this._targetAnimState = s;
    this._transitionProgress = 1;
  }
}
