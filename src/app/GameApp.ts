import * as THREE from 'three';
import { ThreeRenderer } from '../engine/rendering/ThreeRenderer';
import { EnvironmentSystem } from '../engine/rendering/EnvironmentSystem';
import { CameraShake } from '../engine/camera/CameraShake';
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
import { GameOverScreen } from '../gameplay/ui/GameOverScreen';
import { TitleScreen } from '../gameplay/ui/TitleScreen';
import {
  CAMERA_DISTANCE,
  CAMERA_EXPLORATION_FOV,
  CAMERA_CHASE_FOV,
  CAMERA_NEAR_DOG_FOV,
} from '../config/constants';
import type { GameContext } from './GameContext';

export class GameApp {
  private ctx!: GameContext;
  private stateMachine = new SceneStateMachine();
  private loop = new GameLoop();
  private hud = new Hud();
  private levelSelectScreen: LevelSelectScreen | null = null;
  private gameOverScreen: GameOverScreen | null = null;
  private titleScreen: TitleScreen | null = null;
  private saveService: SaveService;
  private playerUpgradeService: PlayerUpgradeService;
  private environment: EnvironmentSystem | null = null;
  private cameraShake = new CameraShake();

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

    // Level select screen (hidden until title screen play)
    this.levelSelectScreen = new LevelSelectScreen(
      this.saveService,
      (levelId) => this.startLevel(levelId),
      () => this.showTitle(),
    );
    this.levelSelectScreen.attach(container);
    this.levelSelectScreen.hide();

    // Game over screen (hidden until caught)
    this.gameOverScreen = new GameOverScreen();
    this.gameOverScreen.attach(container);
    this.gameOverScreen.onRestart = () => {
      const currentId = this.ctx.levelManager.currentId;
      if (currentId) {
        this.gameOverScreen?.hide();
        this.startLevel(currentId);
      }
    };

    // Title screen (shown first — press Enter to play)
    this.titleScreen = new TitleScreen();
    this.titleScreen.attach(container);
    this.titleScreen.onPlay = () => {
      // First user gesture — browsers allow audio to start from here
      void this.ctx?.audio.context?.resume();
      this.titleScreen?.hide();
      this.showLevelSelect();
    };
    this.titleScreen.show();

    // Attach input
    const input = new InputManager();
    input.attach(window);

    // Scene setup — sky, lighting, snow ground, falling snow
    this.environment = new EnvironmentSystem(renderer.scene);
    renderer.environment = this.environment;

    // Physics
    const physics = new PhysicsWorld();
    await physics.init();
    physics.addStaticGroundCollider(200, -0.5);

    // Camera rig — behind the player, facing down-route (+z)
    const cameraRig = new ThirdPersonCameraRig(renderer.camera);
    cameraRig.setAzimuth(-Math.PI / 2);
    cameraRig.setDistance(CAMERA_DISTANCE);

    // Player
    const player = new Player(physics, cameraRig);
    player.root.position.set(0, 4, 0);
    renderer.scene.add(player.root);
    player.visual.loadModel();

    // Systems
    const entityManager = new EntityManager();
    const assets = new AssetManager();
    const audio = new AudioManager();
    // Without init() every audio call throws, which used to abort level
    // loading before the dog/hazards were spawned.
    audio.init();
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
    // Expose for debugging in dev builds (harmless in production bundles)
    (window as unknown as Record<string, unknown>).__snowbound = this.ctx;
    console.log('[Snowbound] Ready.');
    this.loop.start(this.ctx, (ctx) => this.onFrame(ctx));
  }

  /** Per-render-frame updates: environment, camera effects, HUD */
  private onFrame(ctx: GameContext): void {
    const dt = ctx.clock.frameDelta ?? ctx.clock.delta;
    const camera = ctx.renderer.camera;
    const playerPos = ctx.player.root.position;

    this.environment?.update(dt, camera.position, playerPos);

    // FOV kick: widen during the chase, more when the dog is right behind
    const director = ctx.levelManager.chaseDirector;
    const chasing = director?.chaseActive === true && !director.caught && !director.complete;
    let targetFov = CAMERA_EXPLORATION_FOV;
    if (chasing) {
      targetFov = director!.closeWarning ? CAMERA_NEAR_DOG_FOV : CAMERA_CHASE_FOV;
    }
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-4 * dt));
      camera.updateProjectionMatrix();
    }

    // Rumble while the dog is breathing down Jim's neck
    if (chasing && director!.closeWarning) {
      this.cameraShake.trigger(0.12);
    }
    if (this.cameraShake.isShaking) {
      camera.position.add(this.cameraShake.getOffset(dt));
    }

    this.hud.update(ctx.clock.delta, ctx);
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
      ctx.player.root.position.set(spawn.x, spawn.y - 0.9, spawn.z);
      const rig = ctx.player.getCameraRig();
      rig.setAzimuth(-Math.PI / 2); // face down-route after restarts too
      rig.teleport(new THREE.Vector3(spawn.x, spawn.y + 1.4, spawn.z));
    }

    if (ctx.levelManager.chaseDirector) {
      ctx.levelManager.chaseDirector.onCatchPlayer = () => {
        this.cameraShake.trigger(0.9);
        this.gameOverScreen?.show();
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

  /**
   * Go back to the title screen from the level select.
   */
  private showTitle(): void {
    this.hud.hide();
    this.levelSelectScreen?.hide();
    this.titleScreen?.show();
  }
}
