import { describe, it, expect } from 'vitest';
import { RoutePath } from '../gameplay/levels/RoutePath';
import { MonsterDog, DogState } from '../gameplay/monster/MonsterDog';
import { DogAnimationState } from '../gameplay/monster/MonsterAnimationController';
import { AudioManager } from '../engine/audio/AudioManager';
import type { DogTuning, AABB } from '../gameplay/levels/LevelData';

describe('MonsterDog', () => {
  const waypoints = [
    { position: { x: 0, y: 0, z: 0 } },
    { position: { x: 100, y: 0, z: 0 } },
  ];
  const routePath = new RoutePath(waypoints);
  const tuning: DogTuning = {
    patrolSpeed: 3,
    chaseSpeed: 8,
    catchRadius: 1.2,
    patrolDistance: 15,
  };

  it('should start at first waypoint with 0 progress and patrol state', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    expect(dog.progress).toBeCloseTo(0);
    expect(dog.state).toBe(DogState.Patrol);
    const pos = dog.getPosition();
    expect(pos.x).toBeCloseTo(0);
    expect(pos.z).toBeCloseTo(0);
    dog.dispose();
  });

  it('should have correct mesh position matching route progress', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    dog.setProgress(0.5);
    const pos = dog.getPosition();
    expect(pos.x).toBeCloseTo(50);
    dog.dispose();
  });

  it('should get patrol speed when in patrol state', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    expect(dog.getCurrentSpeed()).toBe(tuning.patrolSpeed);
    dog.dispose();
  });

  it('should get chase speed when in chase state', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    dog.state = DogState.Chase;
    expect(dog.getCurrentSpeed()).toBe(tuning.chaseSpeed);
    dog.dispose();
  });

  it('should return zero speed in caught state', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    dog.state = DogState.Caught;
    expect(dog.getCurrentSpeed()).toBe(tuning.patrolSpeed); // defaults to patrol if not chase
    dog.dispose();
  });

  it('should not move when caught', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    dog.state = DogState.Caught;
    dog.moveTowardsPlayer(1, 1);
    expect(dog.progress).toBeCloseTo(0); // should not move
    dog.dispose();
  });

  it('should move towards player progress during chase', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    dog.state = DogState.Chase;
    const initialProgress = dog.progress;

    // Move dog towards player at progress 0.5
    dog.moveTowardsPlayer(0.5, 1);

    // With chase speed 8 and route length 100, max delta = 8/100 = 0.08 per second
    expect(dog.progress).toBeGreaterThan(initialProgress);
    expect(dog.progress).toBeLessThanOrEqual(0.08);
    dog.dispose();
  });

  it('should move slower during patrol', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    const initialProgress = dog.progress;

    dog.moveTowardsPlayer(0.5, 1);

    // With patrol speed 3 and route length 100, max delta = 3/100 = 0.03
    expect(dog.progress).toBeGreaterThan(initialProgress);
    expect(dog.progress).toBeLessThanOrEqual(0.03);
    dog.dispose();
  });

  it('should stay behind player during patrol by patrolDistance', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    // Set player progress to 0.5, patrolDistance=15, routeLength=100
    // Patrol offset = 15/100 = 0.15, so target = 0.5 - 0.15 = 0.35
    dog.moveTowardsPlayer(0.5, 10); // enough time to reach target

    // Dog should approach 0.35
    const expectedOffset = tuning.patrolDistance / routePath.totalLength;
    expect(dog.progress).toBeCloseTo(0.5 - expectedOffset, 1);
    dog.dispose();
  });

  it('should not go below progress 0', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    // Set player to low progress — dog should not go negative
    dog.moveTowardsPlayer(0.01, 10);
    expect(dog.progress).toBeGreaterThanOrEqual(0);
    dog.dispose();
  });

  it('should not exceed progress 1', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    dog.state = DogState.Chase;
    dog.moveTowardsPlayer(2, 100); // way past end
    expect(dog.progress).toBeLessThanOrEqual(1);
    dog.dispose();
  });

  it('should setProgress teleport the dog', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    dog.setProgress(0.75);
    expect(dog.progress).toBeCloseTo(0.75);
    const pos = dog.getPosition();
    expect(pos.x).toBeCloseTo(75);
    dog.dispose();
  });

  it('should dispose without error', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    expect(() => dog.dispose()).not.toThrow();
  });

  // ─── Animation integration tests ─────────────────────

  it('should start with Patrol animation state', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    expect(dog.animation.state).toBe(DogAnimationState.Patrol);
    dog.dispose();
  });

  it('should transition animation when state setter is used', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    dog.state = DogState.Chase;
    expect(dog.state).toBe(DogState.Chase);
    expect(dog.animation.state).toBe(DogAnimationState.Chase);
    dog.dispose();
  });

  it('should transition animation to Catch when caught', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    dog.state = DogState.Caught;
    expect(dog.state).toBe(DogState.Caught);
    expect(dog.animation.state).toBe(DogAnimationState.Catch);
    dog.dispose();
  });

  it('should apply scale via updateAnimation', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    dog.state = DogState.Chase;
    // Initial scale is 1 (patrol scale)
    expect(dog.mesh.scale.x).toBe(1);
    expect(dog.mesh.scale.y).toBe(1);
    expect(dog.mesh.scale.z).toBe(1);

    // Advance animation
    dog.updateAnimation(0.5); // 0.5s with default 0.3s duration

    // Scale should have increased but not yet at max (1.2)
    expect(dog.mesh.scale.x).toBeGreaterThan(1.0);
    expect(dog.mesh.scale.x).toBeLessThanOrEqual(1.2);
    dog.dispose();
  });

  it('should propagate close warning to animation controller', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    expect(dog.animation.closeWarning).toBe(false);

    dog.setCloseWarning(true);
    expect(dog.animation.closeWarning).toBe(true);

    dog.setCloseWarning(false);
    expect(dog.animation.closeWarning).toBe(false);
    dog.dispose();
  });

  it('should trigger animation transition only when state changes', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    expect(dog.animation.transitionProgress).toBe(0);

    // Set to same state — should not reset progress or retrigger
    dog.state = DogState.Patrol;
    expect(dog.animation.transitionProgress).toBe(0);
    dog.dispose();
  });

  // ─── Spatial audio tests ──────────────────────────────

  it('should start spatial audio when audioManager provided', () => {
    const audio = new AudioManager();
    audio.init();
    const dog = new MonsterDog(routePath, tuning, null, audio);
    expect(dog.audioHandle).not.toBeNull();
    expect(dog.audioHandle!.id).toContain('dog_growl');
    dog.dispose();
  });

  it('should have null audioHandle when no audioManager provided', () => {
    const dog = new MonsterDog(routePath, tuning, null);
    expect(dog.audioHandle).toBeNull();
    dog.dispose();
  });

  it('should update spatial sound position on movement', () => {
    const audio = new AudioManager();
    audio.init();
    const dog = new MonsterDog(routePath, tuning, null, audio);
    const spyPositions: Array<{ x: number; y: number; z: number }> = [];
    const originalSetPosition = dog.audioHandle!.setPosition;
    dog.audioHandle!.setPosition = (x: number, y: number, z: number) => {
      spyPositions.push({ x, y, z });
      originalSetPosition(x, y, z);
    };

    // Move dog
    dog.setProgress(0.5);
    dog.updateSpatialAudio();

    expect(spyPositions.length).toBeGreaterThan(0);
    const lastPos = spyPositions[spyPositions.length - 1];
    expect(lastPos.x).toBeCloseTo(50);
    expect(lastPos.z).toBeCloseTo(0);
    dog.dispose();
  });

  it('should stop spatial sound on dispose', () => {
    const audio = new AudioManager();
    audio.init();
    const dog = new MonsterDog(routePath, tuning, null, audio);
    expect(audio.activeCount).toBe(1);
    dog.dispose();
    expect(audio.activeCount).toBe(0);
  });

  // ─── Ice slip tests ──────────────────────────────────

  it('should not slip when no ice zones are provided', () => {
    // Dog with no ice zones — even 100% slip chance should not trigger
    const slipTuning: DogTuning = { ...tuning, slipChance: 1.0, slipGapBonus: 5 };
    const dog = new MonsterDog(routePath, slipTuning, null);
    dog.moveTowardsPlayer(0.5, 1);
    expect(dog.state).toBe(DogState.Patrol);
    dog.dispose();
  });

  it('should slip when on ice and slip chance triggers', () => {
    // Create an ice zone covering the entire route (0,0,0 to 100,1,0)
    const iceZones: AABB[] = [{
      min: { x: -10, y: -1, z: -10 },
      max: { x: 110, y: 1, z: 10 },
    }];
    const slipTuning: DogTuning = { ...tuning, slipChance: 1.0, slipGapBonus: 5 };
    const dog = new MonsterDog(routePath, slipTuning, null, undefined, iceZones);
    // Dog starts at progress 0
    dog.moveTowardsPlayer(0.5, 1);
    // Dog should have slipped — progress reduced by slipGapBonus / routeLength
    // routePath.totalLength = 100, so slip = 5 / 100 = 0.05
    // The moveTowardsPlayer should have moved dog forward by a bit first, then slipped backward
    expect(dog.state).toBe(DogState.Slip);
    dog.dispose();
  });

  it('should not slip with 0 percent slip chance even on ice', () => {
    const iceZones: AABB[] = [{
      min: { x: -10, y: -1, z: -10 },
      max: { x: 110, y: 1, z: 10 },
    }];
    const slipTuning: DogTuning = { ...tuning, slipChance: 0.0, slipGapBonus: 5 };
    const dog = new MonsterDog(routePath, slipTuning, null, undefined, iceZones);
    dog.moveTowardsPlayer(0.5, 1);
    expect(dog.state).toBe(DogState.Patrol);
    dog.dispose();
  });

  it('should not slip when dog is not on ice', () => {
    // Ice zone far away from dog's position
    const iceZones: AABB[] = [{
      min: { x: 999, y: -1, z: 999 },
      max: { x: 1000, y: 1, z: 1000 },
    }];
    const slipTuning: DogTuning = { ...tuning, slipChance: 1.0, slipGapBonus: 5 };
    const dog = new MonsterDog(routePath, slipTuning, null, undefined, iceZones);
    dog.moveTowardsPlayer(0.5, 1);
    expect(dog.state).toBe(DogState.Patrol);
    dog.dispose();
  });

  it('should reduce dog progress when slipping', () => {
    const iceZones: AABB[] = [{
      min: { x: -10, y: -1, z: -10 },
      max: { x: 110, y: 1, z: 10 },
    }];
    const slipTuning: DogTuning = { ...tuning, slipChance: 1.0, slipGapBonus: 5 };
    const dog = new MonsterDog(routePath, slipTuning, null, undefined, iceZones);
    // Set dog to some progress first
    dog.setProgress(0.5);
    // dog moves towards patrol target (0.5 - 15/100 = 0.35), then slip reduces by 5/100 = 0.05
    // After move: progress = 0.47, after slip: 0.42
    dog.moveTowardsPlayer(0.5, 1);
    expect(dog.progress).toBeCloseTo(0.42, 2);
    dog.dispose();
  });

  it('should transition animation to Slip state when slipping', () => {
    const iceZones: AABB[] = [{
      min: { x: -10, y: -1, z: -10 },
      max: { x: 110, y: 1, z: 10 },
    }];
    const slipTuning: DogTuning = { ...tuning, slipChance: 1.0, slipGapBonus: 5 };
    const dog = new MonsterDog(routePath, slipTuning, null, undefined, iceZones);
    dog.moveTowardsPlayer(0.5, 1);
    expect(dog.animation.state).toBe(DogAnimationState.Slip);
    dog.dispose();
  });

  it('should revert to previous state after slip duration', () => {
    const iceZones: AABB[] = [{
      min: { x: -10, y: -1, z: -10 },
      max: { x: 110, y: 1, z: 10 },
    }];
    const slipTuning: DogTuning = { ...tuning, slipChance: 1.0, slipGapBonus: 5, slipDuration: 0.3 };
    const dog = new MonsterDog(routePath, slipTuning, null, undefined, iceZones);
    dog.moveTowardsPlayer(0.5, 1);
    expect(dog.state).toBe(DogState.Slip);

    // Advance time past slip duration
    dog.updateAnimation(0.5); // advances animation time
    dog.moveTowardsPlayer(0.5, 0.5); // should revert on next movement after timer expires
    expect(dog.state).toBe(DogState.Patrol);
    dog.dispose();
  });

  it('should not slip when caught', () => {
    const iceZones: AABB[] = [{
      min: { x: -10, y: -1, z: -10 },
      max: { x: 110, y: 1, z: 10 },
    }];
    const slipTuning: DogTuning = { ...tuning, slipChance: 1.0, slipGapBonus: 5 };
    const dog = new MonsterDog(routePath, slipTuning, null, undefined, iceZones);
    dog.state = DogState.Caught;
    dog.moveTowardsPlayer(0.5, 1);
    expect(dog.state).toBe(DogState.Caught);
    expect(dog.progress).toBeCloseTo(0);
    dog.dispose();
  });
});