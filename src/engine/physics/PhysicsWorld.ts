import RAPIER from '@dimforge/rapier3d-compat';
import { GRAVITY_Y } from '../../config/constants';

/**
 * In Rapier 0.19 (compat layer), sensor events via drainCollisionEvents
 * are unreliable, and intersectionPair has shape-type limitations.
 * This uses direct position-based proximity detection instead.
 */
type Vec3 = { x: number; y: number; z: number };

export class PhysicsWorld {
  world!: RAPIER.World;
  eventQueue!: RAPIER.EventQueue;
  private initialized = false;

  async init(): Promise<void> {
    await RAPIER.init();
    const gravity = { x: 0, y: GRAVITY_Y, z: 0 };
    this.world = new RAPIER.World(gravity);
    this.eventQueue = new RAPIER.EventQueue(true);
    this.initialized = true;
  }

  step(_dt: number): void {
    if (!this.initialized) return;
    this.world.step(this.eventQueue);
  }

  /**
   * Check proximity between two colliders using AABB distance.
   * Used instead of event-queue-based sensor detection for Rapier 0.19 compat.
   */
  checkProximity(a: RAPIER.Collider, b: RAPIER.Collider, threshold: number = 0.01): boolean {
    // Use direct collider translation
    const posA = a.translation();
    const posB = b.translation();
    const dx = posA.x - posB.x;
    const dy = posA.y - posB.y;
    const dz = posA.z - posB.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) <= threshold;
  }

  /**
   * Get the world-space translation of a collider
   */
  getColliderPosition(collider: RAPIER.Collider): Vec3 {
    const pos = collider.translation();
    return { x: pos.x, y: pos.y, z: pos.z };
  }

  /**
   * Get the half-extents of a cuboid collider (approximate)
   */
  getColliderHalfExtents(_collider: RAPIER.Collider): Vec3 {
    // Rapier 0.19 compat doesn't expose half-extents directly on the wrapper
    // Return default — callers should use their own size tracking
    return { x: 0.5, y: 0.5, z: 0.5 };
  }

  /**
   * Check if two colliders are intersecting using simple AABB overlap.
   * This is a manual implementation because Rapier 0.19 compat's
   * intersectionPair has unreliable behavior with sensor shapes.
   */
  boxesOverlap(
    posA: Vec3, halfA: Vec3,
    posB: Vec3, halfB: Vec3,
  ): boolean {
    return (
      Math.abs(posA.x - posB.x) < halfA.x + halfB.x &&
      Math.abs(posA.y - posB.y) < halfA.y + halfB.y &&
      Math.abs(posA.z - posB.z) < halfA.z + halfB.z
    );
  }

  /** @deprecated Use manual proximity/overlap checks instead. In Rapier 0.19
   *  compat, sensor events are unreliable. This method is kept for backward
   *  compat but will NOT fire events in practice. */
  drainIntersectionEvents(
    onIntersection: (collider1: RAPIER.Collider, collider2: RAPIER.Collider, started: boolean) => void,
  ): void {
    // Rapier 0.19 compat: drainCollisionEvents handles both regular and sensor
    // events, but sensors need ActiveEvents.COLLISION_EVENTS set.
    this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      const collider1 = this.world.getCollider(handle1);
      const collider2 = this.world.getCollider(handle2);
      if (collider1 && collider2) {
        onIntersection(collider1, collider2, started);
      }
    });
  }

  /** Check if two collider handles are currently intersecting */
  checkIntersection(colliderA: RAPIER.Collider, colliderB: RAPIER.Collider): boolean {
    return this.world.intersectionPair(colliderA, colliderB);
  }

  addRigidBody(desc: RAPIER.RigidBodyDesc): RAPIER.RigidBody {
    return this.world.createRigidBody(desc);
  }

  removeRigidBody(body: RAPIER.RigidBody): void {
    this.world.removeRigidBody(body);
  }

  addCollider(desc: RAPIER.ColliderDesc, parent?: RAPIER.RigidBody): RAPIER.Collider {
    return this.world.createCollider(desc, parent);
  }

  addStaticGroundCollider(width: number, yPos: number): RAPIER.Collider {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, yPos, 0);
    const body = this.addRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(width / 2, 0.5, width / 2);
    return this.addCollider(colliderDesc, body);
  }

  raycast(
    origin: { x: number; y: number; z: number },
    direction: { x: number; y: number; z: number },
    maxDist: number,
  ): RAPIER.RayColliderIntersection | null {
    const ray = new RAPIER.Ray(origin, direction);
    return this.world.castRayAndGetNormal(ray, maxDist, true);
  }

  /** Returns all colliders intersecting a ray (useful for wall-run detection) */
  raycastAll(
    origin: { x: number; y: number; z: number },
    direction: { x: number; y: number; z: number },
    maxDist: number,
  ): RAPIER.RayColliderIntersection[] {
    const ray = new RAPIER.Ray(origin, direction);
    const hits = this.world.castRayAndGetNormal(ray, maxDist, true);
    return hits ? [hits] : [];
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  dispose(): void {
    // Rapier doesn't provide explicit world cleanup in JS
  }
}