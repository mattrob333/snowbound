import * as THREE from 'three';
import { Pickup } from './Pickup';
import type { PhysicsWorld } from '../../engine/physics/PhysicsWorld';
import type { ThreeRenderer } from '../../engine/rendering/ThreeRenderer';
import type { GameContext } from '../../app/GameContext';
import type { Vec3 } from '../levels/LevelData';

/** The types of powerups a player can collect */
export const PowerupType = {
  SpeedBoost: 'speed_boost',
  DogRepel: 'dog_repel',
  Shield: 'shield',
  Magnet: 'magnet',
} as const;
export type PowerupType = (typeof PowerupType)[keyof typeof PowerupType];

/** Color mapping per powerup type — used for the visual mesh */
const POWERUP_COLORS: Record<PowerupType, { color: number; emissive: number }> = {
  speed_boost: { color: 0x44aaff, emissive: 0x004488 },
  dog_repel: { color: 0x44ff88, emissive: 0x008844 },
  shield: { color: 0xffdd44, emissive: 0x886600 },
  magnet: { color: 0xcc88ff, emissive: 0x6600cc },
};

/** Default duration (seconds) if not specified */
const DEFAULT_DURATIONS: Record<PowerupType, number> = {
  speed_boost: 10,
  dog_repel: 8,
  shield: 6,
  magnet: 12,
};

export interface PowerupActivatePayload {
  type: PowerupType;
  duration: number;
}

/**
 * PowerupPickup — a collectible that grants a temporary effect.
 * Extends Pickup with type-specific coloring and duration tracking.
 * Fires onActivate when collected and onDeactivate when the effect expires.
 */
export class PowerupPickup extends Pickup {
  readonly powerupType: PowerupType;
  readonly duration: number;

  /** Whether the powerup effect is currently active */
  active = false;

  /** Remaining time in seconds (counts down after collection) */
  timeRemaining = 0;

  /** Fired when the powerup effect starts */
  onActivate: ((payload: PowerupActivatePayload) => void) | null = null;

  /** Fired when the powerup effect expires */
  onDeactivate: ((type: PowerupType) => void) | null = null;

  constructor(
    physics: PhysicsWorld,
    renderer: ThreeRenderer | null,
    position: Vec3,
    powerupType: PowerupType,
    duration?: number,
  ) {
    super(physics, renderer, position);
    this.powerupType = powerupType;
    this.duration = duration ?? DEFAULT_DURATIONS[powerupType];

    // Type-specific visual
    const colors = POWERUP_COLORS[powerupType];
    const geometry = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const material = new THREE.MeshStandardMaterial({
      color: colors.color,
      emissive: colors.emissive,
      emissiveIntensity: 0.6,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(position.x, position.y, position.z);
    this.mesh.rotation.y = Math.random() * Math.PI * 2;

    if (this.renderer) {
      this.renderer.scene.add(this.mesh);
    }

    // Wire up collection to activate the effect
    this.onCollect = () => {
      this.active = true;
      this.timeRemaining = this.duration;
      this.onActivate?.({ type: this.powerupType, duration: this.duration });
    };
  }

  override update(_dt: number, _ctx: GameContext): void {
    // Rotation animation while visible
    if (this.mesh && !this.collected) {
      this.mesh.rotation.y += 0.025;
    }

    // Let the base class handle proximity detection
    super.update(_dt, _ctx);

    // Decrement duration while the effect is active
    if (this.active) {
      this.timeRemaining -= _dt;
      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.active = false;
        this.onDeactivate?.(this.powerupType);
      }
    }
  }

  /**
   * Override dispose to clean up the onCollect wiring.
   */
  override dispose(): void {
    this.onCollect = null;
    this.onActivate = null;
    this.onDeactivate = null;
    super.dispose();
  }
}
