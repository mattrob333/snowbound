export const PlayerState = {
  Idle: 'Idle',
  Run: 'Run',
  Sprint: 'Sprint',
  Jump: 'Jump',
  Fall: 'Fall',
  Slide: 'Slide',
  WallRun: 'WallRun',
} as const;

export type PlayerState = (typeof PlayerState)[keyof typeof PlayerState];

type StateEntryPredicate = () => void;
type StateUpdateCallback = (dt: number) => void;

export class PlayerMovementState {
  private state: PlayerState = PlayerState.Idle;
  private slideTimer = 0;
  private onEnterCallbacks = new Map<PlayerState, StateEntryPredicate>();
  private onUpdateCallbacks = new Map<PlayerState, StateUpdateCallback>();

  getState(): PlayerState {
    return this.state;
  }

  canTransitionTo(_target: PlayerState): boolean {
    // All states can transition to any other state for now
    return true;
  }

  transitionTo(target: PlayerState): void {
    if (this.canTransitionTo(target)) {
      this.state = target;
      if (target === PlayerState.Slide) {
        this.slideTimer = 0;
      }
      const cb = this.onEnterCallbacks.get(target);
      cb?.();
    }
  }

  onEnter(state: PlayerState, cb: StateEntryPredicate): void {
    this.onEnterCallbacks.set(state, cb);
  }

  onUpdate(_state: PlayerState, _cb: StateUpdateCallback): void {
    this.onUpdateCallbacks.set(_state, _cb);
  }

  update(dt: number, isGrounded: boolean, _wantsSlide: boolean): void {
    if (this.state === PlayerState.Slide) {
      this.slideTimer += dt;
      // Auto exit slide after duration
      if (this.slideTimer > 0.75) {
        this.state = isGrounded ? PlayerState.Run : PlayerState.Fall;
        this.slideTimer = 0;
      }
    }

    if (this.state === PlayerState.Jump && !isGrounded) {
      // stays in jump until apex
    }

    const cb = this.onUpdateCallbacks.get(this.state);
    cb?.(dt);
  }
}