import { describe, it, expect } from 'vitest';
import { MonsterAnimationController, DogAnimationState } from '../gameplay/monster/MonsterAnimationController';

describe('MonsterAnimationController', () => {
  it('should start in Patrol state', () => {
    const ctrl = new MonsterAnimationController();
    expect(ctrl.state).toBe(DogAnimationState.Patrol);
    expect(ctrl.transitionProgress).toBe(0);
  });

  it('should transition to Chase state', () => {
    const ctrl = new MonsterAnimationController();
    ctrl.transitionTo(DogAnimationState.Chase);
    expect(ctrl.state).toBe(DogAnimationState.Chase);
  });

  it('should return false for isAlerted in Patrol state', () => {
    const ctrl = new MonsterAnimationController();
    expect(ctrl.isAlerted).toBe(false);
  });

  it('should return true for isAlerted in Chase state', () => {
    const ctrl = new MonsterAnimationController();
    ctrl.transitionTo(DogAnimationState.Chase);
    expect(ctrl.isAlerted).toBe(true);
  });

  it('should report idle animation in Patrol state', () => {
    const ctrl = new MonsterAnimationController();
    expect(ctrl.currentAnimation).toBe('idle');
  });

  it('should report running animation in Chase state', () => {
    const ctrl = new MonsterAnimationController();
    ctrl.transitionTo(DogAnimationState.Chase);
    expect(ctrl.currentAnimation).toBe('run');
  });

  it('should report close warning animation when close', () => {
    const ctrl = new MonsterAnimationController();
    ctrl.transitionTo(DogAnimationState.Chase);
    ctrl.setCloseWarning(true);
    expect(ctrl.currentAnimation).toBe('close_warning');
  });

  it('should report caught animation when caught', () => {
    const ctrl = new MonsterAnimationController();
    ctrl.transitionTo(DogAnimationState.Catch);
    expect(ctrl.currentAnimation).toBe('catch');
  });

  it('should use transition duration for progress calculation', () => {
    const ctrl = new MonsterAnimationController({ transitionDuration: 1.0 });
    ctrl.transitionTo(DogAnimationState.Chase);

    // After 0.5s: progress = 0.5
    ctrl.update(0.5);
    expect(ctrl.transitionProgress).toBeCloseTo(0.5, 1);

    // After another 0.5s: progress = 1.0
    ctrl.update(0.5);
    expect(ctrl.transitionProgress).toBeCloseTo(1.0, 1);
  });

  it('should not exceed transition progress of 1', () => {
    const ctrl = new MonsterAnimationController({ transitionDuration: 0.5 });
    ctrl.transitionTo(DogAnimationState.Chase);
    ctrl.update(1.0);
    expect(ctrl.transitionProgress).toBe(1);
  });

  it('should interpolate scale during transition', () => {
    const ctrl = new MonsterAnimationController({ transitionDuration: 1.0 });
    expect(ctrl.currentScale).toBe(1); // patrol scale

    ctrl.transitionTo(DogAnimationState.Chase);
    ctrl.update(0.5); // half transition
    // Scale should be between patrol (1) and chase (1.2)
    expect(ctrl.currentScale).toBeCloseTo(1.1, 2);

    ctrl.update(0.5); // complete
    expect(ctrl.currentScale).toBeCloseTo(1.2, 2);
  });

  it('should reset progress on same state transition', () => {
    const ctrl = new MonsterAnimationController({ transitionDuration: 1.0 });
    ctrl.transitionTo(DogAnimationState.Chase);
    ctrl.update(0.5);
    expect(ctrl.transitionProgress).toBeCloseTo(0.5);

    // Transition again to same state — should reset progress
    ctrl.transitionTo(DogAnimationState.Chase);
    expect(ctrl.transitionProgress).toBe(0);
  });

  it('should support custom scale per state', () => {
    const ctrl = new MonsterAnimationController({
      stateScale: {
        [DogAnimationState.Patrol]: 0.8,
        [DogAnimationState.Chase]: 1.5,
        [DogAnimationState.Catch]: 1.0,
      },
      transitionDuration: 1.0,
    });
    expect(ctrl.currentScale).toBeCloseTo(0.8);

    ctrl.transitionTo(DogAnimationState.Chase);
    ctrl.update(0.5);
    expect(ctrl.currentScale).toBeCloseTo(1.15);
  });

  it('should fire onStateChange callback', () => {
    const states: DogAnimationState[] = [];
    const ctrl = new MonsterAnimationController({
      onStateChange: (s) => { states.push(s); },
    });
    ctrl.transitionTo(DogAnimationState.Chase);
    expect(states).toEqual([DogAnimationState.Chase]);

    ctrl.transitionTo(DogAnimationState.Catch);
    expect(states).toEqual([DogAnimationState.Chase, DogAnimationState.Catch]);
  });

  it('should have configurable animation names per state', () => {
    const ctrl = new MonsterAnimationController({
      animationNames: {
        [DogAnimationState.Patrol]: 'walk',
        [DogAnimationState.Chase]: 'sprint',
        [DogAnimationState.Catch]: 'pounce',
      },
    });
    expect(ctrl.currentAnimation).toBe('walk');
    ctrl.transitionTo(DogAnimationState.Chase);
    expect(ctrl.currentAnimation).toBe('sprint');
    ctrl.transitionTo(DogAnimationState.Catch);
    expect(ctrl.currentAnimation).toBe('pounce');
  });

  it('should default close warning to false', () => {
    const ctrl = new MonsterAnimationController();
    expect(ctrl.closeWarning).toBe(false);
  });

  it('should set and clear close warning', () => {
    const ctrl = new MonsterAnimationController();
    ctrl.setCloseWarning(true);
    expect(ctrl.closeWarning).toBe(true);
    ctrl.setCloseWarning(false);
    expect(ctrl.closeWarning).toBe(false);
  });
});