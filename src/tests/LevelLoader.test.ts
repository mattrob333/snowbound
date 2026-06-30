import { describe, it, expect, beforeAll } from 'vitest';
import { PhysicsWorld } from '../engine/physics/PhysicsWorld';
import { LevelLoader } from '../gameplay/levels/LevelLoader';
import type { LevelData } from '../gameplay/levels/LevelData';

const sampleLevel: LevelData = {
  meta: { id: 'test-level', name: 'Test', description: 'A test level', order: 1 },
  atmosphere: {},
  playerSpawn: { x: 0, y: 1, z: -8 },
  terrain: [
    { position: { x: 0, y: -0.5, z: 0 }, halfExtents: { x: 10, y: 0.5, z: 10 }, rotationY: 0, color: 15066597 },
    { position: { x: 0, y: 0, z: 10 }, halfExtents: { x: 4, y: 0.25, z: 2 }, rotationY: 0 },
  ],
  obstacles: [
    { type: 'jump_over', position: { x: -2, y: 0, z: 3 }, halfExtents: { x: 1, y: 0.5, z: 1 }, color: 13369344 },
    { type: 'slide_under', position: { x: 0, y: 1.8, z: 7 }, halfExtents: { x: 3, y: 0.25, z: 1 } },
  ],
  dogRoute: [
    { position: { x: 0, y: 0, z: -15 } },
    { position: { x: 0, y: 0, z: 15 } },
  ],
  dogTuning: { patrolSpeed: 3, chaseSpeed: 8, catchRadius: 1.2, patrolDistance: 15 },
  helicopterPart: { position: { x: 0, y: 1, z: 6 }, partId: 'test_part' },
  safeZone: { position: { x: 0, y: 0.5, z: 14 }, radius: 3, requiresPart: true },
  powerups: [],
  hazards: [],
};

describe('LevelLoader', () => {
  let physics: PhysicsWorld;
  let loader: LevelLoader;

  beforeAll(async () => {
    physics = new PhysicsWorld();
    await physics.init();
    physics.addStaticGroundCollider(200, -0.5);
    physics.step(1 / 60);
    loader = new LevelLoader(physics, null);
  });

  it('should create loader with physics and no renderer', () => {
    expect(loader).toBeDefined();
  });

  it('should validate and reject missing meta.id', () => {
    const bad = { ...sampleLevel, meta: { id: '', name: '', description: '', order: 0 } };
    expect(() => loader.spawnLevel(bad)).toThrow('Level data missing meta.id');
  });

  it('should reject missing playerSpawn', () => {
    const rest: LevelData = JSON.parse(JSON.stringify(sampleLevel));
    delete (rest as unknown as Record<string, unknown>).playerSpawn;
    expect(() => loader.spawnLevel(rest as LevelData)).toThrow('missing');
  });

  it('should spawn a level and return runtime', () => {
    const runtime = loader.spawnLevel(sampleLevel);
    expect(runtime).toBeDefined();
    expect(runtime.levelData.meta.id).toBe('test-level');
    expect(runtime.playerSpawn).toEqual({ x: 0, y: 1, z: -8 });
  });

  it('should spawn terrain meshes for each terrain piece', () => {
    const runtime = loader.spawnLevel(sampleLevel);
    expect(runtime.terrainMeshes.length).toBe(2);
    expect(runtime.terrainBodies.length).toBe(2);
  });

  it('should spawn obstacle meshes for each obstacle', () => {
    const runtime = loader.spawnLevel(sampleLevel);
    expect(runtime.obstacleMeshes.length).toBe(2);
    expect(runtime.obstacleBodies.length).toBe(2);
  });

  it('should spawn helicopter part mesh and body', () => {
    const runtime = loader.spawnLevel(sampleLevel);
    expect(runtime.partMesh).not.toBeNull();
    expect(runtime.partBody).not.toBeNull();
  });

  it('should spawn safe zone mesh and body', () => {
    const runtime = loader.spawnLevel(sampleLevel);
    expect(runtime.safeZoneMesh).not.toBeNull();
    expect(runtime.safeZoneBody).not.toBeNull();
  });

  it('should unload a level and remove all bodies from physics world', () => {
    const runtime = loader.spawnLevel(sampleLevel);
    const bodyCountBefore = physics.world.bodies.len();

    loader.unloadLevel(runtime);

    const bodyCountAfter = physics.world.bodies.len();
    const expectedRemoved = 2 + 2 + 1 + 1; // terrain + obstacles + part + safeZone
    expect(bodyCountAfter).toBe(bodyCountBefore - expectedRemoved);
  });

  it('should support spawning and unloading multiple levels', () => {
    const r1 = loader.spawnLevel(sampleLevel);
    const r2 = loader.spawnLevel(sampleLevel);
    const countBefore = physics.world.bodies.len();

    loader.unloadLevel(r1);
    const countAfter1 = physics.world.bodies.len();
    // After one unload, body count dropped
    expect(countAfter1).toBeLessThan(countBefore);

    loader.unloadLevel(r2);
    const countAfter2 = physics.world.bodies.len();
    // After two unloads, even fewer
    expect(countAfter2).toBeLessThanOrEqual(countAfter1);
  });

  it('should spawn hazards when provided', () => {
    const levelWithHazards: LevelData = {
      ...sampleLevel,
      hazards: [
        { type: 'falling_ice', position: { x: 3, y: 5, z: 2 }, halfExtents: { x: 1, y: 1, z: 1 }, triggerRadius: 4, fallDelay: 1.5 },
      ],
    };
    const runtime = loader.spawnLevel(levelWithHazards);
    expect(runtime.hazardMeshes.length).toBe(1);
    expect(runtime.hazardBodies.length).toBe(1);

    loader.unloadLevel(runtime);
  });
});