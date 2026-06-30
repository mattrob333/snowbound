import type { DogWaypoint, Vec3 } from './LevelData';

/**
 * RoutePath — a path along waypoints that the dog patrols/chases along.
 * Player progress is tracked by projecting their position onto the route.
 */
export class RoutePath {
  readonly waypoints: DogWaypoint[];

  constructor(waypoints: DogWaypoint[]) {
    if (waypoints.length < 2) {
      throw new Error('RoutePath requires at least 2 waypoints');
    }
    this.waypoints = waypoints;
  }

  /** Total length of the path (sum of segments) */
  get totalLength(): number {
    let total = 0;
    for (let i = 1; i < this.waypoints.length; i++) {
      total += this.distanceBetween(this.waypoints[i - 1].position, this.waypoints[i].position);
    }
    return total;
  }

  /** Get the position at a normalised progress value (0 = start, 1 = end) */
  getPositionAtProgress(t: number): Vec3 {
    if (t <= 0) return { ...this.waypoints[0].position };
    if (t >= 1) return { ...this.waypoints[this.waypoints.length - 1].position };

    const targetDist = t * this.totalLength;
    let accumulated = 0;

    for (let i = 1; i < this.waypoints.length; i++) {
      const segLen = this.distanceBetween(this.waypoints[i - 1].position, this.waypoints[i].position);
      if (accumulated + segLen >= targetDist) {
        const segT = (targetDist - accumulated) / segLen;
        return this.lerpVec3(this.waypoints[i - 1].position, this.waypoints[i].position, segT);
      }
      accumulated += segLen;
    }

    return { ...this.waypoints[this.waypoints.length - 1].position };
  }

  /** Find the closest point on the route to a given world position, returning progress (0-1) */
  getClosestProgress(worldPos: Vec3): number {
    if (this.waypoints.length < 2) return 0;

    let bestT = 0;
    let bestDist = Infinity;
    let accumulated = 0;
    const total = this.totalLength;

    for (let i = 1; i < this.waypoints.length; i++) {
      const a = this.waypoints[i - 1].position;
      const b = this.waypoints[i].position;
      const segLen = this.distanceBetween(a, b);
      const closest = this.closestPointOnSegment(worldPos, a, b);

      const dist = this.distanceBetween(worldPos, closest);
      let segT: number;
      if (segLen < 0.001) {
        segT = 0;
      } else {
        const dx = closest.x - a.x;
        const dy = closest.y - a.y;
        const dz = closest.z - a.z;
        segT = Math.sqrt(dx * dx + dy * dy + dz * dz) / segLen;
      }
      const worldT = (accumulated + segT * segLen) / total;

      if (dist < bestDist) {
        bestDist = dist;
        bestT = Math.max(0, Math.min(1, worldT));
      }
      accumulated += segLen;
    }

    return bestT;
  }

  // ---- Private helpers ----

  private distanceBetween(a: Vec3, b: Vec3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    };
  }

  private closestPointOnSegment(p: Vec3, a: Vec3, b: Vec3): Vec3 {
    const abX = b.x - a.x;
    const abY = b.y - a.y;
    const abZ = b.z - a.z;
    const apX = p.x - a.x;
    const apY = p.y - a.y;
    const apZ = p.z - a.z;
    const dot = apX * abX + apY * abY + apZ * abZ;
    const lenSq = abX * abX + abY * abY + abZ * abZ;
    let t = lenSq > 0 ? dot / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    return {
      x: a.x + abX * t,
      y: a.y + abY * t,
      z: a.z + abZ * t,
    };
  }
}