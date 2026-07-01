import { describe, it, expect } from 'vitest';
import { MonsterChaseDirector } from '../gameplay/monster/MonsterChaseDirector';
import { RoutePath } from '../gameplay/levels/RoutePath';
import { DogAnimationState } from '../gameplay/monster/MonsterAnimationController';
import type { DogTuning, DogWaypoint } from '../gameplay/levels/LevelData';

describe('MonsterChaseDirector', () => {
  const waypoints: DogWaypoint[] = [
    { position: { x: 0, y: 0, z: 0 } },
    { position: { x: 100, y: 0, z: 0 } },
  ];
  const tuning: DogTuning = {
    patrolSpeed: 3,
    chaseSpeed: 8,
    catchRadius: 1.2,
    patrolDistance: 15,
  };

  function makeMockCtx(playerX: number, partCollected: boolean) {
    return {
      player: {
        kcc: {
          getPosition: () => ({ x: playerX, y: 0, z: 0 }),
        },
        partCollected,
      },
      clock: { delta: 1 / 60, elapsed: 0 },
      levelManager: {} as any,
      renderer: {} as any,
      physics: {} as any,
      input: {} as any,
      entityManager: {} as any,
      assets: {} as any,
      audio: {} as any,
      saveService: {} as any,
      debug: {} as any,
    } as any;
  }

  it('should start in patrol mode with chase inactive', () => {
    const director = new MonsterChaseDirector(waypoints, tuning, null);
    expect(director.chaseActive).toBe(false);
    expect(director.caught).toBe(false);
    expect(director.complete).toBe(false);
    expect(director.dog.state).toBe('patrol');
    director.dispose();
  });

  it('should create a valid RoutePath from waypoints', () => {
    const director = new MonsterChaseDirector(waypoints, tuning, null);
    expect(director.routePath).toBeInstanceOf(RoutePath);
    expect(director.routePath.totalLength).toBeCloseTo(100);
    director.dispose();
  });

  it('should trigger chase when player collects part', () => {
    const director = new MonsterChaseDirector(waypoints, tuning, null);

    // Player at x=50, part not collected yet
    director.update(1 / 60, makeMockCtx(50, false));
    expect(director.chaseActive).toBe(false);

    // Now player has collected the part
    director.update(1 / 60, makeMockCtx(50, true));
    expect(director.chaseActive).toBe(true);
    expect(director.dog.state).toBe('chase');
    director.dispose();
  });

  it('should catch the player when dog reaches them during chase', () => {
    const director = new MonsterChaseDirector(waypoints, tuning, null);
    let caught = false;
    director.onCatchPlayer = () => { caught = true; };

    // Trigger chase by collecting part
    director.update(1 / 60, makeMockCtx(50, true));
    expect(director.chaseActive).toBe(true);

    // Teleport dog close to player progress
    director.dog.setProgress(0.5); // player is at x=50, progress ~0.5
    director.playerProgress = 0.5;

    // Next update should catch
    director.update(1 / 60, makeMockCtx(50, true));
    expect(director.caught).toBe(true);
    expect(caught).toBe(true);
    director.dispose();
  });

  it('should not trigger chase more than once', () => {
    const director = new MonsterChaseDirector(waypoints, tuning, null);

    director.update(1 / 60, makeMockCtx(50, true));
    expect(director.chaseActive).toBe(true);

    // Second trigger should be no-op
    director.startChase();
    expect(director.chaseActive).toBe(true);
    director.dispose();
  });

  it('should not catch player when dog is far away', () => {
    const director = new MonsterChaseDirector(waypoints, tuning, null);

    director.update(1 / 60, makeMockCtx(50, true));
    expect(director.chaseActive).toBe(true);

    // Dog is still at progress ~0.05 (moved a tiny bit from 0), player at 0.5
    // Gap = (0.5 - 0.05) * 100 = 45, much larger than catchRadius 1.2
    director.update(1 / 60, makeMockCtx(50, true));
    expect(director.caught).toBe(false);
    director.dispose();
  });

  it('should set closeWarning when dog is within threshold', () => {
    const director = new MonsterChaseDirector(waypoints, tuning, null);

    director.update(1 / 60, makeMockCtx(50, true));

    // Teleport dog close enough for warning but not caught
    director.dog.setProgress(0.48); // gap = (0.5 - 0.48) * 100 = 2, <= 8 (close) but > 1.2
    director.playerProgress = 0.5;

    director.update(1 / 60, makeMockCtx(50, true));
    expect(director.closeWarning).toBe(true);
    expect(director.caught).toBe(false);
    director.dispose();
  });

  it('should stop updating after caught', () => {
    const director = new MonsterChaseDirector(waypoints, tuning, null);
    director.update(1 / 60, makeMockCtx(50, true));
    director.dog.setProgress(0.5);
    director.playerProgress = 0.5;
    director.update(1 / 60, makeMockCtx(50, true));

    expect(director.caught).toBe(true);
    // Dog should now be in caught state
    expect(director.dog.state).toBe('caught');

    // Subsequent updates should not change state
    const dogProgress = director.dog.progress;
    director.update(1 / 60, makeMockCtx(50, true));
    expect(director.dog.progress).toBe(dogProgress);
    director.dispose();
  });

  it('should stop updating after complete', () => {
    const director = new MonsterChaseDirector(waypoints, tuning, null);
    director.complete = true;
    director.update(1 / 60, makeMockCtx(50, true));
    expect(director.chaseActive).toBe(false);
    expect(director.caught).toBe(false);
    director.dispose();
  });

  it('should set spawn position from a Vec3', () => {
    const director = new MonsterChaseDirector(waypoints, tuning, null);
    director.setSpawnPosition({ x: 30, y: 0, z: 0 });
    expect(director.dog.progress).toBeCloseTo(0.3, 1);
    director.dispose();
  });

  it('should clean up on dispose', () => {
    const director = new MonsterChaseDirector(waypoints, tuning, null);
    expect(() => director.dispose()).not.toThrow();
  });

  // ─── Animation integration tests ─────────────────────

  it('should set dog animation to Chase when chase starts', () => {
    const director = new MonsterChaseDirector(waypoints, tuning, null);
    expect(director.dog.animation.state).toBe(DogAnimationState.Patrol);

    director.update(1 / 60, makeMockCtx(50, true));
    expect(director.dog.animation.state).toBe(DogAnimationState.Chase);
    director.dispose();
  });

  it('should set dog animation to Catch when player is caught', () => {
    const director = new MonsterChaseDirector(waypoints, tuning, null);
    director.update(1 / 60, makeMockCtx(50, true));

    // Teleport dog to player position to trigger catch
    director.dog.setProgress(0.5);
    director.playerProgress = 0.5;
    director.update(1 / 60, makeMockCtx(50, true));

    expect(director.caught).toBe(true);
    expect(director.dog.animation.state).toBe(DogAnimationState.Catch);
    director.dispose();
  });

  it('should propagate close warning to dog animation', () => {
    const director = new MonsterChaseDirector(waypoints, tuning, null);
    director.update(1 / 60, makeMockCtx(50, true));

    // Place dog very close but not caught
    director.dog.setProgress(0.48);
    director.playerProgress = 0.5;
    director.update(1 / 60, makeMockCtx(50, true));

    expect(director.closeWarning).toBe(true);
    expect(director.dog.animation.closeWarning).toBe(true);
    director.dispose();
  });

  it('should advance dog animation progress over time', () => {
    const director = new MonsterChaseDirector(waypoints, tuning, null);
    // Before chase — animation is at Patrol, progress at 0
    expect(director.dog.animation.state).toBe(DogAnimationState.Patrol);
    expect(director.dog.animation.currentScale).toBe(1.0);

    // Trigger chase — sets animation to Chase and resets progress to 0
    director.update(1 / 60, makeMockCtx(50, true));
    expect(director.dog.animation.state).toBe(DogAnimationState.Chase);

    // After some time, scale should approach chase scale (1.2)
    const steps = 30; // 30 frames at 60fps = 0.5s
    for (let i = 0; i < steps; i++) {
      director.update(1 / 60, makeMockCtx(50, true));
    }

    const animScale = director.dog.animation.currentScale;
    expect(animScale).toBeGreaterThan(1.0);
    expect(animScale).toBeLessThanOrEqual(1.2);
    director.dispose();
  });
});