import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { PhysicsWorld } from '../../engine/physics/PhysicsWorld';
import type { ThreeRenderer } from '../../engine/rendering/ThreeRenderer';
import type { LevelData, TerrainPiece, ObstacleData } from './LevelData';
import { CollisionGroups } from '../../engine/physics/CollisionGroups';
import type { DecorationData } from './LevelData';

/** Runtime handle for a loaded level — tracks spawned objects for cleanup */
export interface LevelRuntime {
  levelData: LevelData;
  terrainMeshes: THREE.Mesh[];
  terrainBodies: RAPIER.RigidBody[];
  obstacleMeshes: THREE.Mesh[];
  obstacleBodies: RAPIER.RigidBody[];
  hazardMeshes: THREE.Mesh[];
  hazardBodies: RAPIER.RigidBody[];
  decorationMeshes: THREE.Group[];
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
      decorationMeshes: [],
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

    if (data.decorations) {
      for (const dec of data.decorations) {
        const group = this.spawnDecoration(dec);
        runtime.decorationMeshes.push(group);
      }
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

    // Clean up decoration groups (recursive dispose)
    for (const group of runtime.decorationMeshes) {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (Array.isArray(child.material)) {
            for (const m of child.material) m.dispose();
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
      if (this.renderer) {
        this.renderer.scene.remove(group);
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
    if (this.renderer.environment) {
      this.renderer.environment.applyAtmosphere(a);
    } else if (a?.fogColor !== undefined) {
      this.renderer.scene.fog = new THREE.Fog(a.fogColor, 30, 100);
    }
  }

  // ---- Decoration prop spawning ----

  private createSnowman(): THREE.Group {
    const group = new THREE.Group();

    // Bottom sphere (body)
    const bottomGeo = new THREE.SphereGeometry(0.3, 12, 12);
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const bottom = new THREE.Mesh(bottomGeo, snowMat);
    bottom.position.y = 0.3;
    group.add(bottom);

    // Middle sphere (torso)
    const midGeo = new THREE.SphereGeometry(0.22, 12, 12);
    const mid = new THREE.Mesh(midGeo, snowMat);
    mid.position.y = 0.65;
    group.add(mid);

    // Head
    const headGeo = new THREE.SphereGeometry(0.16, 12, 12);
    const head = new THREE.Mesh(headGeo, snowMat);
    head.position.y = 0.92;
    group.add(head);

    // Nose (orange cone)
    const noseGeo = new THREE.ConeGeometry(0.04, 0.1, 6);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xff8800 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 0.9, 0.16);
    nose.rotation.x = Math.PI / 2;
    group.add(nose);

    // Eyes (black dots)
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.03, 6, 6);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.08, 0.93, 0.15);
      group.add(eye);
    }

    // Buttons (black dots on torso)
    for (const yOffset of [0.55, 0.45]) {
      const btnGeo = new THREE.SphereGeometry(0.025, 6, 6);
      const btn = new THREE.Mesh(btnGeo, eyeMat);
      btn.position.set(0, yOffset, 0.2);
      group.add(btn);
    }

    return group;
  }

  private createPineTree(): THREE.Group {
    const group = new THREE.Group();

    // Trunk (brown cylinder)
    const trunkGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.5, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.25;
    group.add(trunk);

    // Three cone tiers (green)
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x2d6b2d, roughness: 0.8 });
    for (let i = 0; i < 3; i++) {
      const r = 0.3 - i * 0.08;
      const h = 0.3 - i * 0.05;
      const coneGeo = new THREE.ConeGeometry(r, h, 6);
      const cone = new THREE.Mesh(coneGeo, treeMat);
      cone.position.y = 0.5 + i * 0.2;
      group.add(cone);
    }

    return group;
  }

  private createIceCrystal(): THREE.Group {
    const group = new THREE.Group();
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      emissive: 0x3377aa,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.7,
      roughness: 0.1,
      metalness: 0.3,
    });

    // Two crossed octahedrons
    const geo = new THREE.OctahedronGeometry(0.12);
    for (let i = 0; i < 3; i++) {
      const crystal = new THREE.Mesh(geo.clone(), iceMat);
      crystal.rotation.x = (i * Math.PI) / 3;
      crystal.rotation.z = (i * Math.PI) / 4;
      crystal.position.y = 0.2;
      group.add(crystal);
    }

    return group;
  }

  private createSnowRock(): THREE.Group {
    const group = new THREE.Group();
    const rockMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.95 });

    // Irregular cluster of spheres
    for (let i = 0; i < 3; i++) {
      const r = 0.08 + Math.random() * 0.12;
      const geo = new THREE.SphereGeometry(r, 6, 6);
      const rock = new THREE.Mesh(geo, rockMat);
      rock.position.set(
        (Math.random() - 0.5) * 0.3,
        r * 0.7,
        (Math.random() - 0.5) * 0.3,
      );
      group.add(rock);
    }

    return group;
  }

  private spawnDecoration(dec: DecorationData): THREE.Group {
    let group: THREE.Group;
    switch (dec.type) {
      case 'snowman':
        group = this.createSnowman();
        break;
      case 'pine_tree':
        group = this.createPineTree();
        break;
      case 'ice_crystal':
        group = this.createIceCrystal();
        break;
      case 'snow_rock':
        group = this.createSnowRock();
        break;
      default:
        group = new THREE.Group();
    }

    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const scale = dec.scale ?? 1;
    group.scale.set(scale, scale, scale);
    group.position.set(dec.position.x, dec.position.y, dec.position.z);
    if (dec.rotationY !== undefined) {
      group.rotation.y = dec.rotationY;
    }

    if (this.renderer) {
      this.renderer.scene.add(group);
    }

    return group;
  }

  // ---- Private spawn helpers ----

  private createTerrainMaterial(color: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 });
  }

  private spawnTerrainPiece(piece: TerrainPiece): { mesh: THREE.Mesh; body: RAPIER.RigidBody } {
    const w = piece.halfExtents.x * 2;
    const h = piece.halfExtents.y * 2;
    const d = piece.halfExtents.z * 2;
    const color = piece.color ?? 0xeeeeee;

    const geometry = new THREE.BoxGeometry(w, h, d);
    const material = this.createTerrainMaterial(color);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
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
    mesh.castShadow = true;
    mesh.receiveShadow = true;
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
    // Hazards read as slick translucent ice
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
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