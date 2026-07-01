import * as THREE from 'three';
import { Hazard } from './Hazard';
import type { GameContext } from '../../app/GameContext';

/**
 * CrackedIceHazard — a patch of unstable ice on the ground.
 *
 * When the player walks over it, the ice "cracks" (visual change) and
 * the hazard activates, calling onActivate (which the LevelManager wires
 * to close the dog gap). After a brief delay the hazard is spent.
 *
 * Visual: the level JSON spawns a static box for the crack indicator.
 * This entity updates the visual color when triggered.
 */
export class CrackedIceHazard extends Hazard {
  /** The static visual mesh from the level loader — null if we don't have a reference */
  private visualMesh: THREE.Mesh | null = null;
  /** Cracked color after activation */
  private readonly crackedColor: number = 0x888888;
  /** How long the crack effect lasts before the hazard is spent (seconds) */
  private activeDuration: number;
  /** Timer counting down from activation */
  private timer: number = 0;
  /** Whether the visual update has been applied */
  private visualUpdated = false;

  constructor(
    position: { x: number; y: number; z: number },
    halfExtents: { x: number; y: number; z: number },
    triggerRadius?: number,
    activeDuration?: number,
  ) {
    super('cracked_ice', position, halfExtents, triggerRadius ?? 2.5);
    this.activeDuration = activeDuration ?? 2.0;
  }

  /** Set a reference to the static visual mesh so we can update its color */
  setVisualMesh(mesh: THREE.Mesh): void {
    this.visualMesh = mesh;
  }

  /** Close the Gap factor — how much of progress to close (in route-progress 0..1) */
  dogGapPenalty: number = 0.08;

  protected onPlayerEnter(_ctx: GameContext): void {
    this.timer = this.activeDuration;
    this.visualUpdated = false;
  }

  protected onActiveUpdate(dt: number, _ctx: GameContext): void {
    if (this.spent) return;

    // Visual change: cracked ice look (first frame after activation)
    if (!this.visualUpdated && this.visualMesh) {
      const mat = this.visualMesh.material;
      if (!Array.isArray(mat) && 'color' in mat) {
        (mat as THREE.MeshLambertMaterial).color.setHex(this.crackedColor);
      }
      this.visualUpdated = true;
    }

    // Count down timer, then mark spent
    this.timer -= dt;
    if (this.timer <= 0) {
      this.spent = true;
    }
  }

  dispose(): void {
    // Optionally restore original color or just mark spent
    this.spent = true;
  }
}
