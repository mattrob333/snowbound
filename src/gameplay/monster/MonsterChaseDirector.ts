import * as THREE from 'three';
import type { GameContext } from '../../app/GameContext';
import type { IGameEntity } from '../entities/EntityManager';
import { RoutePath } from '../levels/RoutePath';
import { MonsterDog } from './MonsterDog';
import { MonsterDistanceModel } from './MonsterDistanceModel';
import type { DogTuning, DogWaypoint, Vec3 } from '../levels/LevelData';
import type { AudioManager } from '../../engine/audio/AudioManager';

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

  constructor(
    waypoints: DogWaypoint[],
    tuning: DogTuning,
    scene: THREE.Scene | null = null,
    audioManager?: AudioManager,
  ) {
    this.routePath = new RoutePath(waypoints);
    this.dog = new MonsterDog(this.routePath, tuning, scene ? { scene } : null, audioManager);
    this.distanceModel = new MonsterDistanceModel(
      8,  // close threshold — 8 units
      Math.max(tuning.catchRadius, 0.5),  // catch threshold from tuning
    );
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

    // Check catch condition
    if (alert.caught && this.chaseActive) {
      this.caught = true;
      this.dog.state = 'caught';
      this.onCatchPlayer?.();
    }
  }

  dispose(): void {
    this.dog.dispose();
  }
}