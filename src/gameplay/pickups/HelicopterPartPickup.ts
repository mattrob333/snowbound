import * as THREE from 'three';
import { Pickup } from './Pickup';
import type { PhysicsWorld } from '../../engine/physics/PhysicsWorld';
import type { ThreeRenderer } from '../../engine/rendering/ThreeRenderer';
import type { Vec3 } from '../levels/LevelData';

/**
 * HelicopterPartPickup — a glowing pickup that represents a helicopter part
 * the player must collect to complete the level. A vertical light beam makes
 * it easy to spot from anywhere in the level.
 */
export class HelicopterPartPickup extends Pickup {
  readonly partId: string;
  private baseY: number;
  private time = Math.random() * Math.PI * 2;

  constructor(
    physics: PhysicsWorld,
    renderer: ThreeRenderer | null,
    position: Vec3,
    partId: string,
  ) {
    super(physics, renderer, position);
    this.partId = partId;
    this.baseY = position.y;

    // Distinct pickup sound for helicopter parts
    this.soundKey = 'helicopter_part';

    // Glowing rotating cube
    const geometry = new THREE.BoxGeometry(0.45, 0.45, 0.45);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffdd44,
      emissive: 0xffaa00,
      emissiveIntensity: 1.2,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.position.set(position.x, position.y, position.z);
    this.mesh.rotation.y = Math.random() * Math.PI * 2;

    // Vertical beacon beam so the objective is visible across the level
    const beamGeo = new THREE.CylinderGeometry(0.3, 0.55, 24, 12, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffcc55,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 12;
    this.mesh.add(beam);

    // Warm glow on the surrounding snow
    const glow = new THREE.PointLight(0xffcc55, 2.5, 9, 1.6);
    glow.position.y = 0.6;
    this.mesh.add(glow);

    if (this.renderer) {
      this.renderer.scene.add(this.mesh);
    }
  }

  override update(_dt: number, _ctx: import('../../app/GameContext').GameContext): void {
    // Spin and bob so the part sparkles in view
    if (this.mesh && !this.collected) {
      this.time += _dt;
      this.mesh.rotation.y += 1.2 * _dt;
      this.mesh.position.y = this.baseY + Math.sin(this.time * 2.2) * 0.18;
    }
    // Let the base class handle proximity detection
    super.update(_dt, _ctx);
  }

  override dispose(): void {
    // Dispose beacon children the base class doesn't know about
    if (this.mesh) {
      for (const child of [...this.mesh.children]) {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
        this.mesh.remove(child);
      }
    }
    super.dispose();
  }
}
