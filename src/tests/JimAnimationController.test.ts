import { describe, it, expect } from 'vitest';
import { PlayerState } from '../gameplay/player/PlayerMovementState';
import { JimAnimationController, JimAnimState } from '../engine/animation/JimAnimationController';

describe('JimAnimationController', () => {
  it('should start in Idle state', () => {
    const ctrl = new JimAnimationController();
    expect(ctrl.currentAnimation).toBe('idle');
    expect(ctrl.targetAnimState).toBe(JimAnimState.Idle);
  });

  it('should transition from Idle to Run when player state changes', () => {
    const ctrl = new JimAnimationController();
    ctrl.setPlayerState(PlayerState.Run);
    expect(ctrl.targetAnimState).toBe(JimAnimState.Run);
    expect(ctrl.currentAnimation).toBe('run');
  });

  it('should maintain crossfade progress over time', () => {
    const ctrl = new JimAnimationController({ transitionDuration: 1.0 });
    expect(ctrl.crossfadeProgress).toBe(0);

    ctrl.setPlayerState(PlayerState.Run);
    ctrl.update(0.5);
    expect(ctrl.crossfadeProgress).toBeCloseTo(0.5, 1);

    ctrl.update(0.5);
    expect(ctrl.crossfadeProgress).toBeCloseTo(1.0, 1);
  });

  it('should not exceed crossfade progress of 1', () => {
    const ctrl = new JimAnimationController({ transitionDuration: 0.5 });
    ctrl.setPlayerState(PlayerState.Run);
    ctrl.update(1.0);
    expect(ctrl.crossfadeProgress).toBe(1);
  });

  it('should report current and previous animation names', () => {
    const ctrl = new JimAnimationController({ transitionDuration: 1.0 });
    expect(ctrl.previousAnimation).toBe('idle');
    expect(ctrl.currentAnimation).toBe('idle');

    ctrl.setPlayerState(PlayerState.Run);
    // Before update, transition starts with progress 0
    expect(ctrl.previousAnimation).toBe('idle');
    expect(ctrl.currentAnimation).toBe('run');
  });

  it('should report isTransitioning correctly', () => {
    const ctrl = new JimAnimationController({ transitionDuration: 1.0 });
    expect(ctrl.isTransitioning).toBe(false); // no transition initiated yet

    ctrl.setPlayerState(PlayerState.Run);
    expect(ctrl.isTransitioning).toBe(true);

    ctrl.update(1.0);
    expect(ctrl.isTransitioning).toBe(false);
  });

  it('should report blend weight correctly', () => {
    const ctrl = new JimAnimationController({ transitionDuration: 1.0 });
    expect(ctrl.blendWeight).toBe(1); // no transition = fully on target

    ctrl.setPlayerState(PlayerState.Jump);
    expect(ctrl.blendWeight).toBe(0); // just started transition

    ctrl.update(0.5);
    expect(ctrl.blendWeight).toBeCloseTo(0.5, 1);

    ctrl.update(0.5);
    expect(ctrl.blendWeight).toBe(1);
  });

  it('should support custom animation names per state', () => {
    const ctrl = new JimAnimationController({
      animationNames: {
        [JimAnimState.Run]: 'sprint_start',
        [JimAnimState.Jump]: 'leap',
      },
    });
    expect(ctrl.currentAnimation).toBe('idle');

    ctrl.setPlayerState(PlayerState.Run);
    expect(ctrl.currentAnimation).toBe('sprint_start');

    ctrl.setPlayerState(PlayerState.Jump);
    expect(ctrl.currentAnimation).toBe('leap');
  });

  it('should map all PlayerStates to correct JimAnimStates', () => {
    const ctrl = new JimAnimationController();

    const testCases: Array<{ player: PlayerState; expected: JimAnimState; anim: string }> = [
      { player: PlayerState.Idle, expected: JimAnimState.Idle, anim: 'idle' },
      { player: PlayerState.Run, expected: JimAnimState.Run, anim: 'run' },
      { player: PlayerState.Sprint, expected: JimAnimState.Sprint, anim: 'sprint' },
      { player: PlayerState.Jump, expected: JimAnimState.Jump, anim: 'jump' },
      { player: PlayerState.Fall, expected: JimAnimState.Fall, anim: 'fall' },
      { player: PlayerState.Slide, expected: JimAnimState.Slide, anim: 'slide' },
      { player: PlayerState.WallRun, expected: JimAnimState.WallRun, anim: 'wall_run' },
    ];

    for (const tc of testCases) {
      ctrl.setPlayerState(tc.player);
      expect(ctrl.targetAnimState).toBe(tc.expected);
      expect(ctrl.currentAnimation).toBe(tc.anim);
    }
  });

  it('should reset to a specific state immediately', () => {
    const ctrl = new JimAnimationController();
    ctrl.setPlayerState(PlayerState.Sprint);
    expect(ctrl.isTransitioning).toBe(true);

    ctrl.reset(JimAnimState.Idle);
    expect(ctrl.targetAnimState).toBe(JimAnimState.Idle);
    expect(ctrl.currentAnimState).toBe(JimAnimState.Idle);
    expect(ctrl.crossfadeProgress).toBe(1);
    expect(ctrl.isTransitioning).toBe(false);
    expect(ctrl.currentAnimation).toBe('idle');
  });

  it('should reset to Idle when no state is specified', () => {
    const ctrl = new JimAnimationController();
    ctrl.setPlayerState(PlayerState.Sprint);
    ctrl.reset();
    expect(ctrl.targetAnimState).toBe(JimAnimState.Idle);
    expect(ctrl.currentAnimation).toBe('idle');
  });

  it('should restart crossfade when player state changes mid-transition', () => {
    const ctrl = new JimAnimationController({ transitionDuration: 1.0 });
    ctrl.setPlayerState(PlayerState.Run);
    ctrl.update(0.5);
    expect(ctrl.crossfadeProgress).toBeCloseTo(0.5);

    // Change state mid-transition
    ctrl.setPlayerState(PlayerState.Jump);
    // The previous target becomes the new "from" state
    expect(ctrl.currentAnimState).toBe(JimAnimState.Run);
    expect(ctrl.targetAnimState).toBe(JimAnimState.Jump);
    expect(ctrl.crossfadeProgress).toBe(0);
  });
});
