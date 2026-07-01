import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Hazard } from './Hazard';
import type { GameContext } from '../../app/GameContext';
import { CollisionGroups } from '../../engine/physics/CollisionGroups';

/**
 * FallingIceHazard — a trigger zone on the ground that drops a block
 * of ice from above after a brief delay when the player walks through it.
 *
 * Visual: the level JSON provides a static box for the trigger indicator.
 * The falling ice block is created dynamically when triggered.
 */
export class FallingIceHazard extends Hazard {
  private iceMesh: THREE.Mesh | null = null;
  private iceBody: RAPIER.RigidBody | null = null;
  private rendererScene: THREE.Scene | null = null;
  private physics: { removeRigidBody: (b: RAPIER.RigidBody) => void } | null = null;

  /** Height above the trigger position from which the ice falls */
  private fallHeight: number;
  /** Delay before the ice drops (seconds) */
  private fallDelay: number;
  /** Timer counting down to the drop */
  private timer: number = 0;
  /** Size of the falling ice block (half-extents) */
  private iceHalf: { x: number; y: number; z: number };
  /** Whether the ice block is currently falling */
  private falling = false;

  constructor(
    position: { x: number; y: number; z: number },
    halfExtents: { x: number; y: number; z: number },
    triggerRadius?: number,
    fallDelay?: number,
  ) {
    super('falling_ice', position, halfExtents, triggerRadius ?? 2);
    this.fallDelay = fallDelay ?? 1.0;
    this.fallHeight = 10;
    // Ice block same width/depth as trigger zone, slightly thinner
    this.iceHalf = {
      x: halfExtents.x,
      y: halfExtents.y * 0.5,
      z: halfExtents.z,
    };
  }

  protected onPlayerEnter(_ctx: GameContext): void {
    this.timer = this.fallDelay;
  }

  protected onActiveUpdate(dt: number, ctx: GameContext): void {
    if (this.spent) return;

    if (!this.falling) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.createIceBlock(ctx);
        this.falling = true;
      }
      return;
    }

    // When the ice block hits the ground, mark spent and signal major hazard
    if (this.iceBody) {
      const pos = this.iceBody.translation();
      if (pos.y <= this.position.y + this.iceHalf.y + 0.1) {
        this.falling = false;
        this.spent = true;
        this.onMajorHazard?.();
      }
    }
  }

  private createIceBlock(ctx: GameContext): void {
    this.physics = ctx.physics;
    this.rendererScene = ctx.renderer.scene;

    // Create visual mesh — jagged ice block
    const geo = new THREE.IcosahedronGeometry(
      Math.max(this.iceHalf.x, this.iceHalf.z) * 0.8,
      1,
    );
    const mat = new THREE.MeshStandardMaterial({
      color: 0xaaddff,
      roughness: 0.3,
      metalness: 0.1,
      emissive: 0x224466,
      emissiveIntensity: 0.1,
    });
    this.iceMesh = new THREE.Mesh(geo, mat);
    this.iceMesh.scale.set(
      this.iceHalf.x / 0.8,
      this.iceHalf.y / 0.8,
      this.iceHalf.z / 0.8,
    );
    this.iceMesh.position.set(
      this.position.x,
      this.position.y + this.fallHeight,
      this.position.z,
    );
    this.iceMesh.castShadow = true;
    this.rendererScene.add(this.iceMesh);

    // Create physics body — dynamic, falls with gravity
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(
        this.position.x,
        this.position.y + this.fallHeight,
        this.position.z,
      );
    this.iceBody = ctx.physics.addRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      this.iceHalf.x,
      this.iceHalf.y,
      this.iceHalf.z,
    )
      .setCollisionGroups(CollisionGroups.Hazard)
      .setRestitution(0.1);
    ctx.physics.addCollider(colliderDesc, this.iceBody);
  }

  dispose(): void {
    if (this.iceMesh && this.rendererScene) {
      this.rendererScene.remove(this.iceMesh);
      this.iceMesh.geometry.dispose();
      if (Array.isArray(this.iceMesh.material)) {
        for (const m of this.iceMesh.material) m.dispose();
      } else if (this.iceMesh.material) {
        this.iceMesh.material.dispose();
      }
    }
    if (this.iceBody && this.physics) {
      this.physics.removeRigidBody(this.iceBody);
    }
    this.spent = true;
  }
}