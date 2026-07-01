import * as THREE from 'three';
import { CharacterKCC } from '../../engine/physics/CharacterKCC';
import { PlayerController } from './PlayerController';
import { SlideController } from './SlideController';
import { WallRunController } from './WallRunController';
import { JimVisual } from './JimVisual';
import { JimAnimState } from '../../engine/animation/JimAnimationController';
import { ThirdPersonCameraRig } from '../../engine/camera/ThirdPersonCameraRig';
import type { PhysicsWorld } from '../../engine/physics/PhysicsWorld';
import type { GameContext } from '../../app/GameContext';
import { PLAYER_HEIGHT, PLAYER_RADIUS } from '../../config/constants';

export class Player {
  readonly visual: JimVisual;
  readonly kcc: CharacterKCC;
  readonly controller: PlayerController;
  readonly slideController: SlideController;
  readonly wallRunController: WallRunController;
  private cameraRig: ThirdPersonCameraRig;

  /** Whether the player has collected the level's helicopter part */
  partCollected = false;

  /** Reset per-level state (called when loading a new level) */
  resetLevelState(): void {
    this.partCollected = false;
  }

  constructor(physics: PhysicsWorld, cameraRig: ThirdPersonCameraRig) {
    this.kcc = new CharacterKCC(physics, PLAYER_HEIGHT, PLAYER_RADIUS);
    this.slideController = new SlideController();
    this.wallRunController = new WallRunController();
    this.controller = new PlayerController(this.kcc, physics, this.slideController, this.wallRunController);
    this.cameraRig = cameraRig;
    this.visual = new JimVisual();
  }

  /** Root object to add to the scene — origin at Jim's feet */
  get root(): THREE.Group {
    return this.visual.root;
  }

  update(dt: number, ctx: GameContext): void {
    const input = ctx.input;
    const cameraAzimuth = this.cameraRig.azimuth;

    this.controller.update(dt, input, cameraAzimuth);

    // Sync visual root (feet) to physics body position (capsule centre)
    const pos = this.kcc.getPosition();
    this.visual.root.position.set(pos.x, pos.y - PLAYER_HEIGHT / 2, pos.z);

    // Drive animation + facing from movement
    const moveDir = this.controller.getMoveDirection();
    this.visual.setFacing(moveDir.x, moveDir.z);
    this.visual.setState(this.deriveAnimState());
    this.visual.update(dt);

    // Update third-person camera to follow player
    const targetPos = new THREE.Vector3(pos.x, pos.y + 1.4, pos.z);
    this.cameraRig.update(dt, targetPos);
  }

  /** Derive the animation state from the movement controllers */
  private deriveAnimState(): JimAnimState {
    if (this.slideController.isSliding()) return JimAnimState.Slide;
    if (this.wallRunController.isWallRunning()) return JimAnimState.WallRun;
    const grounded = this.kcc.isGrounded();
    const vy = this.controller.getVelocityY();
    if (!grounded && vy > 0.5) return JimAnimState.Jump;
    if (!grounded && vy < -0.5) return JimAnimState.Fall;
    if (this.controller.hasMoveInput()) {
      return this.controller.isSprinting() ? JimAnimState.Sprint : JimAnimState.Run;
    }
    return JimAnimState.Idle;
  }

  getCameraRig(): ThirdPersonCameraRig {
    return this.cameraRig;
  }
}
