import { describe, it, expect } from 'vitest';
import { RoutePath } from '../gameplay/levels/RoutePath';

describe('RoutePath', () => {
  const waypoints = [
    { position: { x: 0, y: 0, z: 0 } },
    { position: { x: 10, y: 0, z: 0 } },
    { position: { x: 10, y: 0, z: 10 } },
  ];

  it('should throw if fewer than 2 waypoints', () => {
    expect(() => new RoutePath([{ position: { x: 0, y: 0, z: 0 } }])).toThrow();
    expect(() => new RoutePath([])).toThrow();
  });

  it('should compute total length for axis-aligned path', () => {
    const path = new RoutePath(waypoints);
    expect(path.totalLength).toBeCloseTo(20);
  });

  it('should compute total length for diagonal path', () => {
    const diagWaypoints = [
      { position: { x: 0, y: 0, z: 0 } },
      { position: { x: 3, y: 0, z: 4 } },
    ];
    const path = new RoutePath(diagWaypoints);
    expect(path.totalLength).toBeCloseTo(5);
  });

  it('should get position at start (t=0)', () => {
    const path = new RoutePath(waypoints);
    const pos = path.getPositionAtProgress(0);
    expect(pos.x).toBeCloseTo(0);
    expect(pos.y).toBeCloseTo(0);
    expect(pos.z).toBeCloseTo(0);
  });

  it('should get position at end (t=1)', () => {
    const path = new RoutePath(waypoints);
    const pos = path.getPositionAtProgress(1);
    expect(pos.x).toBeCloseTo(10);
    expect(pos.y).toBeCloseTo(0);
    expect(pos.z).toBeCloseTo(10);
  });

  it('should get position at midpoint (t=0.5)', () => {
    const path = new RoutePath(waypoints);
    const pos = path.getPositionAtProgress(0.5);
    expect(pos.x).toBeCloseTo(10);
    expect(pos.y).toBeCloseTo(0);
    expect(pos.z).toBeCloseTo(0);
  });

  it('should get position at quarter point (t=0.25)', () => {
    const path = new RoutePath(waypoints);
    const pos = path.getPositionAtProgress(0.25);
    expect(pos.x).toBeCloseTo(5);
    expect(pos.y).toBeCloseTo(0);
    expect(pos.z).toBeCloseTo(0);
  });

  it('should get position at three-quarter point (t=0.75)', () => {
    const path = new RoutePath(waypoints);
    const pos = path.getPositionAtProgress(0.75);
    expect(pos.x).toBeCloseTo(10);
    expect(pos.y).toBeCloseTo(0);
    expect(pos.z).toBeCloseTo(5);
  });

  it('should handle t<0 as start position', () => {
    const path = new RoutePath(waypoints);
    const pos = path.getPositionAtProgress(-0.5);
    expect(pos.x).toBeCloseTo(0);
  });

  it('should handle t>1 as end position', () => {
    const path = new RoutePath(waypoints);
    const pos = path.getPositionAtProgress(1.5);
    expect(pos.x).toBeCloseTo(10);
    expect(pos.z).toBeCloseTo(10);
  });

  it('should find closest progress for point exactly on path', () => {
    const path = new RoutePath(waypoints);
    const t = path.getClosestProgress({ x: 5, y: 0, z: 0 });
    expect(t).toBeCloseTo(0.25);
  });

  it('should find closest progress for point near end of first segment', () => {
    const path = new RoutePath(waypoints);
    const t = path.getClosestProgress({ x: 9, y: 0.5, z: 0 });
    expect(t).toBeGreaterThan(0.4);
    expect(t).toBeLessThan(0.5);
  });

  it('should find closest progress for point near start', () => {
    const path = new RoutePath(waypoints);
    const t = path.getClosestProgress({ x: 0, y: 1, z: 0 });
    expect(t).toBeCloseTo(0);
  });

  it('should find closest progress for point near end', () => {
    const path = new RoutePath(waypoints);
    const t = path.getClosestProgress({ x: 10, y: 1, z: 9 });
    expect(t).toBeGreaterThan(0.9);
    expect(t).toBeLessThanOrEqual(1);
  });

  it('should handle points with Y variation', () => {
    const path = new RoutePath(waypoints);
    const t = path.getClosestProgress({ x: 5, y: 3, z: 5 });
    // Point (5, 3, 5) is closest to (5, 0, 0) — the midpoint of the first segment
    // which is at progress 0.25
    expect(t).toBeCloseTo(0.25, 2);
  });

  it('should create path from DogWaypoint array', () => {
    const dogWaypoints = [
      { position: { x: 0, y: 0, z: 0 }, waitTime: 1 },
      { position: { x: 5, y: 0, z: 0 }, waitTime: 0.5 },
    ];
    const path = new RoutePath(dogWaypoints);
    expect(path.totalLength).toBeCloseTo(5);
  });
});