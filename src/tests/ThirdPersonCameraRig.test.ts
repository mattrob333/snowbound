import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ThirdPersonCameraRig } from '../engine/camera/ThirdPersonCameraRig';

describe('ThirdPersonCameraRig', () => {
  const target = new THREE.Object3D();
  target.position.set(0, 1, 0);

  it('should create with default settings', () => {
    const camera = new THREE.PerspectiveCamera(65, 16 / 9, 0.1, 100);
    const rig = new ThirdPersonCameraRig(camera);
    expect(rig).toBeDefined();
  });

  it('should follow a target position', () => {
    const camera = new THREE.PerspectiveCamera(65, 16 / 9, 0.1, 100);
    const rig = new ThirdPersonCameraRig(camera);

    rig.update(0, target.position);

    // Camera should be behind and above the target
    expect(camera.position.distanceTo(target.position)).toBeGreaterThan(3);
  });

  it('should orbit around target when azimuth changes', () => {
    const camera = new THREE.PerspectiveCamera(65, 16 / 9, 0.1, 100);
    const rig = new ThirdPersonCameraRig(camera);

    // Update once to set position
    rig.update(0, target.position);
    const pos1 = camera.position.clone();

    // Orbit 90 degrees
    rig.setAzimuth(rig.azimuth + Math.PI / 2);
    rig.update(0, target.position);
    const pos2 = camera.position.clone();

    // Should be different position
    expect(pos1.distanceTo(pos2)).toBeGreaterThan(1);
  });

  it('should snap to target position after teleport', () => {
    const camera = new THREE.PerspectiveCamera(65, 16 / 9, 0.1, 100);
    const rig = new ThirdPersonCameraRig(camera);

    rig.teleport(target.position);
    const pos = camera.position.clone();

    expect(pos.distanceTo(target.position)).toBeGreaterThan(3);
  });
});