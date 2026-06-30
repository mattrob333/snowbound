import * as THREE from 'three';
import { CharacterKCC } from '../../engine/physics/CharacterKCC';
import { PlayerController } from './PlayerController';
import { ThirdPersonCameraRig } from '../../engine/camera/ThirdPersonCameraRig';
import type { PhysicsWorld } from '../../engine/physics/PhysicsWorld';
import type { GameContext } from '../../app/GameContext';
import { PLAYER_HEIGHT, PLAYER_RADIUS } from '../../config/constants';

export class Player {
  readonly mesh: THREE.Mesh;
  readonly kcc: CharacterKCC;
  readonly controller: PlayerController;
  private cameraRig: ThirdPersonCameraRig;

  constructor(physics: PhysicsWorld, cameraRig: ThirdPersonCameraRig) {
    this.kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    this.controller = new PlayerController(this.kcc);
    this.cameraRig = cameraRig;

    // Visual capsule placeholder
    const capsuleGeo = new THREE.CapsuleGeometry(PLAYER_RADIUS, PLAYER_HEIGHT - 2 * PLAYER_RADIUS, 8, 16);
    const capsuleMat = new THREE.MeshStandardMaterial({
      color: 0x44aaff,
      roughness: 0.6,
      metalness: 0.1,
    });
    this.mesh = new THREE.Mesh(capsuleGeo, capsuleMat);
    this.mesh.castShadow = true;
  }

  update(dt: number, ctx: GameContext): void {
    const input = ctx.input;
    const cameraAzimuth = this.cameraRig.azimuth;

    this.controller.update(dt, input, cameraAzimuth);

    // Sync visual mesh to physics body position
    const pos = this.kcc.getPosition();
    this.mesh.position.set(pos.x, pos.y - PLAYER_HEIGHT / 2, pos.z);

    // Update third-person camera to follow player
    const targetPos = new THREE.Vector3(pos.x, pos.y + 1.4, pos.z);
    this.cameraRig.update(dt, targetPos);
  }

  getCameraRig(): ThirdPersonCameraRig {
    return this.cameraRig;
  }
}