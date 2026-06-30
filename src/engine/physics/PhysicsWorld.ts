import RAPIER from '@dimforge/rapier3d-compat';
import { GRAVITY_Y } from '../../config/constants';

export class PhysicsWorld {
  world!: RAPIER.World;
  private initialized = false;

  async init(): Promise<void> {
    await RAPIER.init();
    const gravity = { x: 0, y: GRAVITY_Y, z: 0 };
    this.world = new RAPIER.World(gravity);
    this.initialized = true;
  }

  step(_dt: number): void {
    if (!this.initialized) return;
    this.world.step();
  }

  addRigidBody(desc: RAPIER.RigidBodyDesc): RAPIER.RigidBody {
    return this.world.createRigidBody(desc);
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