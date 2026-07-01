import * as THREE from 'three';

/**
 * CameraShake — screen shake effect for impacts, hazards, and explosions.
 *
 * Applies a decaying random offset to the camera's position over time.
 * Supports multiple simultaneous shake intensities (the highest wins).
 */
export class CameraShake {
  private intensity = 0;
  private decayRate = 2.0; // units per second

  /** Set decay rate (higher = faster recovery) */
  setDecayRate(rate: number): void {
    this.decayRate = rate;
  }

  /** Trigger a shake at a given intensity (0-1 scale, where 1 is severe) */
  trigger(intensity: number): void {
    this.intensity = Math.max(this.intensity, Math.min(1, intensity));
  }

  /** Reset shake immediately */
  clear(): void {
    this.intensity = 0;
  }

  /** Get the current shake offset to apply to the camera */
  getOffset(dt: number): THREE.Vector3 {
    if (this.intensity <= 0) {
      return new THREE.Vector3(0, 0, 0);
    }

    const maxShake = this.intensity * 0.5; // max 0.5 units displacement
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 2 * maxShake,
      (Math.random() - 0.5) * 2 * maxShake,
      (Math.random() - 0.5) * 2 * maxShake,
    );

    // Decay
    this.intensity = Math.max(0, this.intensity - this.decayRate * dt);

    return offset;
  }

  /** Whether the camera is currently shaking */
  get isShaking(): boolean {
    return this.intensity > 0;
  }
}