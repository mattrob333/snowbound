import { describe, it, expect } from 'vitest';
import { PlayerState, PlayerMovementState } from '../gameplay/player/PlayerMovementState';

describe('PlayerMovementState', () => {
  it('should start in Idle state', () => {
    const sm = new PlayerMovementState();
    expect(sm.getState()).toBe(PlayerState.Idle);
  });

  it('should transition from Idle to Run', () => {
    const sm = new PlayerMovementState();
    sm.transitionTo(PlayerState.Run);
    expect(sm.getState()).toBe(PlayerState.Run);
  });

  it('should transition from Run to Sprint', () => {
    const sm = new PlayerMovementState();
    sm.transitionTo(PlayerState.Run);
    sm.transitionTo(PlayerState.Sprint);
    expect(sm.getState()).toBe(PlayerState.Sprint);
  });

  it('should transition from Run to Jump', () => {
    const sm = new PlayerMovementState();
    sm.transitionTo(PlayerState.Run);
    sm.transitionTo(PlayerState.Jump);
    expect(sm.getState()).toBe(PlayerState.Jump);
  });

  it('should transition from Jump to Fall', () => {
    const sm = new PlayerMovementState();
    sm.transitionTo(PlayerState.Jump);
    sm.transitionTo(PlayerState.Fall);
    expect(sm.getState()).toBe(PlayerState.Fall);
  });

  it('should transition from Fall to Run', () => {
    const sm = new PlayerMovementState();
    sm.transitionTo(PlayerState.Fall);
    sm.transitionTo(PlayerState.Run);
    expect(sm.getState()).toBe(PlayerState.Run);
  });

  it('should transition from Run to Slide', () => {
    const sm = new PlayerMovementState();
    sm.transitionTo(PlayerState.Run);
    sm.transitionTo(PlayerState.Slide);
    expect(sm.getState()).toBe(PlayerState.Slide);
  });

  it('should transition from Run to WallRun', () => {
    const sm = new PlayerMovementState();
    sm.transitionTo(PlayerState.Run);
    sm.transitionTo(PlayerState.WallRun);
    expect(sm.getState()).toBe(PlayerState.WallRun);
  });

  it('should transition from Jump to WallRun', () => {
    const sm = new PlayerMovementState();
    sm.transitionTo(PlayerState.Jump);
    sm.transitionTo(PlayerState.WallRun);
    expect(sm.getState()).toBe(PlayerState.WallRun);
  });

  it('should transition from Slide back to Run after duration', () => {
    const sm = new PlayerMovementState();
    sm.transitionTo(PlayerState.Slide);
    expect(sm.getState()).toBe(PlayerState.Slide);

    // After slide duration expires, transition back to Run when grounded
    sm.update(0.75, true, false);
    expect(sm.getState()).toBe(PlayerState.Slide);

    sm.update(0.01, true, false);
    expect(sm.getState()).toBe(PlayerState.Run);
  });
});