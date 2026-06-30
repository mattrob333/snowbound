import RAPIER from '@dimforge/rapier3d-compat';
import type { PhysicsWorld } from './PhysicsWorld';

export class CharacterKCC {
  readonly controller: RAPIER.KinematicCharacterController;
  private characterCollider: RAPIER.Collider;
  private characterBody: RAPIER.RigidBody;
  private _grounded = false;
  private physics: PhysicsWorld;
  private readonly radius: number;
  private readonly originalHalfHeight: number;

  constructor(
    physics: PhysicsWorld,
    height: number,
    radius: number,
  ) {
    this.physics = physics;
    this.radius = radius;
    this.originalHalfHeight = height / 2 - radius;
    this.controller = new RAPIER.KinematicCharacterController(
      0.01,
      physics.world.integrationParameters,
      physics.world.broadPhase,
      physics.world.narrowPhase,
      physics.world.bodies,
      physics.world.colliders,
    );
    this.controller.enableSnapToGround(0.3);
    this.controller.setSlideEnabled(true);
    this.controller.enableAutostep(0.3, 0.2, true);
    this.controller.setMaxSlopeClimbAngle(45 * (Math.PI / 180));
    this.controller.setMinSlopeSlideAngle(30 * (Math.PI / 180));

    // Create the character rigid body (kinematic, position-based)
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(0, 1, 0);
    this.characterBody = physics.addRigidBody(bodyDesc);

    // Capsule collider for the character
    const colliderDesc = RAPIER.ColliderDesc.capsule(this.originalHalfHeight, radius);
    this.characterCollider = physics.addCollider(colliderDesc, this.characterBody);
  }

  /** Replace the capsule collider with one of a different half-height.
   *  Useful for crouching/sliding where the player needs a shorter hitbox. */
  setColliderHalfHeight(halfHeight: number): void {
    this.physics.world.removeCollider(this.characterCollider, true);
    const newDesc = RAPIER.ColliderDesc.capsule(halfHeight, this.radius);
    this.characterCollider = this.physics.addCollider(newDesc, this.characterBody);
  }

  /** Restore the collider to the original full-height capsule. */
  resetColliderHeight(): void {
    this.setColliderHalfHeight(this.originalHalfHeight);
  }

  /** Get the collider's Y translation offset so external code can position visuals correctly. */
  getColliderOffsetY(): number {
    return this.originalHalfHeight;
  }

  setPosition(pos: { x: number; y: number; z: number }): void {
    this.characterBody.setNextKinematicTranslation(pos);
  }

  getPosition(): { x: number; y: number; z: number } {
    const pos = this.characterBody.translation();
    return { x: pos.x, y: pos.y, z: pos.z };
  }

  computeMovement(translation: { x: number; y: number; z: number }, _dt: number): void {
    this.controller.computeColliderMovement(
      this.characterCollider,
      translation,
    );
    this._grounded = this.controller.computedGrounded();
  }

  applyMovement(): void {
    const computed = this.controller.computedMovement();
    const cur = this.characterBody.translation();
    this.characterBody.setNextKinematicTranslation({
      x: cur.x + computed.x,
      y: cur.y + computed.y,
      z: cur.z + computed.z,
    });
  }

  isGrounded(): boolean {
    return this._grounded;
  }

  teleport(pos: { x: number; y: number; z: number }): void {
    this.characterBody.setTranslation(pos, true);
  }

  /** Expose the character collider for proximity/pickup detection */
  getCollider(): RAPIER.Collider {
    return this.characterCollider;
  }

  dispose(): void {
    // Removing the rigid body also removes attached colliders
    this.physics.removeRigidBody(this.characterBody);
  }
}