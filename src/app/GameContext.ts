import type { ThreeRenderer } from '../engine/rendering/ThreeRenderer';
import type { PhysicsWorld } from '../engine/physics/PhysicsWorld';
import type { AssetManager } from '../engine/assets/AssetManager';
import type { AudioManager } from '../engine/audio/AudioManager';
import type { InputManager } from '../engine/input/InputManager';
import type { EntityManager } from '../gameplay/entities/EntityManager';
import type { LevelManager } from '../gameplay/levels/LevelManager';
import type { SaveService } from '../gameplay/save/SaveService';
import type { DebugOverlay } from '../engine/debug/DebugOverlay';
import type { Player } from '../gameplay/player/Player';
import type { PlayerUpgradeService } from '../gameplay/player/PlayerUpgradeService';

export interface GameClock {
  elapsed: number;
  delta: number;
  /** Render-frame delta (variable, unlike the fixed physics delta) */
  frameDelta?: number;
}

export interface GameContext {
  renderer: ThreeRenderer;
  physics: PhysicsWorld;
  assets: AssetManager;
  audio: AudioManager;
  input: InputManager;
  entityManager: EntityManager;
  levelManager: LevelManager;
  saveService: SaveService;
  playerUpgradeService: PlayerUpgradeService;
  debug: DebugOverlay;
  player: Player;
  clock: GameClock;
}