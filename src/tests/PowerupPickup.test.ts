import { describe, it, expect, beforeAll } from 'vitest';
import { PhysicsWorld } from '../engine/physics/PhysicsWorld';
import { PLAYER_HEIGHT, PLAYER_RADIUS } from '../config/constants';

/**
 * Tests for PowerupPickup — temporary-effect pickups with duration tracking.
 */
describe('PowerupPickup type-specific colors', () => {
  let physics: PhysicsWorld;

  beforeAll(async () => {
    physics = new PhysicsWorld();
    await physics.init();
  });

  it('should assign correct color for speed_boost', async () => {
    const { PowerupPickup, PowerupType } = await import('../gameplay/pickups/PowerupPickup');
    const p = new PowerupPickup(physics, null, { x: 0, y: 0.5, z: 0 }, PowerupType.SpeedBoost);
    expect(p.powerupType).toBe('speed_boost');
    expect(p.duration).toBe(10);
    // Mesh should have the emissive color for speed_boost (0x004488 interior glow)
    expect(p['mesh']).not.toBeNull();
    p.dispose();
  });

  it('should assign correct duration override', async () => {
    const { PowerupPickup, PowerupType } = await import('../gameplay/pickups/PowerupPickup');
    const p = new PowerupPickup(physics, null, { x: 0, y: 0.5, z: 0 }, PowerupType.DogRepel, 15);
    expect(p.powerupType).toBe('dog_repel');
    expect(p.duration).toBe(15);
    p.dispose();
  });

  it('should assign all powerup types correctly', async () => {
    const { PowerupPickup, PowerupType } = await import('../gameplay/pickups/PowerupPickup');
    const types = [PowerupType.SpeedBoost, PowerupType.DogRepel, PowerupType.Shield, PowerupType.Magnet];
    const pickups = types.map(t =>
      new PowerupPickup(physics, null, { x: 0, y: 0.5, z: 0 }, t),
    );
    for (const p of pickups) {
      expect(p.powerupType).toBeDefined();
      expect(p.duration).toBeGreaterThan(0);
      expect(p.collected).toBe(false);
      expect(p.active).toBe(false);
      p.dispose();
    }
  });
});

describe('PowerupPickup activation and duration', () => {
  let physics: PhysicsWorld;

  beforeAll(async () => {
    physics = new PhysicsWorld();
    await physics.init();
    physics.addStaticGroundCollider(200, -0.5);
  });

  it('should activate on collection and fire onActivate', async () => {
    const { PowerupPickup, PowerupType } = await import('../gameplay/pickups/PowerupPickup');
    const pickup = new PowerupPickup(
      physics, null, { x: 0, y: 1, z: 0 }, PowerupType.SpeedBoost, 5,
    );

    const { CharacterKCC } = await import('../engine/physics/CharacterKCC');
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    kcc.setPosition({ x: 0, y: 1, z: 0 });

    let activatedPayload: any = null;
    pickup.onActivate = (payload) => { activatedPayload = payload; };

    const ctx = { player: { kcc } } as any;
    physics.step(1 / 60);
    pickup.update(1 / 60, ctx);

    expect(pickup.collected).toBe(true);
    expect(pickup.active).toBe(true);
    expect(pickup.timeRemaining).toBeCloseTo(5, 0);
    expect(activatedPayload).not.toBeNull();
    expect(activatedPayload.type).toBe('speed_boost');
    expect(activatedPayload.duration).toBe(5);

    kcc.dispose();
    pickup.dispose();
  });

  it('should count down duration each frame', async () => {
    const { PowerupPickup, PowerupType } = await import('../gameplay/pickups/PowerupPickup');
    const pickup = new PowerupPickup(
      physics, null, { x: 0, y: 1, z: 3 }, PowerupType.Shield, 2,
    );

    const { CharacterKCC } = await import('../engine/physics/CharacterKCC');
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    kcc.setPosition({ x: 0, y: 1, z: 3 });

    const ctx = { player: { kcc } } as any;
    physics.step(1 / 60);
    pickup.update(1 / 60, ctx);

    expect(pickup.active).toBe(true);
    expect(pickup.timeRemaining).toBeGreaterThan(0);

    // Simulate 1 second of frames (60 frames at 1/60)
    for (let i = 0; i < 60; i++) {
      pickup.update(1 / 60, ctx);
    }

    expect(pickup.active).toBe(true);
    expect(pickup.timeRemaining).toBeGreaterThan(0.9);
    expect(pickup.timeRemaining).toBeLessThan(1.1);

    // Simulate another 1.5 seconds
    for (let i = 0; i < 90; i++) {
      pickup.update(1 / 60, ctx);
    }

    // Should be expired (total ~2.5s elapsed, duration was 2s)
    expect(pickup.active).toBe(false);
    expect(pickup.timeRemaining).toBe(0);

    kcc.dispose();
    pickup.dispose();
  });

  it('should fire onDeactivate when effect expires', async () => {
    const { PowerupPickup, PowerupType } = await import('../gameplay/pickups/PowerupPickup');
    const pickup = new PowerupPickup(
      physics, null, { x: 0, y: 1, z: 5 }, PowerupType.DogRepel, 0.5,
    );

    const { CharacterKCC } = await import('../engine/physics/CharacterKCC');
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    kcc.setPosition({ x: 0, y: 1, z: 5 });

    let deactivatedType: string | null = null;
    pickup.onDeactivate = (type) => { deactivatedType = type; };

    const ctx = { player: { kcc } } as any;
    physics.step(1 / 60);
    pickup.update(1 / 60, ctx);

    // Simulate frames until expired (0.5s duration = 30 frames at 1/60)
    for (let i = 0; i < 35; i++) {
      pickup.update(1 / 60, ctx);
    }

    expect(deactivatedType).toBe('dog_repel');
    expect(pickup.active).toBe(false);

    kcc.dispose();
    pickup.dispose();
  });

  it('should NOT collect twice or re-activate', async () => {
    const { PowerupPickup, PowerupType } = await import('../gameplay/pickups/PowerupPickup');
    const pickup = new PowerupPickup(
      physics, null, { x: 0, y: 1, z: 7 }, PowerupType.Magnet, 3,
    );

    const { CharacterKCC } = await import('../engine/physics/CharacterKCC');
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    kcc.setPosition({ x: 0, y: 1, z: 7 });

    let activateCount = 0;
    pickup.onActivate = () => { activateCount++; };

    const ctx = { player: { kcc } } as any;
    physics.step(1 / 60);

    // First frame — should collect
    pickup.update(1 / 60, ctx);
    expect(pickup.collected).toBe(true);
    expect(activateCount).toBe(1);

    // Verify timeRemaining was set on activation
    expect(pickup.timeRemaining).toBeGreaterThan(0);

    // Second frame — sustained overlap, should NOT fire again
    pickup.update(1 / 60, ctx);
    expect(activateCount).toBe(1);

    kcc.dispose();
    pickup.dispose();
  });
});
