import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { PhysicsWorld } from '../../engine/physics/PhysicsWorld';
import type { ThreeRenderer } from '../../engine/rendering/ThreeRenderer';
import type { IGameEntity } from '../entities/EntityManager';
import type { GameContext } from '../../app/GameContext';
import type { Vec3 } from '../levels/LevelData';

/**
 * Base Pickup entity — a sensor body that detects player overlap
 * and fires an onCollect callback.
 */
export class Pickup implements IGameEntity {
  protected physics: PhysicsWorld;
  protected renderer: ThreeRenderer | null;
  protected body: RAPIER.RigidBody;
  protected mesh: THREE.Mesh | null = null;
  private _collected = false;

  /** Callback fired once when the player overlaps this pickup */
  onCollect: (() => void) | null = null;

  constructor(physics: PhysicsWorld, renderer: ThreeRenderer | null, position: Vec3) {
    this.physics = physics;
    this.renderer = renderer;

    // Create sensor body
    this.body = physics.addRigidBody(
      RAPIER.RigidBodyDesc.fixed()
        .setTranslation(position.x, position.y, position.z)
    );

    const colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)
      .setSensor(true)
      .setCollisionGroups(0x0001_0001); // Member: Player, Filter: Player
    physics.addCollider(colliderDesc, this.body);
  }

  get position(): Vec3 {
    const pos = this.body.translation();
    return { x: pos.x, y: pos.y, z: pos.z };
  }

  get collected(): boolean {
    return this._collected;
  }

  update(_dt: number, _ctx: GameContext): void {
    // Subclasses override to add per-frame logic (e.g., rotation animation)
  }

  /** Mark as collected. Subclasses can add effects. */
  collect(): void {
    if (this._collected) return;
    this._collected = true;
    this.onCollect?.();

    // Hide the mesh
    if (this.mesh) {
      this.mesh.visible = false;
    }
  }

  dispose(): void {
    if (this.mesh && this.renderer) {
      this.renderer.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      if (Array.isArray(this.mesh.material)) {
        for (const m of this.mesh.material) m.dispose();
      } else if (this.mesh.material) {
        this.mesh.material.dispose();
      }
    }
    this.physics.removeRigidBody(this.body);
  }
}