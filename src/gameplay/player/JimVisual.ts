import * as THREE from 'three';
import { CharacterRig, loadCharacterRig } from '../../engine/assets/CharacterRig';
import { JimAnimState } from '../../engine/animation/JimAnimationController';
import { PLAYER_HEIGHT, PLAYER_RADIUS } from '../../config/constants';

const JIM_MODEL_URL = '/assets/models/characters/jim.glb';

/** Clip + playback settings for each animation state (Soldier model has Idle/Walk/Run) */
const STATE_CLIPS: Record<JimAnimState, { clip: string; timeScale: number; paused?: boolean }> = {
  [JimAnimState.Idle]: { clip: 'Idle', timeScale: 1 },
  [JimAnimState.Run]: { clip: 'Run', timeScale: 1 },
  [JimAnimState.Sprint]: { clip: 'Run', timeScale: 1.35 },
  [JimAnimState.Jump]: { clip: 'Run', timeScale: 0.35 },
  [JimAnimState.Fall]: { clip: 'Run', timeScale: 0.35 },
  [JimAnimState.Slide]: { clip: 'Idle', timeScale: 1 },
  [JimAnimState.WallRun]: { clip: 'Run', timeScale: 1.1 },
};

/** How far Jim leans back while sliding (radians) */
const SLIDE_TILT = -1.15;
const TILT_SMOOTHING = 12;
const TURN_SMOOTHING = 14;

/**
 * JimVisual — Jim's renderable body.
 *
 * Shows a capsule placeholder immediately, then swaps in the animated
 * character model once it loads. The root group's origin is at Jim's feet.
 * Handles facing the movement direction and per-state animations.
 */
export class JimVisual {
  readonly root: THREE.Group;
  private placeholder: THREE.Mesh | null;
  private rig: CharacterRig | null = null;
  private state: JimAnimState = JimAnimState.Idle;
  private targetYaw = 0;
  private tilt = 0;
  private targetTilt = 0;

  constructor() {
    this.root = new THREE.Group();

    const capsuleGeo = new THREE.CapsuleGeometry(PLAYER_RADIUS, PLAYER_HEIGHT - 2 * PLAYER_RADIUS, 8, 16);
    const capsuleMat = new THREE.MeshStandardMaterial({ color: 0x44aaff, roughness: 0.6, metalness: 0.1 });
    this.placeholder = new THREE.Mesh(capsuleGeo, capsuleMat);
    this.placeholder.position.y = PLAYER_HEIGHT / 2;
    this.placeholder.castShadow = true;
    this.root.add(this.placeholder);
  }

  /** Kick off the async model load; falls back to the capsule on failure */
  loadModel(): void {
    loadCharacterRig(JIM_MODEL_URL, { targetHeight: PLAYER_HEIGHT, facingOffsetY: Math.PI })
      .then((rig) => {
        this.rig = rig;
        this.root.add(rig.root);
        if (this.placeholder) {
          this.root.remove(this.placeholder);
          this.placeholder.geometry.dispose();
          (this.placeholder.material as THREE.Material).dispose();
          this.placeholder = null;
        }
        this.applyStateClip();
      })
      .catch((err) => {
        console.warn('[JimVisual] Model load failed, keeping capsule placeholder:', err);
      });
  }

  /** Set the current animation state (idle/run/sprint/jump/fall/slide/wallrun) */
  setState(state: JimAnimState): void {
    if (state === this.state) return;
    this.state = state;
    this.targetTilt = state === JimAnimState.Slide ? SLIDE_TILT : 0;
    this.applyStateClip();
  }

  /** Point Jim toward a horizontal movement direction */
  setFacing(dirX: number, dirZ: number): void {
    if (dirX * dirX + dirZ * dirZ < 1e-6) return;
    this.targetYaw = Math.atan2(dirX, dirZ);
  }

  /** Advance animations, turning, and slide tilt */
  update(dt: number): void {
    this.rig?.update(dt);

    // Smoothly turn toward the movement direction (shortest arc)
    let delta = this.targetYaw - this.root.rotation.y;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    const turn = 1 - Math.exp(-TURN_SMOOTHING * dt);
    this.root.rotation.y += delta * turn;

    // Smooth slide tilt (lean back like a sled ride)
    const tiltBlend = 1 - Math.exp(-TILT_SMOOTHING * dt);
    this.tilt += (this.targetTilt - this.tilt) * tiltBlend;
    const body = this.rig?.root ?? this.placeholder;
    if (body) {
      body.rotation.x = this.tilt;
      body.position.y = this.tilt !== 0 ? Math.abs(Math.sin(this.tilt)) * -0.2 : 0;
    }
  }

  private applyStateClip(): void {
    const { clip, timeScale, paused } = STATE_CLIPS[this.state];
    this.rig?.play(clip, { timeScale, paused });
  }

  dispose(): void {
    this.rig?.dispose();
    this.rig = null;
    if (this.placeholder) {
      this.placeholder.geometry.dispose();
      (this.placeholder.material as THREE.Material).dispose();
      this.placeholder = null;
    }
    this.root.removeFromParent();
  }
}
