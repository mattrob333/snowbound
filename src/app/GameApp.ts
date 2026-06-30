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
import { Player } from '../gameplay/player/Player';
import { ThirdPersonCameraRig } from '../engine/camera/ThirdPersonCameraRig';
import { CAMERA_DISTANCE } from '../config/constants';
import type { GameContext } from './GameContext';

export class GameApp {
  private ctx!: GameContext;
  private stateMachine = new SceneStateMachine();
  private loop = new GameLoop();

  async init(container: HTMLElement): Promise<void> {
    console.log('[Snowbound] Initializing...');

    const renderer = new ThreeRenderer();
    container.appendChild(renderer.renderer.domElement);

    // Attach input to window
    const input = new InputManager();
    input.attach(window);

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

    // Create third-person camera rig
    const cameraRig = new ThirdPersonCameraRig(renderer.camera);
    cameraRig.setAzimuth(0);
    cameraRig.setDistance(CAMERA_DISTANCE);

    // Create the player (includes CharacterKCC + PlayerController)
    const player = new Player(physics, cameraRig);
    player.mesh.position.set(0, 4, 0);
    renderer.scene.add(player.mesh);

    const entityManager = new EntityManager();
    const assets = new AssetManager();
    const audio = new AudioManager();
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
      player,
      clock: { elapsed: 0, delta: 0 },
    };

    this.stateMachine.setState(AppState.Boot);
    console.log('[Snowbound] Ready. Starting game loop.');
    this.loop.start(this.ctx);
  }
}