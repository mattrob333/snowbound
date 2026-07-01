import * as THREE from 'three';
import { CharacterKCC } from '../../engine/physics/CharacterKCC';
import { InputManager } from '../../engine/input/InputManager';
import { ControlAction } from '../../config/controls';
import { PLAYER_TUNING } from '../../config/tuning';
import { SlideController } from './SlideController';
import { WallRunController } from './WallRunController';
import type { PhysicsWorld } from '../../engine/physics/PhysicsWorld';
import type { VoiceLineService } from '../../engine/audio/VoiceLineService';

const SLIDE_COLLIDER_HALF_HEIGHT = 0.15;

export class PlayerController {
  private kcc: CharacterKCC;
  private physics: PhysicsWorld | null;
  private slideController: SlideController | null;
  private wallRunController: WallRunController | null;
  private forward = new THREE.Vector3();
  private right = new THREE.Vector3();
  private moveDir = new THREE.Vector3();
  private velocityY = 0;
  private _isSprinting = false;
  private _isJumping = false;
  private wallJumpVelocityX = 0;
  private wallJumpVelocityZ = 0;
  /** Tracks collider state so we don't swap on every frame */
  private slideColliderActive = false;
  /** Voice line service (optional) — plays Jim's callouts on key actions */
  private voiceLines: VoiceLineService | null = null;
  /** Tracks previous sprint state to detect transitions */
  private wasSprinting = false;

  constructor(
    kcc: CharacterKCC,
    physics: PhysicsWorld | null = null,
    slideController: SlideController | null = null,
    wallRunController: WallRunController | null = null,
  ) {
    this.kcc = kcc;
    this.physics = physics;
    this.slideController = slideController;
    this.wallRunController = wallRunController;
  }

  setSlideController(sc: SlideController): void {
    this.slideController = sc;
  }

  setWallRunController(wrc: WallRunController): void {
    this.wallRunController = wrc;
  }

  setPhysics(p: PhysicsWorld): void {
    this.physics = p;
  }

  /** Set the optional voice line service for Jim's callouts */
  setVoiceLines(vls: VoiceLineService | null): void {
    this.voiceLines = vls;
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

    // Voice line: sprint started (transition from not sprinting to sprinting + moving forward)
    if (this._isSprinting && !this.wasSprinting && moveZ > 0) {
      this.voiceLines?.playSprint();
    }
    this.wasSprinting = this._isSprinting;

    // Build movement direction
    this.moveDir.set(0, 0, 0);
    this.moveDir.addScaledVector(this.right, moveX);
    this.moveDir.addScaledVector(this.forward, moveZ);
    const hasMoveInput = this.moveDir.lengthSq() > 0;
    if (hasMoveInput) {
      this.moveDir.normalize();
    }

    const speed = this._isSprinting
      ? PLAYER_TUNING.sprintSpeed
      : (hasMoveInput ? PLAYER_TUNING.runSpeed : 0);
    const isGrounded = this.kcc.isGrounded();

    // --- Wall-run handling ---
    let wallJumpApplied = false;
    const wantsWallJump = input.isKeyPressed(ControlAction.Jump);
    const wasWallRunning = this.wallRunController?.isWallRunning() ?? false;
    if (this.wallRunController && this.physics) {
      this.wallRunController.update(dt, this.kcc, this.physics, wantsWallJump);

      // Wall jump exit applies velocity away from wall
      if (!this.wallRunController.isWallRunning() && wantsWallJump) {
        // A wall jump just happened — apply burst velocity
        const jumpVel = this.wallRunController.getWallJumpVelocity(PLAYER_TUNING.jumpVelocity);
        this.velocityY = jumpVel.y;
        this.wallJumpVelocityX = jumpVel.x;
        this.wallJumpVelocityZ = jumpVel.z;
        wallJumpApplied = true;
      }
    }
    // Voice line: wall-run started
    const isWallRunning = this.wallRunController?.isWallRunning() ?? false;
    if (isWallRunning && !wasWallRunning) {
      this.voiceLines?.playWallRun();
    }

    // --- Slide handling ---
    if (this.slideController) {
      // Press slide while grounded and moving
      if (input.isKeyPressed(ControlAction.Slide) && isGrounded && hasMoveInput) {
        this.slideController.start(this.kcc);
        this.voiceLines?.playSlide();
        if (!this.slideColliderActive) {
          this.kcc.setColliderHalfHeight(SLIDE_COLLIDER_HALF_HEIGHT);
          this.slideColliderActive = true;
        }
      }

      // Update slide state
      if (this.slideController.isSliding()) {
        this.slideController.update(dt, this.kcc, hasMoveInput);
        // If slide just ended, restore collider
        if (!this.slideController.isSliding() && this.slideColliderActive) {
          this.kcc.resetColliderHeight();
          this.slideColliderActive = false;
        }
      }
    }

    // --- Jump ---
    // Normal jump (not wall jump) when grounded
    if (!wallJumpApplied && input.isKeyPressed(ControlAction.Jump) && isGrounded) {
      this.velocityY = PLAYER_TUNING.jumpVelocity;
      this._isJumping = true;
      this.voiceLines?.playJump();
    }

    // --- Gravity ---
    if (!isGrounded) {
      // Apply reduced gravity during wall-run
      if (this.wallRunController && this.wallRunController.isWallRunning()) {
        this.velocityY += this.wallRunController.getWallRunGravity(PLAYER_TUNING.gravity, dt);
      } else {
        this.velocityY += PLAYER_TUNING.gravity * dt;
      }
    }

    // Determine movement speed — override for slide
    let moveSpeed = speed;
    if (this.slideController && this.slideController.isSliding()) {
      moveSpeed = this.slideController.getSlideVelocity();
    }

    // Build movement vector
    const translation = {
      x: this.moveDir.x * moveSpeed * dt + this.wallJumpVelocityX,
      y: this.velocityY * dt,
      z: this.moveDir.z * moveSpeed * dt + this.wallJumpVelocityZ,
    };

    // Decay wall jump impulse (single frame burst)
    this.wallJumpVelocityX = 0;
    this.wallJumpVelocityZ = 0;

    // Compute collision-adjusted movement via KCC
    this.kcc.computeMovement(translation, dt);

    // Land
    if (this.kcc.isGrounded() && this.velocityY < 0) {
      this.velocityY = 0;
      this._isJumping = false;
      // Also reset wall jump velocity on landing
      this.wallJumpVelocityX = 0;
      this.wallJumpVelocityZ = 0;
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