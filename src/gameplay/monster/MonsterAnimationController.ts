/** Animation states for the monster dog */
export const DogAnimationState = {
  Patrol: 'Patrol',
  Chase: 'Chase',
  Catch: 'Catch',
} as const;
export type DogAnimationState = (typeof DogAnimationState)[keyof typeof DogAnimationState];

export interface MonsterAnimationControllerOptions {
  /** Duration of smooth transitions between states (seconds) */
  transitionDuration?: number;
  /** Scale factor per state (for visual emphasis) */
  stateScale?: Partial<Record<DogAnimationState, number>>;
  /** Animation name per state */
  animationNames?: Partial<Record<DogAnimationState, string>>;
  /** Callback fired when animation state changes */
  onStateChange?: (state: DogAnimationState) => void;
}

const DEFAULT_STATE_SCALE: Record<DogAnimationState, number> = {
  [DogAnimationState.Patrol]: 1.0,
  [DogAnimationState.Chase]: 1.2,
  [DogAnimationState.Catch]: 1.0,
};

const DEFAULT_ANIM_NAMES: Record<DogAnimationState, string> = {
  [DogAnimationState.Patrol]: 'idle',
  [DogAnimationState.Chase]: 'run',
  [DogAnimationState.Catch]: 'catch',
};

/**
 * MonsterAnimationController — manages the visual animation state of the
 * monster dog, including smooth transitions between patrol/chase/catch
 * states with configurable scale interpolation and animation names.
 *
 * Pure logic (no Three.js dependency), fully testable in Node.
 */
export class MonsterAnimationController {
  private _state: DogAnimationState = DogAnimationState.Patrol;
  private _closeWarning = false;
  private _transitionProgress: number;
  private _transitionDuration: number;
  private _stateScale: Record<DogAnimationState, number>;
  private _animationNames: Record<DogAnimationState, string>;
  private _onStateChange: ((state: DogAnimationState) => void) | undefined;

  constructor(options?: MonsterAnimationControllerOptions) {
    this._transitionDuration = options?.transitionDuration ?? 0.3;
    this._transitionProgress = 0;
    this._stateScale = { ...DEFAULT_STATE_SCALE, ...options?.stateScale };
    this._animationNames = { ...DEFAULT_ANIM_NAMES, ...options?.animationNames };
    this._onStateChange = options?.onStateChange;
  }

  /** Transition to a new animation state (resets progress) */
  transitionTo(state: DogAnimationState): void {
    this._state = state;
    this._transitionProgress = 0;
    this._onStateChange?.(this._state);
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

  /** Set whether the close warning is active */
  setCloseWarning(active: boolean): void {
    this._closeWarning = active;
  }

  // ─── Accessors ─────────────────────────────────────

  /** Current animation state */
  get state(): DogAnimationState {
    return this._state;
  }

  /** Progress of the current transition (0–1) */
  get transitionProgress(): number {
    return this._transitionProgress;
  }

  /** Whether the dog is in an alerted state (chase or catch) */
  get isAlerted(): boolean {
    return this._state !== DogAnimationState.Patrol;
  }

  /** Name of the current animation */
  get currentAnimation(): string {
    if (this._state === DogAnimationState.Chase && this._closeWarning) {
      return 'close_warning';
    }
    return this._animationNames[this._state];
  }

  /** Interpolated scale for the current state transition */
  get currentScale(): number {
    const fromScale = this._stateScale[DogAnimationState.Patrol];
    const toScale = this._stateScale[this._state];
    return fromScale + (toScale - fromScale) * this._transitionProgress;
  }

  /** Whether the close warning is active */
  get closeWarning(): boolean {
    return this._closeWarning;
  }
}