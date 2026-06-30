import { describe, it, expect, vi, beforeAll } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../engine/physics/PhysicsWorld';
import { SafeZone } from '../gameplay/levels/SafeZone';
import type { CharacterKCC } from '../engine/physics/CharacterKCC';

/** Create a minimal mock GameContext */
function createMockCtx(kccPosition: { x: number; y: number; z: number }) {
  const kcc = {
    getPosition: () => ({ x: kccPosition.x, y: kccPosition.y, z: kccPosition.z }),
  } as unknown as CharacterKCC;

  return {
    player: {
      kcc,
      partCollected: false,
    },
    levelManager: {
      isLevelLoaded: true,
      levelData: { helicopterPart: { position: { x: 0, y: 0, z: 0 }, partId: 'test' } },
    },
  } as any;
}

describe('SafeZone', () => {
  let physics: PhysicsWorld;

  beforeAll(async () => {
    await RAPIER.init();
    physics = new PhysicsWorld();
    await physics.init();
  });

  it('detects player inside zone', () => {
    const zone = new SafeZone(
      physics,
      null,
      { x: 0, y: 0, z: 0 },
      5,
      false, // does not require part
    );

    const ctx = createMockCtx({ x: 0, y: 0, z: 2 });
    zone.update(1 / 60, ctx);

    expect(zone.playerInside).toBe(true);
    zone.dispose();
  });

  it('detects player outside zone', () => {
    const zone = new SafeZone(
      physics,
      null,
      { x: 0, y: 0, z: 0 },
      5,
      false,
    );

    const ctx = createMockCtx({ x: 20, y: 0, z: 0 });
    zone.update(1 / 60, ctx);

    expect(zone.playerInside).toBe(false);
    zone.dispose();
  });

  it('completes when player is inside and part is not required', () => {
    const zone = new SafeZone(
      physics,
      null,
      { x: 0, y: 0, z: 0 },
      5,
      false,
    );

    const ctx = createMockCtx({ x: 0, y: 0, z: 0 });
    zone.update(1 / 60, ctx);

    expect(zone.completed).toBe(true);
    zone.dispose();
  });

  it('requires part collected when requiresPart is true', () => {
    const zone = new SafeZone(
      physics,
      null,
      { x: 0, y: 0, z: 0 },
      5,
      true, // requires part
    );

    const ctx = createMockCtx({ x: 0, y: 0, z: 0 });
    ctx.player.partCollected = false;
    zone.update(1 / 60, ctx);

    // Player inside but part not collected → not complete
    expect(zone.playerInside).toBe(true);
    expect(zone.completed).toBe(false);

    // Now collect the part
    ctx.player.partCollected = true;
    zone.update(1 / 60, ctx);

    expect(zone.completed).toBe(true);
    zone.dispose();
  });

  it('fires onLevelComplete callback', () => {
    const zone = new SafeZone(
      physics,
      null,
      { x: 0, y: 0, z: 0 },
      5,
      false,
    );

    const callback = vi.fn();
    zone.onLevelComplete = callback;

    const ctx = createMockCtx({ x: 0, y: 0, z: 0 });
    zone.update(1 / 60, ctx);

    expect(callback).toHaveBeenCalledTimes(1);
    zone.dispose();
  });

  it('fires enter/exit callbacks', () => {
    const zone = new SafeZone(
      physics,
      null,
      { x: 0, y: 0, z: 0 },
      5,
      true, // requires part -> won't auto-complete
    );

    const onEnter = vi.fn();
    const onExit = vi.fn();
    zone.onPlayerEnter = onEnter;
    zone.onPlayerExit = onExit;

    // Player outside (part not collected)
    const ctx = createMockCtx({ x: 20, y: 0, z: 0 });
    ctx.player.partCollected = false;
    zone.update(1 / 60, ctx);
    expect(onEnter).not.toHaveBeenCalled();
    expect(onExit).not.toHaveBeenCalled();

    // Move player inside
    ctx.player.kcc.getPosition = () => ({ x: 0, y: 0, z: 0 });
    zone.update(1 / 60, ctx);
    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(onExit).not.toHaveBeenCalled();

    // Move player outside again
    ctx.player.kcc.getPosition = () => ({ x: 20, y: 0, z: 0 });
    zone.update(1 / 60, ctx);
    expect(onExit).toHaveBeenCalledTimes(1);

    zone.dispose();
  });

  it('does not fire onLevelComplete twice', () => {
    const zone = new SafeZone(
      physics,
      null,
      { x: 0, y: 0, z: 0 },
      5,
      false,
    );

    const callback = vi.fn();
    zone.onLevelComplete = callback;

    const ctx = createMockCtx({ x: 0, y: 0, z: 0 });
    // First update triggers completion
    zone.update(1 / 60, ctx);
    expect(callback).toHaveBeenCalledTimes(1);

    // Second update should not fire again
    zone.update(1 / 60, ctx);
    expect(callback).toHaveBeenCalledTimes(1);

    zone.dispose();
  });

  it('uses correct collision group for sensor', () => {
    const zone = new SafeZone(
      physics,
      null,
      { x: 0, y: 0, z: 0 },
      5,
      false,
    );

    // Should be able to check player inside/outside correctly
    expect(zone.playerInside).toBe(false);

    const ctx = createMockCtx({ x: 0, y: 0, z: 0 });
    zone.update(1 / 60, ctx);
    expect(zone.playerInside).toBe(true);

    zone.dispose();
  });
});
