import * as THREE from 'three';
import type { GameContext } from '../../app/GameContext';
import type { IGameEntity } from '../entities/EntityManager';
import { RoutePath } from '../levels/RoutePath';
import { MonsterDog } from './MonsterDog';
import { MonsterDistanceModel } from './MonsterDistanceModel';
import type { DogTuning, DogWaypoint, Vec3, AABB } from '../levels/LevelData';
import type { AudioManager } from '../../engine/audio/AudioManager';
import type { MusicLayerManager } from '../../engine/audio/MusicLayerManager';

/**
 * MonsterChaseDirector — coordinates the dog chase lifecycle for a level.
 *
 * States:
 * - patrol: dog follows route behind the player at patrolDistance
 * - chase: triggered when the player collects the helicopter part; dog speeds up
 * - caught: dog reached the player → game over
 * - complete: level completed (safe zone reached), dog stops
 *
 * This is added as a GameEntity to the EntityManager and ticked every frame.
 */
export class MonsterChaseDirector implements IGameEntity {
  readonly dog: MonsterDog;
  readonly distanceModel: MonsterDistanceModel;
  readonly routePath: RoutePath;
  private readonly worldCatchRadius: number;

  /** Whether the chase has been triggered */
  chaseActive = false;
  /** Whether the dog has caught the player */
  caught = false;
  /** Whether the level is complete (dog should stop) */
  complete = false;
  /** Whether the dog is close enough for the warning UI */
  closeWarning = false;

  /** Player progress along the route, computed each frame */
  playerProgress = 0;

  /** Callback fired when the dog catches the player */
  onCatchPlayer: (() => void) | null = null;

  /** Optional music layer manager for chase music crossfade */
  private _musicLayer: MusicLayerManager | null = null;

  get musicLayer(): MusicLayerManager | null {
    return this._musicLayer;
  }

  constructor(
    waypoints: DogWaypoint[],
    tuning: DogTuning,
    scene: THREE.Scene | null = null,
    audioManager?: AudioManager,
    musicLayer?: MusicLayerManager,
    iceZones?: AABB[],
  ) {
    this.routePath = new RoutePath(waypoints);
    this.dog = new MonsterDog(this.routePath, tuning, scene ? { scene } : null, audioManager, iceZones);
    this.distanceModel = new MonsterDistanceModel(
      8,  // close threshold — 8 units
      Math.max(tuning.catchRadius, 0.5),  // catch threshold from tuning
    );
    this._musicLayer = musicLayer ?? null;
    this.worldCatchRadius = Math.max(tuning.catchRadius, 1.8);
  }

  /** Move the dog to a specific spawn position */
  setSpawnPosition(spawnPos: Vec3): void {
    // Find closest progress on route to spawn position
    const progress = this.routePath.getClosestProgress(spawnPos);
    this.dog.setProgress(progress);
  }

  /** Trigger the chase (typically called when player collects the part) */
  startChase(): void {
    if (this.chaseActive || this.caught || this.complete) return;
    this.chaseActive = true;
    this.dog.state = 'chase';
  }

  /** Close the gap between dog and player by advancing the dog's progress */
  closeDogGap(amount: number): void {
    if (this.caught || this.complete) return;
    this.dog.setProgress(Math.min(1, this.dog.progress + amount));
  }

  update(_dt: number, ctx: GameContext): void {
    if (this.caught || this.complete) return;

    // Get player position
    const playerPos = ctx.player.kcc.getPosition();
    const pPos: Vec3 = { x: playerPos.x, y: playerPos.y, z: playerPos.z };

    // Compute player progress along the route
    this.playerProgress = this.routePath.getClosestProgress(pPos);

    // Check if part was collected → trigger chase
    if (!this.chaseActive && ctx.player.partCollected) {
      this.startChase();
    }

    const wasTouchingPlayer = this.isDogTouchingPlayer(pPos);

    // Move dog towards player
    this.dog.moveTowardsPlayer(this.playerProgress, ctx.clock.delta);

    // Advance dog animation controller
    this.dog.updateAnimation(ctx.clock.delta);

    // Evaluate gap
    const alert = this.distanceModel.evaluate(
      this.dog.progress,
      this.playerProgress,
      this.routePath.totalLength,
    );

    this.closeWarning = alert.close;
    this.dog.setCloseWarning(alert.close);

    // Update music layer crossfade based on dog gap
    this._musicLayer?.update(ctx.clock.delta, alert.gap, this.caught, this.complete);

    // Check catch condition
    if ((alert.caught || wasTouchingPlayer || this.isDogTouchingPlayer(pPos)) && this.chaseActive) {
      this.caught = true;
      this.dog.state = 'caught';
      this.onCatchPlayer?.();
    }
  }

  private isDogTouchingPlayer(playerPos: Vec3): boolean {
    const dogPos = this.dog.getPosition();
    const dx = dogPos.x - playerPos.x;
    const dz = dogPos.z - playerPos.z;
    return Math.hypot(dx, dz) <= this.worldCatchRadius;
  }

  dispose(): void {
    this._musicLayer?.dispose();
    this.dog.dispose();
  }
}
