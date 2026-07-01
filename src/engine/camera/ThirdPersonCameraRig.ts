import * as THREE from 'three';

export class ThirdPersonCameraRig {
  readonly camera: THREE.PerspectiveCamera;
  private _azimuth = 0;
  private _elevation = Math.PI / 6; // 30 degrees above horizon
  private _distance = 5;
  private _target = new THREE.Vector3();
  private _smoothSpeed = 5;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  get azimuth(): number {
    return this._azimuth;
  }

  setAzimuth(radians: number): void {
    this._azimuth = radians;
  }

  setElevation(radians: number): void {
    this._elevation = Math.max(-0.3, Math.min(1.2, radians));
  }

  setDistance(d: number): void {
    this._distance = Math.max(1, d);
  }

  teleport(target: THREE.Vector3): void {
    this._target.copy(target);
    this._applyPosition();
  }

  update(dt: number, target: THREE.Vector3): void {
    // Frame-rate independent exponential smoothing
    const blend = 1 - Math.exp(-this._smoothSpeed * Math.max(dt, 0));
    this._target.lerp(target, blend);
    this._applyPosition();
    this.camera.lookAt(this._target);
  }

  private _applyPosition(): void {
    const offset = new THREE.Vector3(
      this._distance * Math.cos(this._azimuth) * Math.cos(this._elevation),
      this._distance * Math.sin(this._elevation),
      this._distance * Math.sin(this._azimuth) * Math.cos(this._elevation),
    );
    this.camera.position.copy(this._target).add(offset);
  }
}
