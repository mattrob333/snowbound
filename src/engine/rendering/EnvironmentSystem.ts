import * as THREE from 'three';
import { SnowParticleSystem } from './SnowParticleSystem';
import type { LevelAtmosphere } from '../../gameplay/levels/LevelData';

const SKY_ZENITH = '#4a79b8';
const SKY_MID = '#a3bedd';
const DEFAULT_FOG_COLOR = 0xcfd9e6;
const SUN_OFFSET = new THREE.Vector3(28, 46, 18);

/**
 * EnvironmentSystem — owns everything that makes the world look like a
 * snowy mountain day: gradient sky dome, hemisphere + sun lighting with
 * soft shadows that follow the player, a textured snow ground plane, and
 * the falling-snow particle field.
 */
export class EnvironmentSystem {
  private readonly scene: THREE.Scene;
  private readonly sun: THREE.DirectionalLight;
  private readonly sunTarget: THREE.Object3D;
  private readonly hemi: THREE.HemisphereLight;
  private readonly sky: THREE.Mesh;
  private readonly skyTexture: THREE.CanvasTexture;
  private readonly skyCanvas: HTMLCanvasElement;
  private readonly ground: THREE.Mesh;
  private readonly snow: SnowParticleSystem;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.skyCanvas = document.createElement('canvas');
    this.skyCanvas.width = 1;
    this.skyCanvas.height = 256;
    this.skyTexture = new THREE.CanvasTexture(this.skyCanvas);
    this.skyTexture.colorSpace = THREE.SRGBColorSpace;
    this.paintSkyGradient('#e9eff7');
    this.sky = this.createSkyDome();
    scene.add(this.sky);

    this.hemi = new THREE.HemisphereLight(0xbfd4ff, 0xf0f4f8, 0.9);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xfff2dd, 1.8);
    this.sun.position.copy(SUN_OFFSET);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 5;
    this.sun.shadow.camera.far = 160;
    this.sun.shadow.camera.left = -45;
    this.sun.shadow.camera.right = 45;
    this.sun.shadow.camera.top = 45;
    this.sun.shadow.camera.bottom = -45;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.sunTarget = new THREE.Object3D();
    scene.add(this.sunTarget);
    this.sun.target = this.sunTarget;
    scene.add(this.sun);

    this.ground = this.createSnowGround();
    scene.add(this.ground);

    scene.fog = new THREE.Fog(DEFAULT_FOG_COLOR, 40, 170);

    this.snow = new SnowParticleSystem({ particleCount: 1800, boxWidth: 50, boxHeight: 24, boxDepth: 50 });
    this.snow.init(scene);
  }

  /** Apply a level's atmosphere settings (fog colour/density, light intensities) */
  applyAtmosphere(atmo?: LevelAtmosphere): void {
    const fogColor = atmo?.fogColor ?? DEFAULT_FOG_COLOR;
    const density = atmo?.fogDensity ?? 0.003;
    const far = THREE.MathUtils.clamp(60 + 0.45 / Math.max(density, 0.001), 80, 240);
    this.scene.fog = new THREE.Fog(fogColor, far * 0.25, far);

    this.hemi.intensity = 0.9 * (atmo?.ambientIntensity ?? 1);
    this.sun.intensity = 1.8 * (atmo?.directionalIntensity ?? 1);

    // Blend the sky horizon into the level's fog colour so they read as one
    this.paintSkyGradient('#' + fogColor.toString(16).padStart(6, '0'));
  }

  /** Follow the action: recentre shadows and snowfall each frame */
  update(dt: number, cameraPosition: THREE.Vector3, focus: THREE.Vector3): void {
    this.sunTarget.position.copy(focus);
    this.sun.position.copy(focus).add(SUN_OFFSET);
    this.sky.position.set(cameraPosition.x, 0, cameraPosition.z);
    this.snow.update(dt, cameraPosition);
  }

  private createSkyDome(): THREE.Mesh {
    const material = new THREE.MeshBasicMaterial({
      map: this.skyTexture,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 24, 16), material);
    sky.renderOrder = -1;
    return sky;
  }

  /** Repaint the sky gradient with a given horizon colour (usually the fog colour) */
  private paintSkyGradient(horizonColor: string): void {
    const ctx = this.skyCanvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, SKY_ZENITH);
    gradient.addColorStop(0.55, SKY_MID);
    gradient.addColorStop(1, horizonColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1, 256);
    this.skyTexture.needsUpdate = true;
  }

  private createSnowGround(): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f2f5f9';
    ctx.fillRect(0, 0, 256, 256);
    // Subtle speckle so the snow reads as a surface while running
    for (let i = 0; i < 1400; i++) {
      const shade = 235 + Math.floor(Math.random() * 20);
      ctx.fillStyle = `rgb(${shade - 8},${shade - 4},${shade})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
    }
    // A few bright sparkle points
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 60; i++) {
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(48, 48);
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.92,
      metalness: 0,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    return ground;
  }

  dispose(): void {
    this.snow.dispose();
    for (const obj of [this.sky, this.ground]) {
      this.scene.remove(obj);
      const mesh = obj as THREE.Mesh;
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.scene.remove(this.sun, this.sunTarget, this.hemi);
  }
}
