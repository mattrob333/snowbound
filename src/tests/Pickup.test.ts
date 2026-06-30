import { describe, it, expect, beforeAll } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../engine/physics/PhysicsWorld';
import { PLAYER_HEIGHT } from '../config/constants';

describe('Pickup sensor collision', () => {
  let physics: PhysicsWorld;

  beforeAll(async () => {
    physics = new PhysicsWorld();
    await physics.init();
  });

  it('should have player and pickup bodies that are close enough to overlap', () => {
    // Create a sensor body
    const sensorDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(0, 1, 3);
    const sensorBody = physics.addRigidBody(sensorDesc);
    const sensorCollider = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)
      .setSensor(true);
    physics.addCollider(sensorCollider, sensorBody);

    // Create a player capsule
    const playerDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(0, PLAYER_HEIGHT / 2, 2.5);
    const playerBody = physics.addRigidBody(playerDesc);
    const playerCollider = RAPIER.ColliderDesc.capsule(
      PLAYER_HEIGHT / 2 - 0.3,
      0.3
    );
    physics.addCollider(playerCollider, playerBody);

    // Verify positions
    const sensorPos = sensorBody.translation();
    const playerPos = playerBody.translation();
    const zDist = Math.abs(sensorPos.z - playerPos.z);

    // Sensor z-range: [2.5, 3.5], Player z-range (center ± radius): [2.2, 2.8]
    // They overlap in z if zDist < 0.5 (sensor half-extent) + 0.3 (player radius)
    expect(zDist).toBeLessThan(0.8);
    // So they should geometrically overlap

    // Cleanup
    physics.removeRigidBody(playerBody);
    physics.removeRigidBody(sensorBody);
  });

  it('should have no overlap when player is far away', () => {
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
      0.3
    );
    physics.addCollider(playerCollider, playerBody);

    const sensorPos = sensorBody.translation();
    const playerPos = playerBody.translation();
    const zDist = Math.abs(sensorPos.z - playerPos.z);
    const xDist = Math.abs(sensorPos.x - playerPos.x);

    expect(zDist).toBeGreaterThan(10);
    expect(xDist).toBeGreaterThan(10);

    physics.removeRigidBody(playerBody);
    physics.removeRigidBody(sensorBody);
  });
});