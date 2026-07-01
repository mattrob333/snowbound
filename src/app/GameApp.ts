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
import { SceneStateMachine } from './SceneStateMachine';
import { Player } from '../gameplay/player/Player';
import { PlayerUpgradeService } from '../gameplay/player/PlayerUpgradeService';
import { ThirdPersonCameraRig } from '../engine/camera/ThirdPersonCameraRig';
import { Hud } from '../gameplay/ui/Hud';
import { LevelSelectScreen } from '../gameplay/ui/LevelSelectScreen';
import { CAMERA_DISTANCE } from '../config/constants';
import type { GameContext } from './GameContext';

export class GameApp {
  private ctx!: GameContext;
  private stateMachine = new SceneStateMachine();
  private loop = new GameLoop();
  private hud = new Hud();
  private levelSelectScreen: LevelSelectScreen | null = null;
  private saveService: SaveService;
  private playerUpgradeService: PlayerUpgradeService;

  constructor() {
    this.saveService = new SaveService();
    this.playerUpgradeService = new PlayerUpgradeService(this.saveService.getUpgrades());
  }

  async init(container: HTMLElement): Promise<void> {
    console.log('[Snowbound] Initializing...');

    const renderer = new ThreeRenderer();
    container.appendChild(renderer.renderer.domElement);

    // Attach HUD overlay
    this.hud.attach(container);
    this.hud.hide(); // Hidden until a level is active

    // Level select screen
    this.levelSelectScreen = new LevelSelectScreen(
      this.saveService,
      (levelId) => this.startLevel(levelId),
      () => this.showLevelSelect(),
    );
    this.levelSelectScreen.attach(container);
    this.levelSelectScreen.show();

    // Attach input
    const input = new InputManager();
    input.attach(window);

    // Scene setup
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.8, metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0xffffff, 0.8);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;

    const grid = new THREE.GridHelper(100, 20, 0x444444, 0x666666);

    renderer.scene.add(ground);
    renderer.scene.add(hemiLight);
    renderer.scene.add(dirLight);
    renderer.scene.fog = new THREE.Fog(0xbbc4d0, 30, 120);
    renderer.scene.add(grid);

    // Physics
    const physics = new PhysicsWorld();
    await physics.init();
    physics.addStaticGroundCollider(200, -0.5);

    // Camera rig
    const cameraRig = new ThirdPersonCameraRig(renderer.camera);
    cameraRig.setAzimuth(0);
    cameraRig.setDistance(CAMERA_DISTANCE);

    // Player
    const player = new Player(physics, cameraRig);
    player.mesh.position.set(0, 4, 0);
    renderer.scene.add(player.mesh);

    // Systems
    const entityManager = new EntityManager();
    const assets = new AssetManager();
    const audio = new AudioManager();
    const levelManager = new LevelManager(physics, renderer, audio);

    this.ctx = {
      renderer,
      physics,
      assets,
      audio,
      input,
      entityManager,
      levelManager,
      saveService: this.saveService,
      playerUpgradeService: this.playerUpgradeService,
      debug: new DebugOverlay(),
      player,
      clock: { elapsed: 0, delta: 0 },
    };

    // Wire upgrade pickup persistence: whenever PlayerUpgradeService adds an upgrade,
    // also persist to SaveService. Monkey-patch addUpgrade to be safe.
    const origAddUpgrade = this.playerUpgradeService.addUpgrade.bind(this.playerUpgradeService);
    this.playerUpgradeService.addUpgrade = (type) => {
      origAddUpgrade(type);
      this.saveService.addUpgrade(type);
    };

    this.stateMachine.setState('Boot' as never);
    console.log('[Snowbound] Ready.');
    this.loop.start(this.ctx, () => this.hud.update(this.ctx.clock.delta, this.ctx));
  }

  /**
   * Load a level and wire save callbacks.
   */
  private async loadLevelWithSave(levelId: string, entityManager: EntityManager): Promise<void> {
    const ctx = this.ctx;

    if (ctx.levelManager.isLevelLoaded) {
      ctx.levelManager.unloadCurrent();
    }
    entityManager.clear();

    await ctx.levelManager.loadLevel(levelId, entityManager, () => {
      // On part collect: mark player state and persist to save
      ctx.player.partCollected = true;
      ctx.saveService.addPart();
    });

    const spawn = ctx.levelManager.runtime?.playerSpawn;
    if (spawn) {
      ctx.player.kcc.setPosition(spawn);
      ctx.player.mesh.position.set(spawn.x, spawn.y - 0.9, spawn.z);
      ctx.player.getCameraRig().teleport(new THREE.Vector3(spawn.x, spawn.y + 1.4, spawn.z));
    }

    if (ctx.levelManager.chaseDirector) {
      ctx.levelManager.chaseDirector.onCatchPlayer = () => {
        console.log('[Snowbound] Player was caught by the dog.');
      };
    }

    // Wire level complete callback on the safe zone
    if (ctx.levelManager.safeZone) {
      ctx.levelManager.safeZone.onLevelComplete = () => {
        if (!ctx.levelManager.currentId) return;
        const partsCollected = 1;
        ctx.saveService.completeLevel(
          ctx.levelManager.currentId,
          ctx.clock.elapsed,
          partsCollected,
          ctx.playerUpgradeService.count,
          ctx.levelManager.chaseDirector?.caught !== true,
          );
        ctx.saveService.setLastLevelId(ctx.levelManager.currentId);
        console.log(`[Save] Level ${ctx.levelManager.currentId} saved on completion.`);
      };
    }
  }

  /**
   * Start a specific level from the level select screen.
   */
  private async startLevel(levelId: string): Promise<void> {
    this.levelSelectScreen?.hide();
    this.hud.show();

    this.ctx.player.resetLevelState();
    await this.loadLevelWithSave(levelId, this.ctx.entityManager);
  }

  /**
   * Show the level select screen.
   */
  private showLevelSelect(): void {
    this.hud.hide();
    this.levelSelectScreen?.show();
  }
}
