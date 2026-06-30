import RAPIER from '@dimforge/rapier3d-compat';
import type { PhysicsWorld } from './PhysicsWorld';

export class CharacterKCC {
  readonly controller: RAPIER.KinematicCharacterController;
  private characterCollider: RAPIER.Collider;
  private characterBody: RAPIER.RigidBody;
  private _grounded = false;

  constructor(
    physics: PhysicsWorld,
    height: number,
    radius: number,
  ) {
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
    const colliderDesc = RAPIER.ColliderDesc.capsule(height / 2 - radius, radius);
    this.characterCollider = physics.addCollider(colliderDesc, this.characterBody);
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

  dispose(): void {
    // Rigid body removal also removes attached colliders
  }
}