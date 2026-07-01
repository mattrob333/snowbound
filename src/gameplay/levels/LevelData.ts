/** Metadata for a single level */
export interface LevelMeta {
  id: string;
  name: string;
  description: string;
  order: number;
}

/** A point in 3D space */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Axis-aligned bounding box */
export interface AABB {
  min: Vec3;
  max: Vec3;
}

/** Terrain slab — flat ground, wall, ramp, platform */
export interface TerrainPiece {
  /** Position of the centre of the slab */
  position: Vec3;
  /** Half-extents (width/2, height/2, depth/2) */
  halfExtents: Vec3;
  /** Rotation in radians around Y axis */
  rotationY: number;
  /** Visual colour hint (hex) */
  color?: number;
}

/** An obstacle the player must navigate */
export interface ObstacleData {
  /** Type of obstacle */
  type: 'jump_over' | 'slide_under' | 'moving' | 'cracked_ice' | 'falling_ice' | 'crumbling';
  position: Vec3;
  halfExtents: Vec3;
  rotationY?: number;
  /** For moving obstacles: movement range */
  moveRange?: Vec3;
  /** For moving obstacles: movement speed (units/s) */
  moveSpeed?: number;
  color?: number;
}

/** Dog route waypoint on the patrol/chase path */
export interface DogWaypoint {
  position: Vec3;
  /** Delay in seconds before leaving this waypoint */
  waitTime?: number;
}

/** A helicopter part pickup location */
export interface HelicopterPartSpawn {
  position: Vec3;
  /** Which part this is (e.g. 'rotor_blade', 'battery') */
  partId: string;
}

/** A power-up spawn */
export interface PowerupSpawn {
  position: Vec3;
  type: 'speed_boost' | 'dog_repel' | 'shield' | 'magnet';
  duration?: number;
}

/** Safe zone / shelter definition */
export interface SafeZoneData {
  position: Vec3;
  radius: number;
  /** Whether the safe zone requires the helicopter part to activate */
  requiresPart: boolean;
}

/** Hazard spawn (falling ice trigger, cracked ice patch, etc.) */
export interface HazardSpawn {
  type: 'falling_ice' | 'avalanche' | 'cracked_ice' | 'cliff_death' | 'sliding_ice';
  position: Vec3;
  halfExtents: Vec3;
  /** For falling ice: trigger radius */
  triggerRadius?: number;
  /** For falling ice: fall delay (seconds) */
  fallDelay?: number;
  color?: number;
}

/** Visual/atmospheric settings for the level */
export interface LevelAtmosphere {
  /** Background/fog colour (hex) */
  fogColor?: number;
  /** Fog density (0-1) */
  fogDensity?: number;
  /** Ambient light intensity */
  ambientIntensity?: number;
  /** Directional light intensity */
  directionalIntensity?: number;
}

/** Dog behaviour tuning for this level */
export interface DogTuning {
  /** Patrol speed (units/s) */
  patrolSpeed: number;
  /** Chase speed (units/s) */
  chaseSpeed: number;
  /** How close the dog needs to be to catch the player */
  catchRadius: number;
  /** How far the dog stays behind during patrol */
  patrolDistance: number;
  /** Chance (0–1) of dog slipping on ice per check (optional, default 0) */
  slipChance?: number;
  /** Distance the dog falls behind when slipping (units, default 0) */
  slipGapBonus?: number;
  /** Duration of the slip animation in seconds (default 0.5) */
  slipDuration?: number;
}

/** Decorative prop types */
export const DecorationType = {
  Snowman: 'snowman',
  PineTree: 'pine_tree',
  IceCrystal: 'ice_crystal',
  SnowRock: 'snow_rock',
} as const;
export type DecorationType = (typeof DecorationType)[keyof typeof DecorationType];

/** A decorative prop in the level (no gameplay effect, visual only) */
export interface DecorationData {
  position: Vec3;
  type: DecorationType;
  /** Uniform scale multiplier (default 1.0) */
  scale?: number;
  /** Optional rotation in radians around Y axis */
  rotationY?: number;
}

/** Complete level definition — drives LevelLoader */
export interface LevelData {
  meta: LevelMeta;
  atmosphere: LevelAtmosphere;
  playerSpawn: Vec3;
  terrain: TerrainPiece[];
  obstacles: ObstacleData[];
  dogRoute: DogWaypoint[];
  dogTuning: DogTuning;
  helicopterPart: HelicopterPartSpawn;
  safeZone: SafeZoneData;
  powerups: PowerupSpawn[];
  hazards: HazardSpawn[];
  decorations?: DecorationData[];
}