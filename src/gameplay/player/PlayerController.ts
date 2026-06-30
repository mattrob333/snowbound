import * as THREE from 'three';
import { CharacterKCC } from '../../engine/physics/CharacterKCC';
import { InputManager } from '../../engine/input/InputManager';
import { ControlAction } from '../../config/controls';
import { PLAYER_TUNING } from '../../config/tuning';

export class PlayerController {
  private kcc: CharacterKCC;
  private forward = new THREE.Vector3();
  private right = new THREE.Vector3();
  private moveDir = new THREE.Vector3();
  private velocityY = 0;
  private _isSprinting = false;
  private _isJumping = false;

  constructor(kcc: CharacterKCC) {
    this.kcc = kcc;
  }

  update(dt: number, input: InputManager, cameraAzimuth: number): void {
    // Camera-relative movement directions
    this.forward.set(-Math.sin(cameraAzimuth), 0, -Math.cos(cameraAzimuth));
    this.right.set(this.forward.z, 0, -this.forward.x);

    // Read input
    const moveX =
      (input.isKeyDown(ControlAction.StrafeRight) ? 1 : 0) -
      (input.isKeyDown(ControlAction.StrafeLeft) ? 1 : 0);
    const moveZ =
      (input.isKeyDown(ControlAction.MoveForward) ? 1 : 0) -
      (input.isKeyDown(ControlAction.MoveBackward) ? 1 : 0);
    this._isSprinting = input.isKeyDown(ControlAction.Sprint);

    // Build movement direction
    this.moveDir.set(0, 0, 0);
    this.moveDir.addScaledVector(this.right, moveX);
    this.moveDir.addScaledVector(this.forward, moveZ);
    if (this.moveDir.lengthSq() > 1) {
      this.moveDir.normalize();
    }

    const speed = this._isSprinting
      ? PLAYER_TUNING.sprintSpeed
      : (moveX !== 0 || moveZ !== 0 ? PLAYER_TUNING.runSpeed : 0);
    const isGrounded = this.kcc.isGrounded();

    // Jump
    if (input.isKeyPressed(ControlAction.Jump) && isGrounded) {
      this.velocityY = PLAYER_TUNING.jumpVelocity;
      this._isJumping = true;
    }

    // Apply gravity
    if (!isGrounded) {
      this.velocityY += PLAYER_TUNING.gravity * dt;
    }

    // Build movement vector
    const translation = {
      x: this.moveDir.x * speed * dt,
      y: this.velocityY * dt,
      z: this.moveDir.z * speed * dt,
    };

    // Compute collision-adjusted movement via KCC
    this.kcc.computeMovement(translation, dt);

    // Land
    if (this.kcc.isGrounded() && this.velocityY < 0) {
      this.velocityY = 0;
      this._isJumping = false;
    }

    this.kcc.applyMovement();
  }

  isSprinting(): boolean {
    return this._isSprinting;
  }

  isJumping(): boolean {
    return this._isJumping;
  }
}