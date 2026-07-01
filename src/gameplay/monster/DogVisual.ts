import * as THREE from 'three';
import { CharacterRig, loadCharacterRig } from '../../engine/assets/CharacterRig';
import { DogAnimationState } from './MonsterAnimationController';
import { DOG_HEIGHT, DOG_WIDTH } from '../../config/constants';

const DOG_MODEL_URL = '/assets/models/characters/dog.glb';

/** Mutant fur tint multiplied over the fox texture (darker, sickly brown) */
const MUTANT_TINT = 0x8f6f5c;

/** Clip + playback per animation state (Fox model has Survey/Walk/Run) */
const STATE_CLIPS: Record<DogAnimationState, { clip: string; timeScale: number }> = {
  [DogAnimationState.Patrol]: { clip: 'Walk', timeScale: 1.2 },
  [DogAnimationState.Chase]: { clip: 'Run', timeScale: 1.1 },
  [DogAnimationState.Catch]: { clip: 'Survey', timeScale: 1 },
  [DogAnimationState.Slip]: { clip: 'Survey', timeScale: 1.8 },
};

/**
 * DogVisual — the monster dog's renderable body.
 *
 * Starts as the capsule placeholder and swaps in the animated fox model
 * (scaled up to monster size, re-tinted) when it loads. Keeps the glowing
 * red eyes and adds a red glow light that intensifies during the chase.
 * Root origin is at the dog's feet.
 */
export class DogVisual {
  readonly root: THREE.Group;
  private placeholder: THREE.Mesh | null;
  private rig: CharacterRig | null = null;
  private readonly eyes: THREE.Mesh[] = [];
  private readonly eyeGeometry: THREE.SphereGeometry;
  private readonly eyeMaterial: THREE.MeshStandardMaterial;
  private readonly glow: THREE.PointLight;
  private state: DogAnimationState = DogAnimationState.Patrol;
  private closeWarning = false;
  private time = 0;
  private headBone: THREE.Object3D | null = null;
  private readonly headWorld = new THREE.Vector3();

  constructor() {
    this.root = new THREE.Group();

    const capsuleGeo = new THREE.CapsuleGeometry(DOG_WIDTH / 2, DOG_HEIGHT - DOG_WIDTH, 6, 12);
    const capsuleMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8, metalness: 0.0 });
    this.placeholder = new THREE.Mesh(capsuleGeo, capsuleMat);
    this.placeholder.position.y = DOG_HEIGHT / 2;
    this.placeholder.castShadow = true;
    this.root.add(this.placeholder);

    // Glowing red eyes near the head
    this.eyeGeometry = new THREE.SphereGeometry(0.09, 8, 8);
    this.eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 2.5,
    });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(this.eyeGeometry, this.eyeMaterial);
      eye.position.set(side * 0.22, DOG_HEIGHT * 0.82, DOG_HEIGHT * 0.52);
      this.root.add(eye);
      this.eyes.push(eye);
    }

    // Sinister red glow around the dog
    this.glow = new THREE.PointLight(0xff2211, 1.2, 10, 1.5);
    this.glow.position.set(0, DOG_HEIGHT * 0.6, 0);
    this.root.add(this.glow);
  }

  /** Kick off the async model load; falls back to the capsule on failure */
  loadModel(): void {
    loadCharacterRig(DOG_MODEL_URL, { targetHeight: DOG_HEIGHT, facingOffsetY: -Math.PI / 2 })
      .then((rig) => {
        this.rig = rig;
        // Re-tint the fur toward a darker, mutated look (clone shared materials first)
        rig.root.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material = child.material.clone();
            child.material.color.setHex(MUTANT_TINT);
          }
        });
        this.root.add(rig.root);
        // Track the head bone so the glowing eyes sit on the face
        rig.root.traverse((child) => {
          if (!this.headBone && /head/i.test(child.name)) {
            this.headBone = child;
          }
        });
        if (this.placeholder) {
          this.root.remove(this.placeholder);
          this.placeholder.geometry.dispose();
          (this.placeholder.material as THREE.Material).dispose();
          this.placeholder = null;
        }
        this.applyStateClip();
      })
      .catch((err) => {
        console.warn('[DogVisual] Model load failed, keeping capsule placeholder:', err);
      });
  }

  /** Update the visual animation state */
  setState(state: DogAnimationState): void {
    if (state === this.state) return;
    this.state = state;
    this.applyStateClip();
  }

  /** Whether the dog is right behind the player (speeds up animation, brightens glow) */
  setCloseWarning(active: boolean): void {
    if (active === this.closeWarning) return;
    this.closeWarning = active;
    this.applyStateClip();
  }

  /** Advance animations and glow pulse */
  update(dt: number): void {
    this.time += dt;
    this.rig?.update(dt);

    // Keep the eyes glued to the (animated) head
    if (this.headBone) {
      this.headBone.getWorldPosition(this.headWorld);
      this.root.worldToLocal(this.headWorld);
      for (let i = 0; i < this.eyes.length; i++) {
        const side = i === 0 ? -1 : 1;
        this.eyes[i].position.set(
          this.headWorld.x + side * 0.24,
          this.headWorld.y + 0.1,
          this.headWorld.z + 0.55,
        );
      }
    }

    const chasing = this.state === DogAnimationState.Chase;
    const base = chasing ? 2.6 : 1.0;
    const pulse = Math.sin(this.time * (chasing ? 9 : 3)) * 0.35;
    this.glow.intensity = base + pulse + (this.closeWarning ? 1.2 : 0);
    this.eyeMaterial.emissiveIntensity = chasing ? 4.0 : 2.5;
  }

  private applyStateClip(): void {
    const { clip, timeScale } = STATE_CLIPS[this.state];
    const boost = this.closeWarning && this.state === DogAnimationState.Chase ? 1.3 : 1;
    this.rig?.play(clip, { timeScale: timeScale * boost });
  }

  dispose(): void {
    this.rig?.dispose();
    this.rig = null;
    for (const eye of this.eyes) this.root.remove(eye);
    this.eyes.length = 0;
    this.eyeGeometry.dispose();
    this.eyeMaterial.dispose();
    if (this.placeholder) {
      this.placeholder.geometry.dispose();
      (this.placeholder.material as THREE.Material).dispose();
      this.placeholder = null;
    }
    this.root.removeFromParent();
  }
}
