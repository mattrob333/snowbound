import * as THREE from 'three';
import type { GameContext } from '../../app/GameContext';
import type { IGameEntity } from '../entities/EntityManager';
import { RoutePath } from '../levels/RoutePath';
import { DogVisual } from './DogVisual';
import type { DogTuning, AABB } from '../levels/LevelData';
import type { AudioManager, SpatialSoundHandle } from '../../engine/audio/AudioManager';
import {
  MonsterAnimationController,
  DogAnimationState,
} from './MonsterAnimationController';

export const DogState = {
  Patrol: 'patrol',
  Chase: 'chase',
  Caught: 'caught',
  Slip: 'slip',
} as const;
export type DogState = (typeof DogState)[keyof typeof DogState];

/** Maps game DogState to DogAnimationState */
function dogStateToAnim(state: DogState): DogAnimationState {
  switch (state) {
    case DogState.Patrol: return DogAnimationState.Patrol;
    case DogState.Chase: return DogAnimationState.Chase;
    case DogState.Caught: return DogAnimationState.Catch;
    case DogState.Slip: return DogAnimationState.Slip;
  }
}

/** Default slip duration when not specified in tuning */
const DEFAULT_SLIP_DURATION = 0.5;

/**
 * MonsterDog — a placeholder dog entity that moves along a route path.
 * During patrol, it aims to stay behind the player at patrolDistance.
 * During chase, it aims to reach the player's position.
 */
export class MonsterDog implements IGameEntity {
  /** Root visual group (origin at the dog's feet) */
  readonly mesh: THREE.Group;
  readonly visual: DogVisual;
  readonly routePath: RoutePath;
  readonly animation: MonsterAnimationController;
  tuning: DogTuning;

  /** Normalised progress along the route (0..1) */
  progress: number = 0;
  /** Current state of the dog */
  private _state: DogState = 'patrol';
  /** Store reference to scene for cleanup */
  private renderer: { scene: THREE.Scene } | null = null;
  /** Spatial audio handle for dog growl (null if audio not started) */
  audioHandle: SpatialSoundHandle | null = null;
  /** Ice zones to check for dog slip comedy event */
  private iceZones: AABB[] = [];
  /** Timer for slip state duration (seconds remaining) */
  private _slipTimer: number = 0;
  /** Cooldown after a slip ends before another can trigger */
  private _slipCooldown: number = 0;
  /** Previous state before slip triggered (to restore after slip ends) */
  private _previousState: DogState = 'patrol';

  constructor(
    routePath: RoutePath,
    tuning: DogTuning,
    renderer: { scene: THREE.Scene } | null = null,
    audioManager?: AudioManager,
    iceZones?: AABB[],
  ) {
    this.routePath = routePath;
    this.tuning = tuning;
    this.iceZones = iceZones ?? [];
    this.animation = new MonsterAnimationController();

    // Visual body — capsule placeholder that upgrades to the animated model
    this.visual = new DogVisual();
    this.mesh = this.visual.root;

    // Start at the first waypoint
    const startPos = routePath.getPositionAtProgress(0);
    this.mesh.position.set(startPos.x, startPos.y, startPos.z);

    if (renderer) {
      renderer.scene.add(this.mesh);
      this.renderer = renderer;
      // Only load the model when actually rendering (keeps tests Node-safe)
      this.visual.loadModel();
    }

    // Start spatial audio for the dog's growl if audio manager available
    if (audioManager) {
      const pos = this.getPosition();
      this.audioHandle = audioManager.playSpatial('dog_growl', 'sfx', true, pos);
    }
  }

  /** Dog's movement state — setting this also updates the animation controller */
  get state(): DogState {
    return this._state;
  }

