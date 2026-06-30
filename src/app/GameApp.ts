import * as THREE from 'three';
import { ThreeRenderer } from '../engine/rendering/ThreeRenderer';
import { PhysicsWorld } from '../engine/physics/PhysicsWorld';
import { AssetManager } from '../engine/assets/AssetManager';
import { AudioManager } from '../engine/audio/AudioManager';
import { InputManager } from '../engine/input/InputManager';
import { EntityManager } from '../gameplay/entities/EntityManager';
import { LevelManager } from '../gameplay/levels/LevelManager';
import { SaveService } from '../gameplay/save/SaveService';
import { DebugOverlay } from '../engine/debug/DebugOverlay';
import { GameLoop } from './GameLoop';
import { SceneStateMachine, AppState } from './SceneStateMachine';
import type { GameContext } from './GameContext';

export class GameApp {
  private ctx!: GameContext;
  private stateMachine = new SceneStateMachine();
  private loop = new GameLoop();

  async init(container: HTMLElement): Promise<void> {
    console.log('[Snowbound] Initializing...');

    const renderer = new ThreeRenderer();
    container.appendChild(renderer.renderer.domElement);

    // Add placeholder snowy ground
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    renderer.scene.add(ground);

    // Add hemisphere light
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0xffffff, 0.8);
    renderer.scene.add(hemiLight);

    // Add directional light
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    renderer.scene.add(dirLight);

    // Fog
    renderer.scene.fog = new THREE.Fog(0xbbc4d0, 30, 120);

    // Debug grid
    const grid = new THREE.GridHelper(100, 20, 0x444444, 0x666666);
    renderer.scene.add(grid);

    const physics = new PhysicsWorld();
    await physics.init();

    // Add static ground collider matching the visual snow plane
    physics.addStaticGroundCollider(200, -0.5);

    // Add a simple test box
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x44aaff });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(0, 1.5, 2);
    renderer.scene.add(box);

    const entityManager = new EntityManager();
    const assets = new AssetManager();
    const audio = new AudioManager();
    const input = new InputManager();
    const levelManager = new LevelManager();
    const saveService = new SaveService();
    const debug = new DebugOverlay();

    this.ctx = {
      renderer,
      physics,
      assets,
      audio,
      input,
      entityManager,
      levelManager,
      saveService,
      debug,
      clock: { elapsed: 0, delta: 0 },
    };

    this.stateMachine.setState(AppState.Boot);
    console.log('[Snowbound] Ready. Starting game loop.');
    this.loop.start(this.ctx);
  }
}