import { describe, it, expect, beforeEach } from 'vitest';
import { InputManager } from '../engine/input/InputManager';
import { ControlAction } from '../config/controls';

describe('InputManager', () => {
  let input: InputManager;

  beforeEach(() => {
    input = new InputManager();
  });

  it('should start with all actions released', () => {
    expect(input.isKeyDown(ControlAction.MoveForward)).toBe(false);
    expect(input.isKeyDown(ControlAction.MoveBackward)).toBe(false);
    expect(input.isKeyDown(ControlAction.StrafeLeft)).toBe(false);
    expect(input.isKeyDown(ControlAction.StrafeRight)).toBe(false);
    expect(input.isKeyDown(ControlAction.Sprint)).toBe(false);
    expect(input.isKeyDown(ControlAction.Jump)).toBe(false);
    expect(input.isKeyDown(ControlAction.Slide)).toBe(false);
  });

  it('should report a pressed action on the frame it is set', () => {
    input.setAction(ControlAction.Jump, true);
    expect(input.isKeyPressed(ControlAction.Jump)).toBe(true);
  });

  it('should report a held action as down but not pressed after update', () => {
    input.setAction(ControlAction.Sprint, true);
    expect(input.isKeyDown(ControlAction.Sprint)).toBe(true);
    expect(input.isKeyPressed(ControlAction.Sprint)).toBe(true);

    input.update();
    // Still down, but no longer "pressed this frame"
    expect(input.isKeyDown(ControlAction.Sprint)).toBe(true);
    expect(input.isKeyPressed(ControlAction.Sprint)).toBe(false);
  });

  it('should report released action as not down', () => {
    input.setAction(ControlAction.MoveForward, true);
    expect(input.isKeyDown(ControlAction.MoveForward)).toBe(true);
    input.setAction(ControlAction.MoveForward, false);
    expect(input.isKeyDown(ControlAction.MoveForward)).toBe(false);
  });

  it('should allow multiple simultaneous actions', () => {
    input.setAction(ControlAction.MoveForward, true);
    input.setAction(ControlAction.StrafeRight, true);
    input.setAction(ControlAction.Sprint, true);

    expect(input.isKeyDown(ControlAction.MoveForward)).toBe(true);
    expect(input.isKeyDown(ControlAction.StrafeRight)).toBe(true);
    expect(input.isKeyDown(ControlAction.Sprint)).toBe(true);
    expect(input.isKeyDown(ControlAction.Jump)).toBe(false);
  });
});
