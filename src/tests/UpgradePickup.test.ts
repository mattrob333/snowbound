import { describe, it, expect, beforeAll } from 'vitest';
import { PhysicsWorld } from '../engine/physics/PhysicsWorld';
import { PLAYER_HEIGHT, PLAYER_RADIUS } from '../config/constants';

describe('PlayerUpgradeService', () => {
  it('should start empty', async () => {
    const { PlayerUpgradeService } = await import('../gameplay/player/PlayerUpgradeService');
    const svc = new PlayerUpgradeService();
    expect(svc.count).toBe(0);
    expect(svc.getCollected()).toEqual([]);
    svc.reset();
  });

  it('should add and track upgrades', async () => {
    const { PlayerUpgradeService, UpgradeType } = await import('../gameplay/player/PlayerUpgradeService');
    const svc = new PlayerUpgradeService();
    svc.addUpgrade(UpgradeType.SprintBoost);
    expect(svc.count).toBe(1);
    expect(svc.hasUpgrade(UpgradeType.SprintBoost)).toBe(true);
    expect(svc.hasUpgrade(UpgradeType.JumpBoost)).toBe(false);
    svc.reset();
  });

  it('should not add duplicates', async () => {
    const { PlayerUpgradeService, UpgradeType } = await import('../gameplay/player/PlayerUpgradeService');
    const svc = new PlayerUpgradeService();
    svc.addUpgrade(UpgradeType.SprintBoost);
    svc.addUpgrade(UpgradeType.SprintBoost);
    expect(svc.count).toBe(1);
    svc.reset();
  });

  it('should remove upgrades', async () => {
    const { PlayerUpgradeService, UpgradeType } = await import('../gameplay/player/PlayerUpgradeService');
    const svc = new PlayerUpgradeService();
    svc.addUpgrade(UpgradeType.WallrunExtender);
    expect(svc.count).toBe(1);
    svc.removeUpgrade(UpgradeType.WallrunExtender);
    expect(svc.count).toBe(0);
    svc.reset();
  });

  it('should reset all upgrades', async () => {
    const { PlayerUpgradeService, UpgradeType } = await import('../gameplay/player/PlayerUpgradeService');
    const svc = new PlayerUpgradeService();
    svc.addUpgrade(UpgradeType.SprintBoost);
    svc.addUpgrade(UpgradeType.JumpBoost);
    expect(svc.count).toBe(2);
    svc.reset();
    expect(svc.count).toBe(0);
  });

  it('should respect setEnabled(false)', async () => {
    const { PlayerUpgradeService, UpgradeType } = await import('../gameplay/player/PlayerUpgradeService');
    const svc = new PlayerUpgradeService();
    svc.setEnabled(false);
    svc.addUpgrade(UpgradeType.SprintBoost);
    expect(svc.count).toBe(0);
    svc.setEnabled(true);
    svc.reset();
  });

  it('should compute combined multipliers for single upgrade', async () => {
    const { PlayerUpgradeService, UpgradeType } = await import('../gameplay/player/PlayerUpgradeService');
    const svc = new PlayerUpgradeService();
    svc.addUpgrade(UpgradeType.SprintBoost);
    const mults = svc.getCombinedMultipliers();
    expect(mults.sprintSpeed).toBeCloseTo(1.15);
    expect(mults.wallRunDuration).toBe(1);
    expect(mults.jumpVelocity).toBe(1);
    expect(mults.slideSpeed).toBe(1);
    svc.reset();
  });

  it('should combine multiple upgrades', async () => {
    const { PlayerUpgradeService, UpgradeType } = await import('../gameplay/player/PlayerUpgradeService');
    const svc = new PlayerUpgradeService();
    svc.addUpgrade(UpgradeType.SprintBoost);
    svc.addUpgrade(UpgradeType.WallrunExtender);
    svc.addUpgrade(UpgradeType.JumpBoost);
    svc.addUpgrade(UpgradeType.SlidePower);
    const mults = svc.getCombinedMultipliers();
    expect(mults.sprintSpeed).toBeCloseTo(1.15);
    expect(mults.wallRunDuration).toBeCloseTo(1.25);
    expect(mults.jumpVelocity).toBeCloseTo(1.20);
    expect(mults.slideSpeed).toBeCloseTo(1.15);
    svc.reset();
  });

  it('should provide display info for upgrades', async () => {
    const { PlayerUpgradeService, UpgradeType } = await import('../gameplay/player/PlayerUpgradeService');
    const svc = new PlayerUpgradeService();
    expect(svc.getDisplayName(UpgradeType.SprintBoost)).toBe('Sprint Boost');
    expect(svc.getDescription(UpgradeType.SprintBoost)).toBeTruthy();
    svc.reset();
  });

  it('should apply multipliers to tuning', async () => {
    const { PlayerUpgradeService, UpgradeType } = await import('../gameplay/player/PlayerUpgradeService');
    const svc = new PlayerUpgradeService();
    svc.addUpgrade(UpgradeType.SprintBoost);
    const tuning = svc.applyToTuning();
    expect(tuning.sprintSpeed).toBeGreaterThan(9);
    expect(tuning.walkSpeed).toBe(4); // unaffected
    svc.reset();
  });
});