  set state(value: DogState) {
    if (value !== this._state) {
      this._state = value;
      const animState = dogStateToAnim(value);
      this.animation.transitionTo(animState);
      this.visual.setState(animState);
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
    switch (this._state) {
      case DogState.Chase: return this.tuning.chaseSpeed;
      case DogState.Slip:
      case DogState.Patrol:
      default:
        return this.tuning.patrolSpeed;
    }
  }

  /**
   * Advance the animation controller by dt seconds and sync visuals.
   */
  updateAnimation(dt: number): void {
    this.animation.update(dt);

    // Tick down slip timer
    if (this._state === DogState.Slip) {
      this._slipTimer -= dt;
      if (this._slipTimer <= 0) {
        // Slip ended — restore previous state and set cooldown
        this.state = this._previousState;
        this._slipCooldown = 1.0; // 1s cooldown before another slip can trigger
      }
    } else if (this._slipCooldown > 0) {
      this._slipCooldown -= dt;
    }

    // Apply current scale from animation state
    const scale = this.animation.currentScale;
    this.mesh.scale.set(scale, scale, scale);

    // Advance skeletal animation and glow effects
    this.visual.update(dt);
  }

  /**
   * Update the spatial audio position to match the dog's current mesh position.
   */
  updateSpatialAudio(): void {
    if (this.audioHandle) {
      const pos = this.getPosition();
      this.audioHandle.setPosition(pos.x, pos.y, pos.z);
    }
  }

  /**
   * Set close warning state on the animation controller.
   */
  setCloseWarning(active: boolean): void {
    this.animation.setCloseWarning(active);
    this.visual.setCloseWarning(active);
  }

  /** Check if the dog's current position is on any ice zone */
  private isOnIce(pos: { x: number; y: number; z: number }): boolean {
    return this.iceZones.some(zone =>
      pos.x >= zone.min.x && pos.x <= zone.max.x &&
      pos.y >= zone.min.y && pos.y <= zone.max.y &&
      pos.z >= zone.min.z && pos.z <= zone.max.z,
    );
  }

  /** Roll for a slip event and execute it if triggered */
  private trySlip(dogPos: { x: number; y: number; z: number }): void {
    if (this.iceZones.length === 0) return;
    if (!this.isOnIce(dogPos)) return;
    if (this._slipCooldown > 0) return;

    const slipChance = this.tuning.slipChance ?? 0;
    if (slipChance <= 0) return;
    if (Math.random() > slipChance) return;

    const slipGap = this.tuning.slipGapBonus ?? 0;
    if (slipGap <= 0) return;

    // Execute slip: reduce progress, set slip animation, start timer
    this._previousState = this._state;
    this.state = DogState.Slip;
    this._slipTimer = this.tuning.slipDuration ?? DEFAULT_SLIP_DURATION;

    // Reduce progress (dog falls behind)
    const slipProgress = slipGap / this.routePath.totalLength;
    this.progress = Math.max(0, this.progress - slipProgress);

    // Sync mesh to new progress
    const pos = this.routePath.getPositionAtProgress(this.progress);
    this.mesh.position.set(pos.x, pos.y, pos.z);
  }

  /**
   * Update the dog's position along the route.
   *
   * @param targetProgress  The player's progress (0..1) — the dog tries to match it
   * @param dt  Delta time (fixed physics step)
   */
  moveTowardsPlayer(targetProgress: number, dt: number): void {
    if (this._state === 'caught') return;

    // Determine target progress for the dog
    let target: number;
    const patrolOffset = this.tuning.patrolDistance / this.routePath.totalLength;

    if (this._state === 'chase') {
      // Chase: aim for the player's position
      target = targetProgress;
    } else {
      // Patrol: stay patrolDistance behind the player (also applies during slip)
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

    // Check for ice slip after movement (if not already slipping)
    if (this._state !== DogState.Slip) {
      this.trySlip(pos);
    }

    // Sync spatial audio position
    if (this.audioHandle) {
      this.audioHandle.setPosition(pos.x, pos.y, pos.z);
    }

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
    // Stop spatial audio
    if (this.audioHandle) {
      this.audioHandle.stop();
      this.audioHandle = null;
    }
    if (this.renderer) {
      this.renderer.scene.remove(this.mesh);
    }
    this.visual.dispose();
  }
}
