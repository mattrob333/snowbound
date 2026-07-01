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
  /** Coyote time remaining — jump grace period after leaving the ground */
  private coyoteTimer = 0;
  /** Jump buffer remaining — a press shortly before landing still jumps */
  private jumpBufferTimer = 0;

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
    // Screen-relative movement directions. W/S move vertically on screen
    // (away from/toward the camera), while A/D move horizontally on screen.
    this.forward.set(-Math.cos(cameraAzimuth), 0, -Math.sin(cameraAzimuth));
    this.right.set(Math.sin(cameraAzimuth), 0, -Math.cos(cameraAzimuth));

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

    // Jump forgiveness timers
    this.coyoteTimer = isGrounded
      ? PLAYER_TUNING.coyoteTime
      : Math.max(0, this.coyoteTimer - dt);
    this.jumpBufferTimer = input.isKeyPressed(ControlAction.Jump)
      ? PLAYER_TUNING.jumpBufferTime
      : Math.max(0, this.jumpBufferTimer - dt);

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
    // Normal jump (not wall jump) with coyote time + jump buffering:
    // works within a grace window after leaving a ledge, and a press
    // just before landing is remembered.
    if (!wallJumpApplied && this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.velocityY = PLAYER_TUNING.jumpVelocity;
      this._isJumping = true;
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.voiceLines?.playJump();
    }

    // --- Gravity ---
    if (!isGrounded) {
      // Apply reduced gravity during wall-run
      if (this.wallRunController && this.wallRunController.isWallRunning()) {
        this.velocityY += this.wallRunController.getWallRunGravity(PLAYER_TUNING.gravity, dt);
      } else {
        // Variable jump height: releasing Jump while rising cuts the jump short
        const rising = this.velocityY > 0;
        const holdingJump = input.isKeyDown(ControlAction.Jump);
        const gravityScale = rising && !holdingJump ? PLAYER_TUNING.lowJumpGravityMultiplier : 1;
        this.velocityY += PLAYER_TUNING.gravity * gravityScale * dt;
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

  /** Current vertical velocity (m/s), negative while falling */
  getVelocityY(): number {
    return this.velocityY;
  }

  /** Normalised horizontal movement direction from the last update */
  getMoveDirection(): THREE.Vector3 {
    return this.moveDir;
  }

  /** Whether movement keys were held during the last update */
  hasMoveInput(): boolean {
    return this.moveDir.lengthSq() > 1e-6;
  }
}