describe('UpgradePickup', () => {
  let physics: PhysicsWorld;
  let svc: import('../gameplay/player/PlayerUpgradeService').PlayerUpgradeService;

  beforeAll(async () => {
    physics = new PhysicsWorld();
    await physics.init();
    physics.addStaticGroundCollider(200, -0.5);
    const { PlayerUpgradeService } = await import('../gameplay/player/PlayerUpgradeService');
    svc = new PlayerUpgradeService();
  });

  it('should register upgrade on collection', async () => {
    const { UpgradePickup } = await import('../gameplay/pickups/UpgradePickup');
    const { UpgradeType } = await import('../gameplay/player/PlayerUpgradeService');
    const { CharacterKCC } = await import('../engine/physics/CharacterKCC');

    const pickup = new UpgradePickup(
      physics, null, { x: 0, y: 1, z: 0 }, svc, UpgradeType.SprintBoost,
    );
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    kcc.setPosition({ x: 0, y: 1, z: 0 });

    let collectedInfo: { type: string; displayName: string } | null = null;
    pickup.onUpgradeCollected = (type, name) => { collectedInfo = { type, displayName: name }; };

    const ctx = { player: { kcc } } as any;
    physics.step(1 / 60);
    pickup.update(1 / 60, ctx);

    expect(pickup.collected).toBe(true);
    expect(svc.hasUpgrade(UpgradeType.SprintBoost)).toBe(true);
    expect(collectedInfo).not.toBeNull();
    expect(collectedInfo!.type).toBe('sprint_boost');
    expect(collectedInfo!.displayName).toBe('Sprint Boost');

    kcc.dispose();
    pickup.dispose();
  });

  it('should NOT collect twice', async () => {
    const { UpgradePickup } = await import('../gameplay/pickups/UpgradePickup');
    const { UpgradeType } = await import('../gameplay/player/PlayerUpgradeService');
    const { CharacterKCC } = await import('../engine/physics/CharacterKCC');

    const pickup = new UpgradePickup(
      physics, null, { x: 0, y: 1, z: 5 }, svc, UpgradeType.JumpBoost,
    );
    const kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    kcc.setPosition({ x: 0, y: 1, z: 5 });

    let collectCount = 0;
    pickup.onUpgradeCollected = () => { collectCount++; };

    const ctx = { player: { kcc } } as any;
    physics.step(1 / 60);
    pickup.update(1 / 60, ctx);
    pickup.update(1 / 60, ctx);

    expect(collectCount).toBe(1);

    kcc.dispose();
    pickup.dispose();
  });

  it('should have type-specific visual', async () => {
    const { UpgradePickup } = await import('../gameplay/pickups/UpgradePickup');
    const { UpgradeType } = await import('../gameplay/player/PlayerUpgradeService');

    const pickup = new UpgradePickup(
      physics, null, { x: 5, y: 1, z: 5 }, svc, UpgradeType.SlidePower,
    );
    expect(pickup.upgradeType).toBe('slide_power');
    expect(pickup.collected).toBe(false);
    expect(pickup.dispose).toBeDefined();

    pickup.dispose();
  });
});
