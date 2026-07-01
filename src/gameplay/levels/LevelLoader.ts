import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { PhysicsWorld } from '../../engine/physics/PhysicsWorld';
import type { ThreeRenderer } from '../../engine/rendering/ThreeRenderer';
import type { LevelData, TerrainPiece, ObstacleData } from './LevelData';
import { CollisionGroups } from '../../engine/physics/CollisionGroups';

/** Runtime handle for a loaded level — tracks spawned objects for cleanup */
export interface LevelRuntime {
  levelData: LevelData;
  terrainMeshes: THREE.Mesh[];
  terrainBodies: RAPIER.RigidBody[];
  obstacleMeshes: THREE.Mesh[];
  obstacleBodies: RAPIER.RigidBody[];
  hazardMeshes: THREE.Mesh[];
  hazardBodies: RAPIER.RigidBody[];
  playerSpawn: { x: number; y: number; z: number };
}

export class LevelLoader {
  private physics: PhysicsWorld;
  private renderer: ThreeRenderer | null;

  constructor(physics: PhysicsWorld, renderer: ThreeRenderer | null = null) {
    this.physics = physics;
    this.renderer = renderer;
  }

  /** Fetch and parse a level JSON file */
  async loadLevelData(levelPath: string): Promise<LevelData> {
    const response = await fetch(levelPath);
    if (!response.ok) {
      throw new Error(`Failed to load level data from ${levelPath}: ${response.statusText}`);
    }
    const data: LevelData = await response.json();
    this.validateLevelData(data);
    return data;
  }

  /** Validate minimal required fields */
  private validateLevelData(data: LevelData): void {
    if (!data.meta?.id) throw new Error('Level data missing meta.id');
    if (!data.playerSpawn) throw new Error('Level data missing playerSpawn');
    if (!data.safeZone) throw new Error('Level data missing safeZone');
    if (!data.dogRoute?.length) throw new Error('Level data missing dogRoute waypoints');
  }

  /** Spawn all entities for a level — terrain, obstacles, part, safe zone */
  spawnLevel(data: LevelData): LevelRuntime {
    this.validateLevelData(data);

    const runtime: LevelRuntime = {
      levelData: data,
      terrainMeshes: [],
      terrainBodies: [],
      obstacleMeshes: [],
      obstacleBodies: [],
      hazardMeshes: [],
      hazardBodies: [],
      playerSpawn: { x: data.playerSpawn.x, y: data.playerSpawn.y, z: data.playerSpawn.z },
    };

    for (const piece of data.terrain) {
      const { mesh, body } = this.spawnTerrainPiece(piece);
      runtime.terrainMeshes.push(mesh);
      runtime.terrainBodies.push(body);
    }

    for (const obs of data.obstacles) {
      const { mesh, body } = this.spawnObstacle(obs);
      runtime.obstacleMeshes.push(mesh);
      runtime.obstacleBodies.push(body);
    }

    for (const haz of data.hazards) {
      const { mesh, body } = this.spawnHazard(haz);
      runtime.hazardMeshes.push(mesh);
      runtime.hazardBodies.push(body);
    }

    return runtime;
  }

  /** Clean up all spawned entities for a level */
  unloadLevel(runtime: LevelRuntime): void {
    const allMeshes = [
      ...runtime.terrainMeshes,
      ...runtime.obstacleMeshes,
      ...runtime.hazardMeshes,
    ];

    for (const mesh of allMeshes) {
      if (mesh.geometry) mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        for (const m of mesh.material) m.dispose();
      } else if (mesh.material) {
        mesh.material.dispose();
      }
      if (this.renderer) {
        this.renderer.scene.remove(mesh);
      }
    }

    const allBodies = [
      ...runtime.terrainBodies,
      ...runtime.obstacleBodies,
      ...runtime.hazardBodies,
    ];

    for (const body of allBodies) {
      this.physics.removeRigidBody(body);
    }
  }

  /** Apply atmospheric settings */
  applyAtmosphere(data: LevelData): void {
    if (!this.renderer) return;
    const a = data.atmosphere;
    if (a?.fogColor !== undefined) {
      this.renderer.scene.fog = new THREE.Fog(a.fogColor, 30, 100);
    }
  }

  // ---- Private spawn helpers ----

  private createTerrainMaterial(color: number): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({ color });
  }

  private spawnTerrainPiece(piece: TerrainPiece): { mesh: THREE.Mesh; body: RAPIER.RigidBody } {
    const w = piece.halfExtents.x * 2;
    const h = piece.halfExtents.y * 2;
    const d = piece.halfExtents.z * 2;
    const color = piece.color ?? 0xeeeeee;

    const geometry = new THREE.BoxGeometry(w, h, d);
    const material = this.createTerrainMaterial(color);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(piece.position.x, piece.position.y, piece.position.z);
    mesh.rotation.y = piece.rotationY ?? 0;

    if (this.renderer) {
      this.renderer.scene.add(mesh);
    }

    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(piece.position.x, piece.position.y, piece.position.z)
      .setRotation({ x: 0, y: piece.rotationY ?? 0, z: 0, w: 1 });
    const body = this.physics.addRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(piece.halfExtents.x, piece.halfExtents.y, piece.halfExtents.z)
      .setCollisionGroups(CollisionGroups.Terrain);
    this.physics.addCollider(colliderDesc, body);

    return { mesh, body };
  }

  private spawnObstacle(obs: ObstacleData): { mesh: THREE.Mesh; body: RAPIER.RigidBody } {
    const w = obs.halfExtents.x * 2;
    const h = obs.halfExtents.y * 2;
    const d = obs.halfExtents.z * 2;
    const color = obs.color ?? 0xcc4444;

    const geometry = new THREE.BoxGeometry(w, h, d);
    const material = this.createTerrainMaterial(color);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(obs.position.x, obs.position.y, obs.position.z);
    mesh.rotation.y = obs.rotationY ?? 0;

    if (this.renderer) {
      this.renderer.scene.add(mesh);
    }

    const bodyDesc = obs.type === 'moving'
      ? RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(obs.position.x, obs.position.y, obs.position.z)
      : RAPIER.RigidBodyDesc.fixed()
        .setTranslation(obs.position.x, obs.position.y, obs.position.z);
    const body = this.physics.addRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(obs.halfExtents.x, obs.halfExtents.y, obs.halfExtents.z)
      .setCollisionGroups(CollisionGroups.Obstacle);
    this.physics.addCollider(colliderDesc, body);

    return { mesh, body };
  }

  private spawnHazard(haz: { type: string; position: { x: number; y: number; z: number }; halfExtents: { x: number; y: number; z: number }; color?: number }): { mesh: THREE.Mesh; body: RAPIER.RigidBody } {
    const w = haz.halfExtents.x * 2;
    const h = haz.halfExtents.y * 2;
    const d = haz.halfExtents.z * 2;
    const color = haz.color ?? 0x88aaff;

    const geometry = new THREE.BoxGeometry(w, h, d);
    const material = this.createTerrainMaterial(color);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(haz.position.x, haz.position.y, haz.position.z);

    if (this.renderer) {
      this.renderer.scene.add(mesh);
    }

    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(haz.position.x, haz.position.y, haz.position.z);
    const body = this.physics.addRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(haz.halfExtents.x, haz.halfExtents.y, haz.halfExtents.z)
      .setCollisionGroups(CollisionGroups.Hazard);
    this.physics.addCollider(colliderDesc, body);

    return { mesh, body };
  }
}