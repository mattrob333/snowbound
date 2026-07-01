import * as THREE from 'three';
import { Pickup } from './Pickup';
import type { PhysicsWorld } from '../../engine/physics/PhysicsWorld';
import type { ThreeRenderer } from '../../engine/rendering/ThreeRenderer';
import type { Vec3 } from '../levels/LevelData';

/**
 * HelicopterPartPickup — a glowing pickup that represents a helicopter part
 * the player must collect to complete the level.
 */
export class HelicopterPartPickup extends Pickup {
  readonly partId: string;

  constructor(
    physics: PhysicsWorld,
    renderer: ThreeRenderer | null,
    position: Vec3,
    partId: string,
  ) {
    super(physics, renderer, position);
    this.partId = partId;

    // Distinct pickup sound for helicopter parts
    this.soundKey = 'helicopter_part';

    // Glowing rotating cube as placeholder visual
    const geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffdd44,
      emissive: 0x442200,
      emissiveIntensity: 0.5,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(position.x, position.y, position.z);
    this.mesh.rotation.y = Math.random() * Math.PI * 2;

    if (this.renderer) {
      this.renderer.scene.add(this.mesh);
    }
  }

  override update(_dt: number, _ctx: import('../../app/GameContext').GameContext): void {
    // Slow rotation animation
    if (this.mesh && !this.collected) {
      this.mesh.rotation.y += 0.02;
    }
    // Let the base class handle proximity detection
    super.update(_dt, _ctx);
  }
}