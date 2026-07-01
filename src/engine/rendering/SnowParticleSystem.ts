import * as THREE from 'three';

/**
 * SnowParticleSystem — falling snow particle effect using Three.js Points.
 *
 * Creates a large volume of slowly falling white particles within a bounding
 * box that follows the camera. Efficient for outdoor scenes with constant snow.
 */
export class SnowParticleSystem {
  private particleCount: number;
  private boxWidth: number;
  private boxHeight: number;
  private boxDepth: number;
  private fallSpeed: number;
  private driftSpeed: number;

  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.PointsMaterial | null = null;
  private points: THREE.Points | null = null;
  private positions: Float32Array | null = null;
  private velocities: Float32Array | null = null;
  private scene: THREE.Scene | null = null;

  constructor(options?: {
    particleCount?: number;
    boxWidth?: number;
    boxHeight?: number;
    boxDepth?: number;
    fallSpeed?: number;
    driftSpeed?: number;
  }) {
    this.particleCount = options?.particleCount ?? 2000;
    this.boxWidth = options?.boxWidth ?? 40;
    this.boxHeight = options?.boxHeight ?? 20;
    this.boxDepth = options?.boxDepth ?? 40;
    this.fallSpeed = options?.fallSpeed ?? 1.2;
    this.driftSpeed = options?.driftSpeed ?? 0.3;
  }

  /** Initialise the particle system and add it to the scene */
  init(scene: THREE.Scene): void {
    this.scene = scene;

    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      this.resetParticle(i, true);
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    // Create a small white circle texture for the sprite
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 16, 16);
    const texture = new THREE.CanvasTexture(canvas);

    this.material = new THREE.PointsMaterial({
      size: 0.4,
      map: texture,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  /** Update particle positions each frame */
  update(dt: number, cameraPosition: THREE.Vector3): void {
    if (!this.positions || !this.velocities) return;

    const halfW = this.boxWidth / 2;
    const halfD = this.boxDepth / 2;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      // Fall down
      this.positions[idx + 1] -= this.fallSpeed * dt;

      // Horizontal drift (sinusoidal)
      this.positions[idx] += Math.sin(this.driftSpeed * dt + i) * 0.02;
      this.positions[idx + 2] += Math.cos(this.driftSpeed * dt + i * 0.7) * 0.02;

      // Check if particle has fallen below the box — reset to top
      if (this.positions[idx + 1] < cameraPosition.y - 5) {
        this.resetParticle(i, false, cameraPosition);
      }

      // If particle has drifted too far horizontally, wrap
      const dx = this.positions[idx] - cameraPosition.x;
      const dz = this.positions[idx + 2] - cameraPosition.z;
      if (Math.abs(dx) > halfW) {
        this.positions[idx] = cameraPosition.x + (dx > 0 ? -halfW : halfW);
      }
      if (Math.abs(dz) > halfD) {
        this.positions[idx + 2] = cameraPosition.z + (dz > 0 ? -halfD : halfD);
      }
    }

    this.geometry!.attributes.position.needsUpdate = true;
  }

  /** Remove the particle system from the scene and dispose resources */
  dispose(): void {
    if (this.points && this.scene) {
      this.scene.remove(this.points);
    }
    this.geometry?.dispose();
    this.material?.dispose();
    this.points = null;
    this.geometry = null;
    this.material = null;
    this.positions = null;
    this.velocities = null;
    this.scene = null;
  }

  /** Reset a single particle to the top of the bounding box */
  private resetParticle(
    i: number,
    randomY: boolean,
    cameraPosition?: THREE.Vector3,
  ): void {
    const pos = this.positions;
    const vel = this.velocities;
    if (!pos || !vel) return;

    const idx = i * 3;
    const cx = cameraPosition?.x ?? 0;
    const cy = cameraPosition?.y ?? 10;
    const cz = cameraPosition?.z ?? 0;
    const halfW = this.boxWidth / 2;
    const halfD = this.boxDepth / 2;

    pos[idx] = cx + (Math.random() - 0.5) * this.boxWidth;
    pos[idx + 1] = randomY
      ? Math.random() * this.boxHeight + cy - this.boxHeight / 2
      : cy + this.boxHeight / 2 + Math.random() * 2;
    pos[idx + 2] = cz + (Math.random() - 0.5) * this.boxDepth;

    // Constrain to box
    pos[idx] = Math.max(cx - halfW, Math.min(cx + halfW, pos[idx]));
    pos[idx + 2] = Math.max(cz - halfD, Math.min(cz + halfD, pos[idx + 2]));

    vel[i] = 0.5 + Math.random() * 0.5;
  }
}