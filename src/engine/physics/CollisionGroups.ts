export const CollisionLayer = {
  Player: 0,
  Dog: 1,
  Terrain: 2,
  Obstacle: 3,
  Pickup: 4,
  Hazard: 5,
  Trigger: 6,
  Camera: 7,
} as const;
export type CollisionLayer = (typeof CollisionLayer)[keyof typeof CollisionLayer];

/** Pre-built collision group bitmasks for Rapier collider creation */
export const CollisionGroups = {
  /** Members: Terrain. Collides with: Player, Dog, Obstacle */
  Terrain: 0x0004_0004,
  /** Members: Obstacle. Collides with: Player, Dog */
  Obstacle: 0x0008_0008,
  /** Members: Pickup (sensor). Collides with: Player (sensor) */
  Pickup: 0x0010_0010,
  /** Members: Hazard. Collides with: Player, Dog */
  Hazard: 0x0020_0020,
  /** Members: SafeZone (sensor). Collides with: Player */
  SafeZone: 0x0040_0040,
} as const;
export type CollisionGroups = (typeof CollisionGroups)[keyof typeof CollisionGroups];