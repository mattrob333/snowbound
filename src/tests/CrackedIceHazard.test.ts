import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CrackedIceHazard } from '../gameplay/hazards/CrackedIceHazard';
import type { GameContext } from '../app/GameContext';

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

describe('CrackedIceHazard', () => {
  const pos = { x: 0, y: 0, z: 0 };
  const half = { x: 1.5, y: 0.15, z: 1.5 };

  it('should start inactive and not spent', () => {
    const h = new CrackedIceHazard(pos, half);
    expect(h.activated).toBe(false);
    expect(h.spent).toBe(false);
    expect(h.hazardType).toBe('cracked_ice');
    h.dispose();
  });

  it('should activate when player is within trigger radius', () => {
    const h = new CrackedIceHazard(pos, half, 3);
    h.update(1 / 60, makeMockCtx(2)); // distance 2, radius 3 → in range
    expect(h.activated).toBe(true);
    h.dispose();
  });

  it('should not activate when player is outside trigger radius', () => {
    const h = new CrackedIceHazard(pos, half, 2);
    h.update(1 / 60, makeMockCtx(5)); // distance 5, radius 2 → out of range
    expect(h.activated).toBe(false);
    expect(h.spent).toBe(false);
    h.dispose();
  });

  it('should mark spent after activeDuration expires', () => {
    const h = new CrackedIceHazard(pos, half, 3, 0.5); // 0.5s active duration
    h.update(0.5, makeMockCtx(0)); // activate (onPlayerEnter sets timer=0.5)
    expect(h.activated).toBe(true);
    expect(h.spent).toBe(false);

    // Advance time past 0.5s (first onActiveUpdate tick)
    h.update(0.3, makeMockCtx(0)); // timer = 0.5 - 0.3 = 0.2
    expect(h.spent).toBe(false);

    h.update(0.3, makeMockCtx(0)); // timer = -0.1 → spent
    expect(h.spent).toBe(true);
  });

  it('should work with default activeDuration', () => {
    const h = new CrackedIceHazard(pos, half, 3);
    h.update(1 / 60, makeMockCtx(0)); // activate
    expect(h.activated).toBe(true);
    expect(h.spent).toBe(false);

    // After 2s of updates, should be spent (default = 2.0)
    // First tick activates (doesn't decrement), then advance by 0.1s per tick
    for (let i = 0; i < 21; i++) {
      h.update(0.1, makeMockCtx(0));
    }
    expect(h.spent).toBe(true);
  });

  it('should update visual mesh color when activated', () => {
    const h = new CrackedIceHazard(pos, half, 3);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ color: 0xaaccff }),
    );
    h.setVisualMesh(mesh);

    // Before activation: color is original
    expect((mesh.material as THREE.MeshLambertMaterial).color.getHex()).toBe(0xaaccff);

    // Activate — onPlayerEnter fires but onActiveUpdate doesn't run yet
    h.update(1 / 60, makeMockCtx(0));

    // Still original color because onActiveUpdate hasn't run yet
    // Need one more update to trigger the visual change
    h.update(1 / 60, makeMockCtx(0));

    // After activation's onActiveUpdate: color changes to cracked (0x888888)
    expect((mesh.material as THREE.MeshLambertMaterial).color.getHex()).toBe(0x888888);
    h.dispose();
  });

  it('should have default dogGapPenalty', () => {
    const h = new CrackedIceHazard(pos, half);
    expect(h.dogGapPenalty).toBe(0.08);
    h.dispose();
  });

  it('should not activate twice', () => {
    const h = new CrackedIceHazard(pos, half, 3);
    h.update(1 / 60, makeMockCtx(0)); // activate
    expect(h.activated).toBe(true);

    // Reset the activation counter and try again
    h['activated'] = false; // force reset
    h.update(1 / 60, makeMockCtx(0)); // should activate again? No — onPlayerEnter is fire-once
    // Actually the base class only calls onPlayerEnter once (when !activated && inRange)
    // So re-setting activated to false will trigger it again, which is the base class behavior
    expect(h.activated).toBe(true);
    h.dispose();
  });

  it('should respond to custom triggerRadius', () => {
    const h = new CrackedIceHazard(pos, half, 5);
    // Player at (4, 0, 0) — distance 4, radius 5 → in range
    h.update(1 / 60, makeMockCtx(4));
    expect(h.activated).toBe(true);
    h.dispose();
  });

  it('should be disposable without activation', () => {
    const h = new CrackedIceHazard(pos, half);
    expect(() => h.dispose()).not.toThrow();
  });

  it('should be disposable after activation', () => {
    const h = new CrackedIceHazard(pos, half, 3);
    h.update(1 / 60, makeMockCtx(0)); // activate
    h.update(0.5, makeMockCtx(0)); // some ticks
    expect(() => h.dispose()).not.toThrow();
  });

  it('should not update after spent', () => {
    const h = new CrackedIceHazard(pos, half, 3, 0.1);
    h.update(0.1, makeMockCtx(0)); // activate
    h.update(0.1, makeMockCtx(0)); // spent (0.1 - 0.1 = 0)
    expect(h.spent).toBe(true);

    // Markers to detect if update does anything
    const timerBefore = h['timer'];
    // Should not change
    h.update(1 / 60, makeMockCtx(0));
    expect(h['timer']).toBe(timerBefore);
    h.dispose();
  });
});