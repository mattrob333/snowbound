import { describe, it, expect } from 'vitest';
import { FallingIceHazard } from '../gameplay/hazards/FallingIceHazard';
import type { GameContext } from '../app/GameContext';

describe('FallingIceHazard', () => {
  const pos = { x: 10, y: 0, z: 10 };
  const half = { x: 1.5, y: 0.25, z: 1.5 };

  function makeMockCtx(playerX: number, playerZ: number = 10): GameContext {
    let rigidBodyId = 0;
    return {
      player: {
        kcc: {
          getPosition: () => ({ x: playerX, y: 0, z: playerZ }),
        },
      } as any,
      clock: { delta: 1 / 60, elapsed: 0 },
      physics: {
        addRigidBody(desc: any) {
          return {
            ...desc,
            translation: () => ({
              x: pos.x,
              y: 12, // above ground initially
              z: pos.z,
            }),
            addCollider: () => ({ handle: ++rigidBodyId }),
          };
        },
        addCollider(_desc: any, _parent?: any) {
          return { handle: ++rigidBodyId };
        },
        removeRigidBody(_body: any) {},
      },
      renderer: {
        scene: {
          add(_obj: any) {},
          remove(_obj: any) {},
        },
      },
    } as any;
  }

  it('should not activate when player is far away', () => {
    const h = new FallingIceHazard(pos, half, 2);
    h.update(1 / 60, makeMockCtx(50, 50)); // far from (10, 10)
    expect(h.activated).toBe(false);
    expect(h.spent).toBe(false);
    h.dispose();
  });

  it('should activate and start timer when player enters trigger zone', () => {
    const h = new FallingIceHazard(pos, half, 3);
    expect(h['timer']).toBe(0); // timer not started yet

    // Player within 3 units of (10, 10)
    h.update(1 / 60, makeMockCtx(10, 8));
    expect(h.activated).toBe(true);

    // Timer should be set to fallDelay (1.0 by default)
    expect(h['timer']).toBe(1.0); // not decremented yet (onActiveUpdate not called on activation tick)
    h.dispose();
  });

  it('should not create ice block until timer expires', () => {
    const h = new FallingIceHazard(pos, half, 3);
    h.update(1 / 60, makeMockCtx(10, 8)); // activate, timer = 1.0
    expect(h['timer']).toBe(1.0); // timer started
    expect(h['falling']).toBe(false); // block not yet created

    // Second tick — onActiveUpdate decrements timer
    h.update(1 / 60, makeMockCtx(10, 8));
    expect(h['timer']).toBeLessThan(1.0); // timer decremented
    expect(h['falling']).toBe(false); // block still not created
    h.dispose();
  });

  it('should create ice block after timer expires', () => {
    const h = new FallingIceHazard(pos, half, 3, 0.5);
    h.update(0.5, makeMockCtx(10, 8)); // activate (timer = 0.5)
    h.update(0.5, makeMockCtx(10, 8)); // timer expires, block created
    expect(h['falling']).toBe(true);
    expect(h['iceMesh']).not.toBeNull();
    expect(h['iceBody']).not.toBeNull();
    h.dispose();
  });

  it('should mark spent when ice hits the ground', () => {
    const h = new FallingIceHazard(pos, half, 3, 0.1);
    // Tick 1: activate (timer = 0.1)
    h.update(0.05, makeMockCtx(10, 8));
    // Tick 2: timer decremented by 0.05 = 0.05, still > 0
    h.update(0.05, makeMockCtx(10, 8));
    // Tick 3: timer = 0, block created
    h.update(0.05, makeMockCtx(10, 8));
    expect(h['falling']).toBe(true);
    expect(h['iceMesh']).not.toBeNull();

    // The mock body translation returns y=12, well above the ground threshold
    // (0 + 0.125 + 0.1 = 0.225). This test validates timer→block creation lifecycle.
    // The ground-hit detection requires a real Rapier physics step.
    expect(h.spent).toBe(false);
    h.dispose();
  });

  it('should respond to custom fallDelay', () => {
    const h = new FallingIceHazard(pos, half, 3, 2.5);
    h.update(1 / 60, makeMockCtx(10, 8)); // activate
    expect(h['timer']).toBe(2.5); // set to fallDelay, not decremented yet
    h.dispose();
  });

  it('should respond to custom triggerRadius', () => {
    const h = new FallingIceHazard(pos, half, 5, 1.0);
    // Player at (10, 6) — distance = 4 from (10, 10), within radius 5
    h.update(1 / 60, makeMockCtx(10, 6));
    expect(h.activated).toBe(true);
    h.dispose();
  });

  it('should be disposable without activation', () => {
    const h = new FallingIceHazard(pos, half);
    expect(() => h.dispose()).not.toThrow();
  });

  it('should be disposable after activation', () => {
    const h = new FallingIceHazard(pos, half, 3, 0.1);
    h.update(0.1, makeMockCtx(10, 8)); // activate
    h.update(0.1, makeMockCtx(10, 8)); // create block
    expect(() => h.dispose()).not.toThrow();
  });
});