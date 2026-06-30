import { describe, it, expect, beforeAll } from 'vitest';
import { PhysicsWorld } from '../engine/physics/PhysicsWorld';
import { CharacterKCC } from '../engine/physics/CharacterKCC';
import { PLAYER_HEIGHT, PLAYER_RADIUS } from '../config/constants';

describe('CharacterKCC', () => {
  let physics: PhysicsWorld;

  beforeAll(async () => {
    physics = new PhysicsWorld();
    await physics.init();
    physics.addStaticGroundCollider(200, -0.5);
    physics.step(1 / 60);
  });

  it('should create a kinematic character controller', () => {
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    expect(kcc).toBeDefined();
    expect(kcc.controller).toBeDefined();
  });

  it('should set and read character position', () => {
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    kcc.setPosition({ x: 5, y: 3, z: -2 });
    physics.step(1 / 60);
    const pos = kcc.getPosition();
    expect(pos.x).toBeCloseTo(5);
    expect(pos.y).toBeCloseTo(3);
    expect(pos.z).toBeCloseTo(-2);
  });

  it('should compute movement with gravity', () => {
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    kcc.setPosition({ x: 0, y: 10, z: 0 });
    physics.step(1 / 60);

    const gravity = { x: 0, y: -9.81 * (1 / 60), z: 0 };
    kcc.computeMovement(gravity, 1 / 60);
    kcc.applyMovement();
    physics.step(1 / 60);

    // Should have moved down by gravity
    const pos = kcc.getPosition();
    expect(pos.y).toBeLessThan(10);
    expect(pos.y).toBeGreaterThan(9.5);
  });

  it('should register grounded while falling onto ground', () => {
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    kcc.setPosition({ x: 0, y: 3, z: 0 });
    physics.step(1 / 60);

    const gravity = { x: 0, y: -9.81 * (1 / 60), z: 0 };

    let wasGrounded = false;
    for (let i = 0; i < 200; i++) {
      kcc.computeMovement(gravity, 1 / 60);
      kcc.applyMovement();
      physics.step(1 / 60);
      if (kcc.isGrounded()) {
        wasGrounded = true;
        break;
      }
    }

    expect(wasGrounded).toBe(true);
  });

  it('should rest on ground without falling through', () => {
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    kcc.setPosition({ x: 0, y: 3, z: 0 });
    physics.step(1 / 60);

    const gravity = { x: 0, y: -9.81 * (1 / 60), z: 0 };

    // Fall to ground then keep stepping
    for (let i = 0; i < 300; i++) {
      kcc.computeMovement(gravity, 1 / 60);
      kcc.applyMovement();
      physics.step(1 / 60);
    }

    const pos = kcc.getPosition();
    // Should be above ground level (y > -0.5) and below starting position
    expect(pos.y).toBeGreaterThan(-0.4);
    expect(pos.y).toBeLessThan(3);
  });
});