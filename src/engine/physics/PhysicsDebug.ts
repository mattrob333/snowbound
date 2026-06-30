import type { PhysicsWorld } from './PhysicsWorld';
import * as THREE from 'three';

export class PhysicsDebug {
  private meshGroup: THREE.Group;
  private enabled = false;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.meshGroup = new THREE.Group();
  }

  init(): void {
    this.scene.add(this.meshGroup);
    this.enabled = true;
  }

  /** Add a visual wireframe box for a debug collider */
  addDebugBox(
    position: { x: number; y: number; z: number },
    halfExtents: { x: number; y: number; z: number },
    color = 0x00ff88,
  ): void {
    if (!this.enabled) return;
    const geo = new THREE.BoxGeometry(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2);
    const mat = new THREE.MeshBasicMaterial({ color, wireframe: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(position.x, position.y, position.z);
    this.meshGroup.add(mesh);
  }

  /** Sync visual debug meshes to physics state */
  syncFrom(_physics: PhysicsWorld): void {
    // Future: iterate physics bodies and update wireframes
  }

  setVisible(visible: boolean): void {
    this.meshGroup.visible = visible;
  }

  dispose(): void {
    this.scene.remove(this.meshGroup);
  }
}