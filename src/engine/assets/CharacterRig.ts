import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

export interface CharacterRigOptions {
  /** Desired world height of the model in meters */
  targetHeight: number;
  /** Extra Y rotation so the model's face points down +Z (three.js lookAt forward) */
  facingOffsetY?: number;
}

export interface PlayOptions {
  /** Crossfade duration in seconds */
  fade?: number;
  /** Playback speed multiplier */
  timeScale?: number;
  /** Freeze the clip on its current frame (e.g. mid-air poses) */
  paused?: boolean;
}

/**
 * CharacterRig — a loaded, animated character model.
 *
 * The root group is normalised so the model's feet sit at the group origin
 * and it stands `targetHeight` meters tall. Animation clips are played by
 * name with automatic crossfading.
 */
export class CharacterRig {
  readonly root: THREE.Group;
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private current: THREE.AnimationAction | null = null;
  private currentName = '';

  constructor(gltf: GLTF, options: CharacterRigOptions) {
    const model = cloneSkeleton(gltf.scene);
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
      }
    });

    // Normalise: feet at origin, uniform scale so the model is targetHeight tall.
    // Measured from static geometry bounds — skinned (skeleton-aware) bounds are
    // unreliable before the skeleton has been posed.
    const bounds = measureStaticBounds(model);
    const size = new THREE.Vector3();
    bounds.getSize(size);
    const scale = size.y > 0 ? options.targetHeight / size.y : 1;

    const holder = new THREE.Group();
    holder.add(model);
    model.position.y = -bounds.min.y;
    holder.scale.setScalar(scale);
    holder.rotation.y = options.facingOffsetY ?? 0;

    this.root = new THREE.Group();
    this.root.add(holder);

    this.mixer = new THREE.AnimationMixer(model);
    for (const clip of gltf.animations) {
      this.actions.set(clip.name, this.mixer.clipAction(clip));
    }
  }

  /** Names of all available animation clips */
  get clipNames(): string[] {
    return [...this.actions.keys()];
  }

  /** Play a clip by name with crossfade. Re-playing the same clip only updates timeScale/paused. */
  play(name: string, options?: PlayOptions): void {
    const action = this.actions.get(name);
    if (!action) return;

    const timeScale = options?.timeScale ?? 1;
    const paused = options?.paused ?? false;

    if (this.currentName === name && this.current) {
      this.current.timeScale = timeScale;
      this.current.paused = paused;
      return;
    }

    const fade = options?.fade ?? 0.25;
    action.reset();
    action.timeScale = timeScale;
    action.paused = paused;
    if (this.current) {
      action.crossFadeFrom(this.current, fade, false);
    }
    action.play();
    this.current = action;
    this.currentName = name;
  }

  /** Advance animations by dt seconds */
  update(dt: number): void {
    this.mixer.update(dt);
  }

  /** Detach from the scene graph. Shared geometry/materials stay cached for reuse. */
  dispose(): void {
    this.mixer.stopAllAction();
    this.root.removeFromParent();
  }
}

/** Bounding box from raw (bind-pose) geometry transformed by node matrices */
function measureStaticBounds(root: THREE.Object3D): THREE.Box3 {
  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3();
  const childBox = new THREE.Box3();
  root.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
      childBox.copy(child.geometry.boundingBox!).applyMatrix4(child.matrixWorld);
      box.union(childBox);
    }
  });
  return box;
}

const gltfCache = new Map<string, Promise<GLTF>>();

/**
 * Load a character rig from a GLB url. The underlying glTF is fetched and
 * parsed once per url; each call returns an independent rig (skeleton clone).
 */
export function loadCharacterRig(url: string, options: CharacterRigOptions): Promise<CharacterRig> {
  let pending = gltfCache.get(url);
  if (!pending) {
    pending = new GLTFLoader().loadAsync(url);
    gltfCache.set(url, pending);
  }
  return pending.then((gltf) => new CharacterRig(gltf, options));
}
