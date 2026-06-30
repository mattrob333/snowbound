import { describe, it, expect, beforeAll } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../engine/physics/PhysicsWorld';
import { PLAYER_HEIGHT, PLAYER_RADIUS } from '../config/constants';

/**
 * Rapier 0.19 compat doesn't reliably fire sensor intersection events
 * via drainCollisionEvents or intersectionPair for all shape types.
 *
 * These tests validate position-based proximity detection (boxesOverlap)
 * which is the reliable alternative used for pickup detection.
 */
describe('Pickup sensor proximity detection', () => {
  let physics: PhysicsWorld;

  beforeAll(async () => {
    physics = new PhysicsWorld();
    await physics.init();
  });

  it('should detect overlap when player overlaps pickup sensor', () => {
    // Sensor at (0, 1, 3) with half-extents (0.5, 0.5, 0.5)
    const sensorDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(0, 1, 3);
    const sensorBody = physics.addRigidBody(sensorDesc);
    const sensorCollider = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)
      .setSensor(true);
    physics.addCollider(sensorCollider, sensorBody);

    // Player at (0, PLAYER_HEIGHT/2, 2.8) — close enough to overlap
    // Player capsule: half-height PLAYER_HEIGHT/2-0.3, radius 0.3
    // So the player occupies Z range [2.8-0.3, 2.8+0.3] = [2.5, 3.1]
    // Sensor occupies Z range [3-0.5, 3+0.5] = [2.5, 3.5]
    // Overlap on Z: YES (2.5 === 2.5)
    const playerDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(0, PLAYER_HEIGHT / 2, 2.8);
    const playerBody = physics.addRigidBody(playerDesc);
    const playerCollider = RAPIER.ColliderDesc.capsule(
      PLAYER_HEIGHT / 2 - 0.3,
      0.3,
    );
    physics.addCollider(playerCollider, playerBody);

    // Use manual AABB overlap check
    const sensorPos = sensorBody.translation();
    const sensorHalf = { x: 0.5, y: 0.5, z: 0.5 };
    const playerPos = playerBody.translation();
    // For capsule, approximate half-extents using radius and half-height
    const capsuleHalfHeight = PLAYER_HEIGHT / 2;
    const capsuleRadius = 0.3;
    const playerHalf = { x: capsuleRadius, y: capsuleHalfHeight, z: capsuleRadius };

    const overlapping = physics.boxesOverlap(
      { x: sensorPos.x, y: sensorPos.y, z: sensorPos.z }, sensorHalf,
      { x: playerPos.x, y: playerPos.y, z: playerPos.z }, playerHalf,
    );

    expect(overlapping).toBe(true);

    physics.removeRigidBody(playerBody);
    physics.removeRigidBody(sensorBody);
  });

  it('should NOT detect overlap when player is far away', () => {
    const sensorDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(20, 1, 20);
    const sensorBody = physics.addRigidBody(sensorDesc);
    const sensorCollider = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)
      .setSensor(true);
    physics.addCollider(sensorCollider, sensorBody);

    const playerDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(0, PLAYER_HEIGHT / 2, 0);
    const playerBody = physics.addRigidBody(playerDesc);
    const playerCollider = RAPIER.ColliderDesc.capsule(
      PLAYER_HEIGHT / 2 - 0.3,
      0.3,
    );
    physics.addCollider(playerCollider, playerBody);

    const sensorPos = sensorBody.translation();
    const sensorHalf = { x: 0.5, y: 0.5, z: 0.5 };
    const playerPos = playerBody.translation();
    const capsuleRadius = 0.3;
    const capsuleHalfHeight = PLAYER_HEIGHT / 2;
    const playerHalf = { x: capsuleRadius, y: capsuleHalfHeight, z: capsuleRadius };

    const overlapping = physics.boxesOverlap(
      { x: sensorPos.x, y: sensorPos.y, z: sensorPos.z }, sensorHalf,
      { x: playerPos.x, y: playerPos.y, z: playerPos.z }, playerHalf,
    );

    expect(overlapping).toBe(false);

    physics.removeRigidBody(playerBody);
    physics.removeRigidBody(sensorBody);
  });

  it('should detect transition from overlapping to not overlapping', () => {
    // Sensor at (0, 1, 3)
    const sensorDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(0, 1, 3);
    const sensorBody = physics.addRigidBody(sensorDesc);
    const sensorCollider = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)
      .setSensor(true);
    physics.addCollider(sensorCollider, sensorBody);

    // Player initially overlapping
    const playerDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(0, PLAYER_HEIGHT / 2, 2.8);
    const playerBody = physics.addRigidBody(playerDesc);
    const playerCollider = RAPIER.ColliderDesc.capsule(
      PLAYER_HEIGHT / 2 - 0.3,
      0.3,
    );
    physics.addCollider(playerCollider, playerBody);

    const sensorHalf = { x: 0.5, y: 0.5, z: 0.5 };
    const capsuleRadius = 0.3;
    const capsuleHalfHeight = PLAYER_HEIGHT / 2;
    const playerHalf = { x: capsuleRadius, y: capsuleHalfHeight, z: capsuleRadius };

    // Check initially overlapping
    const pos1 = playerBody.translation();
    const initiallyOverlapping = physics.boxesOverlap(
      { x: 0, y: 1, z: 3 }, sensorHalf,
      { x: pos1.x, y: pos1.y, z: pos1.z }, playerHalf,
    );
    expect(initiallyOverlapping).toBe(true);

    // Move player far away
    playerBody.setTranslation({ x: 0, y: PLAYER_HEIGHT / 2, z: 100 }, true);
    physics.step(1 / 60);

    // Check no longer overlapping
    const pos2 = playerBody.translation();
    const stillOverlapping = physics.boxesOverlap(
      { x: 0, y: 1, z: 3 }, sensorHalf,
      { x: pos2.x, y: pos2.y, z: pos2.z }, playerHalf,
    );
    expect(stillOverlapping).toBe(false);

    physics.removeRigidBody(playerBody);
    physics.removeRigidBody(sensorBody);
  });
});

