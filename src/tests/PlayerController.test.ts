import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../engine/physics/PhysicsWorld';
import { CharacterKCC } from '../engine/physics/CharacterKCC';
import { InputManager } from '../engine/input/InputManager';
import { PlayerController } from '../gameplay/player/PlayerController';
import { SlideController } from '../gameplay/player/SlideController';
import { WallRunController } from '../gameplay/player/WallRunController';
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
    expect(pos.x).toBeCloseTo(0, 1);
    expect(pos.z).toBeCloseTo(0, 1);
  });

  it('should move forward with MoveForward input', () => {
    const { kcc, input, controller } = createController();
    kcc.setPosition({ x: 0, y: 3, z: 0 });
    physics.step(1 / 60);

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
    expect(pos.z).toBeLessThan(-1);
  });

  it('should report sprinting when sprint is held', () => {
    const { kcc, input, controller } = createController();
    kcc.setPosition({ x: 0, y: 3, z: 0 });
    physics.step(1 / 60);

    for (let i = 0; i < 120; i++) {
      controller.update(1 / 60, input, 0);
      physics.step(1 / 60);
    }

    expect(controller.isSprinting()).toBe(false);

    input.setAction(ControlAction.Sprint, true);
    controller.update(1 / 60, input, 0);
    physics.step(1 / 60);
    expect(controller.isSprinting()).toBe(true);
  });

  it('should jump when Jump is pressed', () => {
    const { kcc, input, controller } = createController();
    kcc.setPosition({ x: 0, y: 3, z: 0 });
    physics.step(1 / 60);

    for (let i = 0; i < 120; i++) {
      controller.update(1 / 60, input, 0);
      physics.step(1 / 60);
    }

    const groundPos = kcc.getPosition().y;

    input.setAction(ControlAction.Jump, true);
    controller.update(1 / 60, input, 0);
    input.update();
    const emptyInput = new InputManager();
    for (let i = 0; i < 15; i++) {
      controller.update(1 / 60, emptyInput, 0);
      physics.step(1 / 60);
      input.update();
    }

    const peakPos = kcc.getPosition().y;
    expect(peakPos).toBeGreaterThan(groundPos + 0.1);
  });
});

describe('PlayerController — Slide and Wall-run integration', () => {
  let physics: PhysicsWorld;

  beforeAll(async () => {
    physics = new PhysicsWorld();
    await physics.init();
    physics.addStaticGroundCollider(200, -0.5);
    physics.step(1 / 60);
  });

  function createFullController(): { kcc: CharacterKCC; input: InputManager; controller: PlayerController; slide: SlideController; wallRun: WallRunController } {
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    const input = new InputManager();
    const slide = new SlideController();
    const wallRun = new WallRunController();
    const controller = new PlayerController(kcc, physics, slide, wallRun);
    return { kcc, input, controller, slide, wallRun };
  }

  function settleOnGround(kcc: CharacterKCC, input: InputManager, controller: PlayerController): void {
    kcc.setPosition({ x: 0, y: 3, z: 0 });
    for (let i = 0; i < 180; i++) {
      controller.update(1 / 60, input, 0);
      physics.step(1 / 60);
    }
  }

  describe('Slide integration', () => {
    let kcc: CharacterKCC;
    let input: InputManager;
    let controller: PlayerController;
    let slide: SlideController;

    afterEach(() => {
      kcc.dispose();
    });

    it('should activate slide when Slide pressed while grounded and moving', () => {
      ({ kcc, input, controller, slide } = createFullController());
      settleOnGround(kcc, input, controller);

      input.setAction(ControlAction.MoveForward, true);
      input.setAction(ControlAction.Sprint, true);

      for (let i = 0; i < 30; i++) {
        controller.update(1 / 60, input, 0);
        physics.step(1 / 60);
      }

      expect(slide.isSliding()).toBe(false);

      input.setAction(ControlAction.Slide, true);
      controller.update(1 / 60, input, 0);
      physics.step(1 / 60);

      expect(slide.isSliding()).toBe(true);
    });

    it('should not activate slide while airborne', () => {
      ({ kcc, input, controller, slide } = createFullController());
      settleOnGround(kcc, input, controller);

      input.setAction(ControlAction.Jump, true);
      controller.update(1 / 60, input, 0);
      input.update();

      input.setAction(ControlAction.Slide, true);
      controller.update(1 / 60, input, 0);
      input.update();

      expect(slide.isSliding()).toBe(false);
    });

    it('should deactivate slide after duration', () => {
      ({ kcc, input, controller, slide } = createFullController());
      settleOnGround(kcc, input, controller);

      input.setAction(ControlAction.MoveForward, true);
      input.setAction(ControlAction.Sprint, true);

      for (let i = 0; i < 30; i++) {
        controller.update(1 / 60, input, 0);
        physics.step(1 / 60);
      }

      input.setAction(ControlAction.Slide, true);
      controller.update(1 / 60, input, 0);
      input.update();
      expect(slide.isSliding()).toBe(true);

      for (let i = 0; i < 60; i++) {
        controller.update(1 / 60, input, 0);
        physics.step(1 / 60);
      }

      expect(slide.isSliding()).toBe(false);
    });
  });

  describe('Wall-run integration', () => {
    let kcc: CharacterKCC;
    let controller: PlayerController;
    let wallRun: WallRunController;

    function buildWall(): RAPIER.RigidBody {
      const wallBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(2, 1, 0);
      const wallBody = physics.addRigidBody(wallBodyDesc);
      const wallColliderDesc = RAPIER.ColliderDesc.cuboid(0.25, 2, 5);
      physics.addCollider(wallColliderDesc, wallBody);
      physics.step(1 / 60);
      return wallBody;
    }

    afterEach(() => {
      kcc?.dispose();
    });

    it('should activate wall-run when airborne near a wall', () => {
      ({ kcc, controller, wallRun } = createFullController());
      const wallBody = buildWall();

      kcc.setPosition({ x: 0.5, y: 2.0, z: 0 });
      physics.step(1 / 60);

      for (let i = 0; i < 10; i++) {
        controller.update(1 / 60, new InputManager(), 0);
        physics.step(1 / 60);
      }

      expect(wallRun.isWallRunning()).toBe(true);

      physics.removeRigidBody(wallBody);
    });

    it('should wall jump away from wall when Jump pressed during wall-run', () => {
      ({ kcc, controller, wallRun } = createFullController());
      const wallBody = buildWall();

      kcc.setPosition({ x: 0.5, y: 2.0, z: 0 });
      physics.step(1 / 60);

      for (let i = 0; i < 10; i++) {
        controller.update(1 / 60, new InputManager(), 0);
        physics.step(1 / 60);
      }

      expect(wallRun.isWallRunning()).toBe(true);

      const input = new InputManager();
      input.setAction(ControlAction.Jump, true);
      controller.update(1 / 60, input, 0);
      input.update();

      expect(wallRun.isWallRunning()).toBe(false);
      expect(wallRun.isOnCooldown()).toBe(true);

      physics.removeRigidBody(wallBody);
    });
  });
});