import * as THREE from 'three';
import type { GameContext } from '../../app/GameContext';
import type { IGameEntity } from '../entities/EntityManager';
import { RoutePath } from '../levels/RoutePath';
import { DOG_HEIGHT, DOG_WIDTH } from '../../config/constants';
import type { DogTuning } from '../levels/LevelData';

export const DogState = {
  Patrol: 'patrol',
  Chase: 'chase',
  Caught: 'caught',
} as const;
export type DogState = (typeof DogState)[keyof typeof DogState];

/**
 * MonsterDog — a placeholder dog entity that moves along a route path.
 * During patrol, it aims to stay behind the player at patrolDistance.
 * During chase, it aims to reach the player's position.
 */
export class MonsterDog implements IGameEntity {
  readonly mesh: THREE.Mesh;
  readonly routePath: RoutePath;
  tuning: DogTuning;

  /** Normalised progress along the route (0..1) */
  progress: number = 0;
  /** Current state of the dog */
  state: DogState = 'patrol';
  /** Store reference to scene for cleanup */
  private renderer: { scene: THREE.Scene } | null = null;

  constructor(
    routePath: RoutePath,
    tuning: DogTuning,
    renderer: { scene: THREE.Scene } | null = null,
  ) {
    this.routePath = routePath;
    this.tuning = tuning;

    // Create the visual mesh — a tall brown capsule placeholder
    const capsuleGeo = new THREE.CapsuleGeometry(
      DOG_WIDTH / 2,
      DOG_HEIGHT - DOG_WIDTH,
      6,
      12,
    );
    const capsuleMat = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.8,
      metalness: 0.0,
    });
    this.mesh = new THREE.Mesh(capsuleGeo, capsuleMat);
    this.mesh.castShadow = true;

    // Start at the first waypoint
    const startPos = routePath.getPositionAtProgress(0);
    this.mesh.position.set(startPos.x, startPos.y, startPos.z);

    if (renderer) {
      renderer.scene.add(this.mesh);
      this.renderer = renderer;
    }
  }

  /**
   * Get the current world position of the dog.
   */
  getPosition(): { x: number; y: number; z: number } {
    const p = this.mesh.position;
    return { x: p.x, y: p.y, z: p.z };
  }

  /**
   * Get the current speed based on state.
   */
  getCurrentSpeed(): number {
    return this.state === 'chase' ? this.tuning.chaseSpeed : this.tuning.patrolSpeed;
  }

  /**
   * Update the dog's position along the route.
   *
   * @param targetProgress  The player's progress (0..1) — the dog tries to match it
   * @param dt  Delta time (fixed physics step)
   */
  moveTowardsPlayer(targetProgress: number, dt: number): void {
    if (this.state === 'caught') return;

    // Determine target progress for the dog
    let target: number;
    const patrolOffset = this.tuning.patrolDistance / this.routePath.totalLength;

    if (this.state === 'chase') {
      // Chase: aim for the player's position
      target = targetProgress;
    } else {
      // Patrol: stay patrolDistance behind the player
      target = Math.max(0, targetProgress - patrolOffset);
    }

    // Clamp target
    target = Math.max(0, Math.min(1, target));

    // Move towards target
    const speed = this.getCurrentSpeed();
    const maxDelta = (speed * dt) / this.routePath.totalLength;

    if (this.progress < target) {
      this.progress = Math.min(this.progress + maxDelta, target);
    } else if (this.progress > target) {
      this.progress = Math.max(this.progress - maxDelta, target);
    }

    this.progress = Math.max(0, Math.min(1, this.progress));

    // Sync mesh
    const pos = this.routePath.getPositionAtProgress(this.progress);
    this.mesh.position.set(pos.x, pos.y, pos.z);

    // Orient the dog the way it's facing (along the route)
    const next = this.routePath.getPositionAtProgress(Math.min(1, this.progress + 0.01));
    const dx = next.x - pos.x;
    const dz = next.z - pos.z;
    if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
      this.mesh.lookAt(next.x, pos.y, next.z);
    }
  }

  /** Teleport the dog to a specific progress value */
  setProgress(value: number): void {
    this.progress = Math.max(0, Math.min(1, value));
    const pos = this.routePath.getPositionAtProgress(this.progress);
    this.mesh.position.set(pos.x, pos.y, pos.z);
  }

  // IGameEntity interface — required but the dog is controlled by MonsterChaseDirector
  update(_dt: number, _ctx: GameContext): void {
    // Movement is driven externally via moveTowardsPlayer()
  }

  dispose(): void {
    if (this.renderer) {
      this.renderer.scene.remove(this.mesh);
    }
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      for (const m of this.mesh.material) m.dispose();
    } else if (this.mesh.material) {
      this.mesh.material.dispose();
    }
  }
}