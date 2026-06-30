import type RAPIER from '@dimforge/rapier3d-compat';
import type { PhysicsWorld } from '../../engine/physics/PhysicsWorld';
import type { CharacterKCC } from '../../engine/physics/CharacterKCC';
import { PLAYER_TUNING } from '../../config/tuning';

export type WallSide = 'left' | 'right' | null;

export class WallRunController {
  private _isWallRunning = false;
  private _wallNormal: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private _wallSide: WallSide = null;
  private timer = 0;
  private cooldownTimer = 0;
  private readonly rayHeight = 1.2;
  private readonly rayLength = 1.5;

  isWallRunning(): boolean {
    return this._isWallRunning;
  }

  isOnCooldown(): boolean {
    return this.cooldownTimer > 0;
  }

  getWallNormal(): { x: number; y: number; z: number } {
    return { ...this._wallNormal };
  }

  getWallSide(): WallSide {
    return this._wallSide;
  }

  update(
    dt: number,
    kcc: CharacterKCC,
    physics: PhysicsWorld,
    wantsWallJump: boolean,
  ): void {
    // Tick cooldown
    if (this.cooldownTimer > 0) {
      this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);
    }

    // If wall jumping, exit wall-run state
    if (wantsWallJump && this._isWallRunning) {
      this._isWallRunning = false;
      this.cooldownTimer = PLAYER_TUNING.wallRunCooldown;
      return;
    }

    if (!this._isWallRunning) {
      // Try to start wall-run — must be airborne and not on cooldown
      if (kcc.isGrounded()) return;
      if (this.cooldownTimer > 0) return;

      this.detectWall(kcc, physics);
      return;
    }

    // Active wall-run: tick timer
    this.timer += dt;

    // Check if wall-run should end
    if (this.timer > PLAYER_TUNING.wallRunDuration) {
      this.stop();
      return;
    }

    // Re-validate wall contact (without resetting timer)
    const stillOnWall = this.checkWallContact(kcc, physics);
    if (!stillOnWall) {
      this.stop();
      return;
    }

    // Check if grounded during wall-run
    if (kcc.isGrounded()) {
      this.stop();
      return;
    }
  }

  /** Returns upward velocity to apply during wall-run (reduced gravity) */
  getWallRunGravity(g: number, _dt: number): number {
    if (!this._isWallRunning) return g;
    return g * PLAYER_TUNING.wallRunGravityScale;
  }

  /** Compute wall jump velocity — direction away from wall + upward */
  getWallJumpVelocity(jumpStrength: number): {
    x: number;
    y: number;
    z: number;
  } {
    return {
      x: this._wallNormal.x * jumpStrength,
      y: jumpStrength * 0.8,
      z: this._wallNormal.z * jumpStrength,
    };
  }

  stop(): void {
    this._isWallRunning = false;
    this._wallNormal = { x: 0, y: 0, z: 0 };
    this._wallSide = null;
    this.cooldownTimer = PLAYER_TUNING.wallRunCooldown;
  }

  /** Try to detect a wall on either side and start wall-run. Returns true if a wall was found. */
  private detectWall(kcc: CharacterKCC, physics: PhysicsWorld): boolean {
    const hit = this.findWallHit(kcc, physics);
    if (hit) {
      this.startWallRun(hit);
      return true;
    }
    return false;
  }

  /** Check if a wall is still present (for active wall-run re-validation). Does NOT reset timer. */
  private checkWallContact(kcc: CharacterKCC, physics: PhysicsWorld): boolean {
    const hit = this.findWallHit(kcc, physics);
    return hit !== null;
  }

  /** Raycast left and right, return the closest wall hit if any. */
  private findWallHit(
    kcc: CharacterKCC,
    physics: PhysicsWorld,
  ): RAPIER.RayColliderIntersection | null {
    const pos = kcc.getPosition();
    const rayOrigin = { x: pos.x, y: pos.y + this.rayHeight, z: pos.z };

    // Check right side
    const rightRay = {
      origin: rayOrigin,
      direction: { x: 1, y: 0, z: 0 },
      maxDist: this.rayLength,
    };
    const rightHit = physics.raycast(rightRay.origin, rightRay.direction, rightRay.maxDist);

    // Check left side
    const leftRay = {
      origin: rayOrigin,
      direction: { x: -1, y: 0, z: 0 },
      maxDist: this.rayLength,
    };
    const leftHit = physics.raycast(leftRay.origin, leftRay.direction, leftRay.maxDist);

    if (rightHit && leftHit) {
      // Both sides — pick the closer wall
      if (rightHit.timeOfImpact < leftHit.timeOfImpact) return rightHit;
      return leftHit;
    }

    if (rightHit) return rightHit;
    if (leftHit) return leftHit;

    return null;
  }

  private startWallRun(hit: RAPIER.RayColliderIntersection): void {
    this._isWallRunning = true;
    this._wallNormal = { x: hit.normal.x, y: 0, z: hit.normal.z };

    // Normalize the wall normal in XZ plane
    const len = Math.sqrt(
      this._wallNormal.x * this._wallNormal.x +
        this._wallNormal.z * this._wallNormal.z,
    );
    if (len > 0) {
      this._wallNormal.x /= len;
      this._wallNormal.z /= len;
    }

    this._wallSide = this._wallNormal.x > 0 ? 'right' : 'left';
    this.timer = 0;
  }
}