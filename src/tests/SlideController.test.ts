import { describe, it, expect, beforeAll } from 'vitest';
import { PhysicsWorld } from '../engine/physics/PhysicsWorld';
import { CharacterKCC } from '../engine/physics/CharacterKCC';
import { SlideController } from '../gameplay/player/SlideController';
import { PLAYER_HEIGHT, PLAYER_RADIUS } from '../config/constants';
import { PLAYER_TUNING } from '../config/tuning';

describe('SlideController', () => {
  let physics: PhysicsWorld;

  beforeAll(async () => {
    physics = new PhysicsWorld();
    await physics.init();
    physics.addStaticGroundCollider(200, -0.5);
    physics.step(1 / 60);
  });

  it('should start inactive', () => {
    const slide = new SlideController();
    expect(slide.isSliding()).toBe(false);
  });

  it('should activate on slide input while grounded', () => {
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    kcc.setPosition({ x: 0, y: 3, z: 0 });

    // Fall to ground
    for (let i = 0; i < 120; i++) {
      const gravity = { x: 0, y: PLAYER_TUNING.gravity * (1 / 60), z: 0 };
      kcc.computeMovement(gravity, 1 / 60);
      kcc.applyMovement();
      physics.step(1 / 60);
    }

    expect(kcc.isGrounded()).toBe(true);

    const slide = new SlideController();
    slide.start(kcc);
    expect(slide.isSliding()).toBe(true);

    kcc.dispose();
  });

  it('should deactivate after slide duration', () => {
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    kcc.setPosition({ x: 0, y: 3, z: 0 });

    for (let i = 0; i < 120; i++) {
      const gravity = { x: 0, y: PLAYER_TUNING.gravity * (1 / 60), z: 0 };
      kcc.computeMovement(gravity, 1 / 60);
      kcc.applyMovement();
      physics.step(1 / 60);
    }

    const slide = new SlideController();
    slide.start(kcc);
    expect(slide.isSliding()).toBe(true);

    slide.update(PLAYER_TUNING.slideDuration, kcc, false);
    expect(slide.isSliding()).toBe(true);

    slide.update(0.01, kcc, false);
    expect(slide.isSliding()).toBe(false);

    kcc.dispose();
  });

  it('should not activate while airborne', () => {
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    kcc.setPosition({ x: 0, y: 5, z: 0 });
    physics.step(1 / 60);

    const slide = new SlideController();
    slide.start(kcc);
    // Should not activate since not grounded
    expect(slide.isSliding()).toBe(false);

    kcc.dispose();
  });
});