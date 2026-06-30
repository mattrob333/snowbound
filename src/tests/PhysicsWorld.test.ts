import { describe, it, expect, beforeAll } from 'vitest';
import { PhysicsWorld } from '../engine/physics/PhysicsWorld';

describe('PhysicsWorld', () => {
  let physics: PhysicsWorld;

  beforeAll(async () => {
    physics = new PhysicsWorld();
    await physics.init();
  });

  it('should initialize and create a world', () => {
    expect(physics.isInitialized()).toBe(true);
    expect(physics.world).toBeDefined();
  });

  it('should add a static ground collider and raycast hits it', () => {
    const collider = physics.addStaticGroundCollider(200, -0.5);
    expect(collider).toBeDefined();

    // Step the world to update broad phase before querying
    physics.step(1 / 60);

    const hit = physics.raycast(
      { x: 0, y: 10, z: 0 },
      { x: 0, y: -1, z: 0 },
      20,
    );
    expect(hit).not.toBeNull();
    if (hit) {
      expect(hit.timeOfImpact).toBeGreaterThan(0);
      expect(hit.timeOfImpact).toBeLessThan(20);
      expect(hit.collider.handle).toBe(collider.handle);
    }
  });

  it('should perform multiple raycasts on ground', () => {
    const hit1 = physics.raycast(
      { x: 5, y: 10, z: -3 },
      { x: 0, y: -1, z: 0 },
      20,
    );
    expect(hit1).not.toBeNull();

    const hit2 = physics.raycast(
      { x: -10, y: 5, z: 8 },
      { x: 0, y: -1, z: 0 },
      15,
    );
    expect(hit2).not.toBeNull();
  });

  it('should step the physics world', () => {
    expect(() => physics.step(1 / 60)).not.toThrow();
  });
});