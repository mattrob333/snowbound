import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { PhysicsWorld } from '../../engine/physics/PhysicsWorld';
import type { ThreeRenderer } from '../../engine/rendering/ThreeRenderer';
import type { IGameEntity } from '../entities/EntityManager';
import type { GameContext } from '../../app/GameContext';
import type { Vec3 } from './LevelData';

/**
 * SafeZone — an entity that detects player overlap and fires onLevelComplete
 * when both: (a) the player is inside the zone, and (b) the helicopter part
 * has been collected.
 */
export class SafeZone implements IGameEntity {
  private physics: PhysicsWorld;
  private renderer: ThreeRenderer | null;
  private body: RAPIER.RigidBody;
  private mesh: THREE.Mesh | null;
  private radius: number;
  private _requiresPart: boolean;
  private _playerInside = false;
  private _completed = false;

  /** Callback fired once when the level is completed */
  onLevelComplete: (() => void) | null = null;
  /** Callback fired when player enters the zone (regardless of part state) */
  onPlayerEnter: (() => void) | null = null;
  /** Callback fired when player leaves the zone */
  onPlayerExit: (() => void) | null = null;

  constructor(
    physics: PhysicsWorld,
    renderer: ThreeRenderer | null,
    position: Vec3,
    radius: number,
    requiresPart: boolean,
  ) {
    this.physics = physics;
    this.renderer = renderer;
    this.radius = radius;
    this._requiresPart = requiresPart;

    // Create sensor body
    this.body = physics.addRigidBody(
      RAPIER.RigidBodyDesc.fixed()
        .setTranslation(position.x, position.y, position.z)
    );

    const colliderDesc = RAPIER.ColliderDesc.cylinder(1.0, radius)
      .setSensor(true)
      .setCollisionGroups(0x0001_0002); // Member: SafeZone, Filter: Player
    physics.addCollider(colliderDesc, this.body);

    // Visual ring — translucent disc on the ground
    const segments = 24;
    const geometry = new THREE.CircleGeometry(radius, segments);
    const material = new THREE.MeshLambertMaterial({
      color: 0x44aaff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(position.x, position.y + 0.05, position.z);

    if (this.renderer) {
      this.renderer.scene.add(this.mesh);
    }
  }

  get completed(): boolean {
    return this._completed;
  }

  get playerInside(): boolean {
    return this._playerInside;
  }

  get requiresPart(): boolean {
    return this._requiresPart;
  }

  update(_dt: number, ctx: GameContext): void {
    if (this._completed) return;

    const playerPos = ctx.player.kcc.getPosition();
    const sensorPos = this.body.translation();

    // Check if player is inside the cylindrical safe zone
    const dx = playerPos.x - sensorPos.x;
    const dz = playerPos.z - sensorPos.z;
    const distSq = dx * dx + dz * dz;
    const wasInside = this._playerInside;
    this._playerInside = distSq <= this.radius * this.radius;

    // Fire enter/exit callbacks
    if (this._playerInside && !wasInside) {
      this.onPlayerEnter?.();
    } else if (!this._playerInside && wasInside) {
      this.onPlayerExit?.();
    }

    // Completion check: player inside + (part not needed or part collected)
    if (this._playerInside && (!this._requiresPart || ctx.player.partCollected)) {
      this._completed = true;
      this.onLevelComplete?.();
    }
  }

  dispose(): void {
    if (this.mesh && this.renderer) {
      this.renderer.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      if (Array.isArray(this.mesh.material)) {
        for (const m of this.mesh.material) m.dispose();
      } else if (this.mesh.material) {
        this.mesh.material.dispose();
      }
    }
    this.physics.removeRigidBody(this.body);
  }
}
