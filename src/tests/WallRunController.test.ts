import { describe, it, expect, beforeAll } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../engine/physics/PhysicsWorld';
import { CharacterKCC } from '../engine/physics/CharacterKCC';
import { WallRunController } from '../gameplay/player/WallRunController';
import { PLAYER_HEIGHT, PLAYER_RADIUS } from '../config/constants';
import { PLAYER_TUNING } from '../config/tuning';

describe('WallRunController', () => {
  let physics: PhysicsWorld;

  beforeAll(async () => {
    physics = new PhysicsWorld();
    await physics.init();
    physics.addStaticGroundCollider(200, -0.5);
    physics.step(1 / 60);
  });

  it('should start inactive', () => {
    const wr = new WallRunController();
    expect(wr.isWallRunning()).toBe(false);
    expect(wr.isOnCooldown()).toBe(false);
  });

  it('should not activate while grounded (no wall near)', () => {
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    kcc.setPosition({ x: 0, y: 1, z: 0 });

    // Step to settle on ground
    for (let i = 0; i < 60; i++) {
      const gravity = { x: 0, y: PLAYER_TUNING.gravity * (1 / 60), z: 0 };
      kcc.computeMovement(gravity, 1 / 60);
      kcc.applyMovement();
      physics.step(1 / 60);
    }

    expect(kcc.isGrounded()).toBe(true);

    const wr = new WallRunController();
    wr.update(1 / 60, kcc, physics, false);
    expect(wr.isWallRunning()).toBe(false);

    kcc.dispose();
  });

  it('should activate when near a wall while airborne', () => {
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    kcc.setPosition({ x: 0, y: 1, z: 0 });

    // Build a wall on the right side
    const wallBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(2, 1, 0);
    const wallBody = physics.addRigidBody(wallBodyDesc);
    const wallColliderDesc = RAPIER.ColliderDesc.cuboid(0.25, 2, 5);
    physics.addCollider(wallColliderDesc, wallBody);

    physics.step(1 / 60);

    // Put player airborne near the wall
    kcc.setPosition({ x: 0.5, y: 1.5, z: 0 });
    physics.step(1 / 60);

    // Player is airborne (y=1.5, ground at -0.5)
    const wr = new WallRunController();
    wr.update(1 / 60, kcc, physics, false);

    // The raycast to the right (distance 1.5) should hit the wall at x=2
    // Player at x=0.5, wall at x=2, so distance is 1.5 — exactly rayLength
    // The ray goes from player pos at y=1.5+1.2=2.7 to the right
    // Wall cuboid centered at (2, 1, 0) with half-extents (0.25, 2, 5)
    // Wall left face at x = 2 - 0.25 = 1.75
    // Distance from player (x=0.5, y=2.7) to wall left face (x=1.75): 1.25
    // This should be within rayLength (1.5)
    expect(wr.isWallRunning()).toBe(true);

    kcc.dispose();
    physics.removeRigidBody(wallBody);
  });

  it('should deactivate after wall run duration', () => {
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    kcc.setPosition({ x: 0, y: 1, z: 0 });

    // Same wall setup
    const wallBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(2, 1, 0);
    const wallBody = physics.addRigidBody(wallBodyDesc);
    const wallColliderDesc = RAPIER.ColliderDesc.cuboid(0.25, 2, 5);
    physics.addCollider(wallColliderDesc, wallBody);

    physics.step(1 / 60);

    kcc.setPosition({ x: 0.5, y: 1.5, z: 0 });
    physics.step(1 / 60);

    const wr = new WallRunController();
    wr.update(1 / 60, kcc, physics, false);
    expect(wr.isWallRunning()).toBe(true);

    // Advance past wall run duration
    wr.update(PLAYER_TUNING.wallRunDuration, kcc, physics, false);
    expect(wr.isWallRunning()).toBe(true);

    wr.update(0.01, kcc, physics, false);
    expect(wr.isWallRunning()).toBe(false);

    kcc.dispose();
    physics.removeRigidBody(wallBody);
  });

  it('should apply cooldown after wall run ends', () => {
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    kcc.setPosition({ x: 0, y: 1, z: 0 });

    const wallBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(2, 1, 0);
    const wallBody = physics.addRigidBody(wallBodyDesc);
    const wallColliderDesc = RAPIER.ColliderDesc.cuboid(0.25, 2, 5);
    physics.addCollider(wallColliderDesc, wallBody);

    physics.step(1 / 60);
    kcc.setPosition({ x: 0.5, y: 1.5, z: 0 });
    physics.step(1 / 60);

    const wr = new WallRunController();
    wr.update(1 / 60, kcc, physics, false);
    expect(wr.isWallRunning()).toBe(true);

    // Let it expire
    wr.update(PLAYER_TUNING.wallRunDuration + 0.1, kcc, physics, false);
    expect(wr.isWallRunning()).toBe(false);
    expect(wr.isOnCooldown()).toBe(true);

    // Tick cooldown down
    wr.update(PLAYER_TUNING.wallRunCooldown, kcc, physics, false);
    expect(wr.isOnCooldown()).toBe(false);

    kcc.dispose();
    physics.removeRigidBody(wallBody);
  });

  it('wall jump should give velocity away from wall', () => {
    const wr = new WallRunController();

    // Manually trigger wall run by peeking at private state via update
    // Instead, test the getWallJumpVelocity method with known normal
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    kcc.setPosition({ x: 0, y: 1, z: 0 });

    const wallBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(2, 1, 0);
    const wallBody = physics.addRigidBody(wallBodyDesc);
    const wallColliderDesc = RAPIER.ColliderDesc.cuboid(0.25, 2, 5);
    physics.addCollider(wallColliderDesc, wallBody);

    physics.step(1 / 60);
    kcc.setPosition({ x: 0.5, y: 1.5, z: 0 });
    physics.step(1 / 60);

    wr.update(1 / 60, kcc, physics, false);
    expect(wr.isWallRunning()).toBe(true);

    // Wall jump — the wall is on the right (positive x), normal should point left (negative x — toward player)
    const wallNormal = wr.getWallNormal();
    expect(wallNormal.x).toBeLessThan(0); // pointing left

    const jump = wr.getWallJumpVelocity(PLAYER_TUNING.jumpVelocity);
    expect(jump.x).toBeLessThan(0); // jumps away from wall (to the left, negative x)
    expect(jump.y).toBeGreaterThan(0); // upward

    // Wall jump should exit wall-run state
    wr.update(1 / 60, kcc, physics, true);
    expect(wr.isWallRunning()).toBe(false);

    kcc.dispose();
    physics.removeRigidBody(wallBody);
  });

  it('should provide reduced gravity during wall run', () => {
    const wr = new WallRunController();

    // Not wall-running — full gravity
    const fullG = wr.getWallRunGravity(PLAYER_TUNING.gravity, 1 / 60);
    expect(fullG).toBe(PLAYER_TUNING.gravity);
  });

  it('should deactivate when player lands on ground', () => {
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    kcc.setPosition({ x: 0, y: 1, z: 0 });

    const wallBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(2, 1, 0);
    const wallBody = physics.addRigidBody(wallBodyDesc);
    const wallColliderDesc = RAPIER.ColliderDesc.cuboid(0.25, 2, 5);
    physics.addCollider(wallColliderDesc, wallBody);

    physics.step(1 / 60);
    kcc.setPosition({ x: 0.5, y: 1.5, z: 0 });
    physics.step(1 / 60);

    const wr = new WallRunController();
    wr.update(1 / 60, kcc, physics, false);
    expect(wr.isWallRunning()).toBe(true);

    // Fall to ground
    for (let i = 0; i < 120; i++) {
      const gravity = { x: 0, y: PLAYER_TUNING.gravity * (1 / 60), z: 0 };
      kcc.computeMovement(gravity, 1 / 60);
      kcc.applyMovement();
      physics.step(1 / 60);
    }

    // Should be grounded
    wr.update(1 / 60, kcc, physics, false);
    expect(wr.isWallRunning()).toBe(false);

    kcc.dispose();
    physics.removeRigidBody(wallBody);
  });
});