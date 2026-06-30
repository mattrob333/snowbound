import { describe, it, expect } from 'vitest';
import { Hazard } from '../gameplay/hazards/Hazard';
import type { GameContext } from '../app/GameContext';

/**
 * Minimal concrete Hazard subclass for testing the base class logic.
 */
class TestHazard extends Hazard {
  playerEntered = false;
  activeUpdateCount = 0;

  constructor() {
    super('cracked_ice', { x: 0, y: 0, z: 0 }, { x: 1, y: 0.5, z: 1 }, 3);
  }

  protected onPlayerEnter(_ctx: GameContext): void {
    this.playerEntered = true;
  }

  protected onActiveUpdate(_dt: number, _ctx: GameContext): void {
    this.activeUpdateCount++;
    // Mark spent after 3 updates
    if (this.activeUpdateCount >= 3) {
      this.spent = true;
    }
  }

  dispose(): void {
    this.spent = true;
  }
}

function makeMockCtx(playerX: number, playerZ: number = 0): GameContext {
  return {
    player: {
      kcc: {
        getPosition: () => ({ x: playerX, y: 0, z: playerZ }),
      },
    } as any,
    clock: { delta: 1 / 60, elapsed: 0 },
  } as any;
}

describe('Hazard (base class)', () => {
  it('should start inactive and not spent', () => {
    const h = new TestHazard();
    expect(h.activated).toBe(false);
    expect(h.spent).toBe(false);
    expect(h.hazardType).toBe('cracked_ice');
    h.dispose();
  });

  it('should activate when player is within trigger radius', () => {
    const h = new TestHazard();
    // Player at (2, 0, 0) — distance = 2, radius = 3 → in range
    h.update(1 / 60, makeMockCtx(2));
    expect(h.activated).toBe(true);
    expect(h.playerEntered).toBe(true);
    h.dispose();
  });

  it('should not activate when player is outside trigger radius', () => {
    const h = new TestHazard();
    // Player at (5, 0, 0) — distance = 5, radius = 3 → out of range
    h.update(1 / 60, makeMockCtx(5));
    expect(h.activated).toBe(false);
    expect(h.playerEntered).toBe(false);
    h.dispose();
  });

  it('should call onActiveUpdate each frame after activation', () => {
    const h = new TestHazard();
    h.update(1 / 60, makeMockCtx(0)); // activate
    expect(h.activated).toBe(true);
    expect(h.activeUpdateCount).toBe(0); // first tick: activate, not update active

    h.update(1 / 60, makeMockCtx(0)); // first active update
    expect(h.activeUpdateCount).toBe(1);

    h.update(1 / 60, makeMockCtx(0)); // second
    expect(h.activeUpdateCount).toBe(2);
    h.dispose();
  });

  it('should not activate twice', () => {
    const h = new TestHazard();
    h.update(1 / 60, makeMockCtx(0));
    expect(h.activated).toBe(true);
    expect(h.playerEntered).toBe(true);

    // Second update with player still in range
    h.playerEntered = false;
    h.update(1 / 60, makeMockCtx(0));
    expect(h.playerEntered).toBe(false); // should not fire again
    h.dispose();
  });

  it('should not update after spent', () => {
    const h = new TestHazard();
    h.update(1 / 60, makeMockCtx(0)); // activate
    h.update(1 / 60, makeMockCtx(0)); // 1
    h.update(1 / 60, makeMockCtx(0)); // 2
    h.update(1 / 60, makeMockCtx(0)); // 3 → spent

    expect(h.spent).toBe(true);

    // This update should be a no-op
    const countBefore = h.activeUpdateCount;
    h.update(1 / 60, makeMockCtx(0));
    expect(h.activeUpdateCount).toBe(countBefore);
    h.dispose();
  });

  it('should check Z distance as well as X', () => {
    const h = new TestHazard();
    // Player at (2, 0, 2) — distance = sqrt(8) ≈ 2.83, radius = 3 → in range
    h.update(1 / 60, makeMockCtx(2, 2));
    expect(h.activated).toBe(true);
    h.dispose();
  });

  it('should check Z distance exclusion', () => {
    const h = new TestHazard();
    // Player at (0, 0, 4) — distance = 4, radius = 3 → out of range
    h.update(1 / 60, makeMockCtx(0, 4));
    expect(h.activated).toBe(false);
    h.dispose();
  });
});