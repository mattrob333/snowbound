import { describe, it, expect, beforeAll } from 'vitest';
import { PhysicsWorld } from '../engine/physics/PhysicsWorld';
import { CharacterKCC } from '../engine/physics/CharacterKCC';
import { InputManager } from '../engine/input/InputManager';
import { PlayerController } from '../gameplay/player/PlayerController';
import { ControlAction } from '../config/controls';
import { PLAYER_HEIGHT, PLAYER_RADIUS } from '../config/constants';

describe('PlayerController', () => {
  let physics: PhysicsWorld;

  beforeAll(async () => {
    physics = new PhysicsWorld();
    await physics.init();
    physics.addStaticGroundCollider(200, -0.5);
    physics.step(1 / 60);
  });

  function createController(): { kcc: CharacterKCC; input: InputManager; controller: PlayerController } {
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    const input = new InputManager();
    const controller = new PlayerController(kcc);
    return { kcc, input, controller };
  }

  it('should stand still with no input', () => {
    const { kcc, controller } = createController();
    kcc.setPosition({ x: 0, y: 3, z: 0 });
    physics.step(1 / 60);

    for (let i = 0; i < 60; i++) {
      controller.update(1 / 60, new InputManager(), 0);
      physics.step(1 / 60);
    }

    const pos = kcc.getPosition();
    // Should be grounded near x=0,z=0 (gravity pulled down)
    expect(pos.x).toBeCloseTo(0, 1);
    expect(pos.z).toBeCloseTo(0, 1);
  });

  it('should move forward with MoveForward input', () => {
    const { kcc, input, controller } = createController();
    kcc.setPosition({ x: 0, y: 3, z: 0 });
    physics.step(1 / 60);

    // Let it land first
    for (let i = 0; i < 120; i++) {
      controller.update(1 / 60, input, 0);
      physics.step(1 / 60);
    }

    input.setAction(ControlAction.MoveForward, true);

    for (let i = 0; i < 60; i++) {
      controller.update(1 / 60, input, 0);
      physics.step(1 / 60);
    }

    const pos = kcc.getPosition();
    // Should have moved forward (negative Z in world with cameraAzimuth=0)
    expect(pos.z).toBeLessThan(-1);
  });

  it('should report sprinting when sprint is held', () => {
    const { kcc, input, controller } = createController();
    kcc.setPosition({ x: 0, y: 3, z: 0 });
    physics.step(1 / 60);

    // Let it land
    for (let i = 0; i < 120; i++) {
      controller.update(1 / 60, input, 0);
      physics.step(1 / 60);
    }

    expect(controller.isSprinting()).toBe(false);

    // Hold sprint
    input.setAction(ControlAction.Sprint, true);
    controller.update(1 / 60, input, 0);
    physics.step(1 / 60);
    expect(controller.isSprinting()).toBe(true);
  });

  it('should jump when Jump is pressed', () => {
    const { kcc, input, controller } = createController();
    kcc.setPosition({ x: 0, y: 3, z: 0 });
    physics.step(1 / 60);

    // Let it land
    for (let i = 0; i < 120; i++) {
      controller.update(1 / 60, input, 0);
      physics.step(1 / 60);
    }

    const groundPos = kcc.getPosition().y;

    // Jump
    input.setAction(ControlAction.Jump, true);
    controller.update(1 / 60, input, 0);
    // Jump pressed — setAction for pressed only works for one frame
    input.update();
    // Feed continuous gravity
    const emptyInput = new InputManager();
    for (let i = 0; i < 15; i++) {
      controller.update(1 / 60, emptyInput, 0);
      physics.step(1 / 60);
      input.update();
    }

    const peakPos = kcc.getPosition().y;
    // Should have gone up from ground position
    expect(peakPos).toBeGreaterThan(groundPos + 0.1);
  });
});
