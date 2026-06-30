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