describe('Pickup entity detection via Pickup.update()', () => {
  let physics: PhysicsWorld;

  beforeAll(async () => {
    physics = new PhysicsWorld();
    await physics.init();
    physics.addStaticGroundCollider(200, -0.5);
  });

  it('should detect player proximity and mark collected', async () => {
    const { Pickup } = await import('../gameplay/pickups/Pickup');
    const pickup = new Pickup(
      physics, null, { x: 0, y: 1, z: 0 },
    );
    expect(pickup.collected).toBe(false);

    const { CharacterKCC } = await import('../engine/physics/CharacterKCC');
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    kcc.setPosition({ x: 0, y: 1, z: 0 });

    // Build a minimal GameContext with just the player
    const ctx = { player: { kcc } } as any;

    // Simulate one frame — player at the same position as pickup
    physics.step(1 / 60);
    pickup.update(1 / 60, ctx);

    expect(pickup.collected).toBe(true);

    kcc.dispose();
    pickup.dispose();
  });

  it('should NOT detect pickup when player is far away', async () => {
    const { Pickup } = await import('../gameplay/pickups/Pickup');
    const pickup = new Pickup(
      physics, null, { x: 50, y: 1, z: 50 },
    );
    expect(pickup.collected).toBe(false);

    const { CharacterKCC } = await import('../engine/physics/CharacterKCC');
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    kcc.setPosition({ x: 0, y: 1, z: 0 });

    const ctx = { player: { kcc } } as any;

    physics.step(1 / 60);
    pickup.update(1 / 60, ctx);

    expect(pickup.collected).toBe(false);

    kcc.dispose();
    pickup.dispose();
  });

  it('should only call collect() once on sustained overlap', async () => {
    const { Pickup } = await import('../gameplay/pickups/Pickup');
    const pickup = new Pickup(
      physics, null, { x: 0, y: 1, z: 0 },
    );
    let collectCount = 0;
    pickup.onCollect = () => { collectCount++; };

    const { CharacterKCC } = await import('../engine/physics/CharacterKCC');
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    kcc.setPosition({ x: 0, y: 1, z: 0 });

    const ctx = { player: { kcc } } as any;

    physics.step(1 / 60);

    // First frame — should collect
    pickup.update(1 / 60, ctx);
    expect(pickup.collected).toBe(true);
    expect(collectCount).toBe(1);

    // Second frame — sustained overlap, should NOT call again
    pickup.update(1 / 60, ctx);
    expect(collectCount).toBe(1);

    kcc.dispose();
    pickup.dispose();
  });
});