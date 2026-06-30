// World scale: 1 unit = 1 meter
export const WORLD_SCALE = 1;

// Player
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_RADIUS = 0.35;
export const PLAYER_CAPSULE_HALF_HEIGHT = 0.55;

// Monster Dog
export const DOG_HEIGHT = 3.0;
export const DOG_WIDTH = 1.6;
export const DOG_CATCH_RADIUS = 1.2;

// Environment
export const STANDARD_CORRIDOR_WIDTH = 12;
export const JUMPABLE_GAP_MIN = 2;
export const JUMPABLE_GAP_MAX = 5;
export const WALL_RUN_MIN_HEIGHT = 2.5;
export const SAFE_SHELTER_TRIGGER_RADIUS = 3;

// Rendering
export const FOV = 65;
export const NEAR_PLANE = 0.1;
export const FAR_PLANE = 1000;
export const MAX_PIXEL_RATIO = 2;
export const BG_COLOR = 0xbbc4d0;

// Physics
export const GRAVITY_Y = -9.81;
export const FIXED_DT = 1 / 60;
export const MAX_PHYSICS_STEPS = 5;

// Camera
export const CAMERA_DISTANCE = 6.5;
export const CAMERA_HEIGHT = 2.4;
export const CAMERA_SHOULDER_OFFSET = 0.6;
export const CAMERA_LOOK_AT_HEIGHT = 1.4;
export const CAMERA_SMOOTHING = 10;
export const CAMERA_CHASE_FOV = 72;
export const CAMERA_EXPLORATION_FOV = 65;
export const CAMERA_NEAR_DOG_FOV = 78;