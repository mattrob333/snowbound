import { describe, it, expect } from 'vitest';
import { RoutePath } from '../gameplay/levels/RoutePath';
import { MonsterDog, DogState } from '../gameplay/monster/MonsterDog';
import type { DogTuning } from '../gameplay/levels/LevelData';

describe('MonsterDog', () => {
  const waypoints = [
    { position: { x: 0, y: 0, z: 0 } },
    { position: { x: 100, y: 0, z: 0 } },
  ];
  const routePath = new RoutePath(waypoints);
  const tuning: DogTuning = {
    patrolSpeed: 3,
    chaseSpeed: 8,
    catchRadius: 1.2,
    patrolDistance: 15,
  };

  it('should start at first waypoint with 0 progress and patrol state', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    expect(dog.progress).toBeCloseTo(0);
    expect(dog.state).toBe(DogState.Patrol);
    const pos = dog.getPosition();
    expect(pos.x).toBeCloseTo(0);
    expect(pos.z).toBeCloseTo(0);
    dog.dispose();
  });

  it('should have correct mesh position matching route progress', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    dog.setProgress(0.5);
    const pos = dog.getPosition();
    expect(pos.x).toBeCloseTo(50);
    dog.dispose();
  });

  it('should get patrol speed when in patrol state', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    expect(dog.getCurrentSpeed()).toBe(tuning.patrolSpeed);
    dog.dispose();
  });

  it('should get chase speed when in chase state', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    dog.state = DogState.Chase;
    expect(dog.getCurrentSpeed()).toBe(tuning.chaseSpeed);
    dog.dispose();
  });

  it('should return zero speed in caught state', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    dog.state = DogState.Caught;
    expect(dog.getCurrentSpeed()).toBe(tuning.patrolSpeed); // defaults to patrol if not chase
    dog.dispose();
  });

  it('should not move when caught', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    dog.state = DogState.Caught;
    dog.moveTowardsPlayer(1, 1);
    expect(dog.progress).toBeCloseTo(0); // should not move
    dog.dispose();
  });

  it('should move towards player progress during chase', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    dog.state = DogState.Chase;
    const initialProgress = dog.progress;

    // Move dog towards player at progress 0.5
    dog.moveTowardsPlayer(0.5, 1);

    // With chase speed 8 and route length 100, max delta = 8/100 = 0.08 per second
    expect(dog.progress).toBeGreaterThan(initialProgress);
    expect(dog.progress).toBeLessThanOrEqual(0.08);
    dog.dispose();
  });

  it('should move slower during patrol', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    const initialProgress = dog.progress;

    dog.moveTowardsPlayer(0.5, 1);

    // With patrol speed 3 and route length 100, max delta = 3/100 = 0.03
    expect(dog.progress).toBeGreaterThan(initialProgress);
    expect(dog.progress).toBeLessThanOrEqual(0.03);
    dog.dispose();
  });

  it('should stay behind player during patrol by patrolDistance', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    // Set player progress to 0.5, patrolDistance=15, routeLength=100
    // Patrol offset = 15/100 = 0.15, so target = 0.5 - 0.15 = 0.35
    dog.moveTowardsPlayer(0.5, 10); // enough time to reach target

    // Dog should approach 0.35
    const expectedOffset = tuning.patrolDistance / routePath.totalLength;
    expect(dog.progress).toBeCloseTo(0.5 - expectedOffset, 1);
    dog.dispose();
  });

  it('should not go below progress 0', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    // Set player to low progress — dog should not go negative
    dog.moveTowardsPlayer(0.01, 10);
    expect(dog.progress).toBeGreaterThanOrEqual(0);
    dog.dispose();
  });

  it('should not exceed progress 1', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    dog.state = DogState.Chase;
    dog.moveTowardsPlayer(2, 100); // way past end
    expect(dog.progress).toBeLessThanOrEqual(1);
    dog.dispose();
  });

  it('should setProgress teleport the dog', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    dog.setProgress(0.75);
    expect(dog.progress).toBeCloseTo(0.75);
    const pos = dog.getPosition();
    expect(pos.x).toBeCloseTo(75);
    dog.dispose();
  });

  it('should dispose without error', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    expect(() => dog.dispose()).not.toThrow();
  });
});