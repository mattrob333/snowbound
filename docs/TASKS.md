# Snowbound — Task Board

## Phase 0: Repo foundation
- [x] Create Vite vanilla-ts project
- [x] Install all dependencies
- [x] Add full folder structure
- [x] Add ESLint, Prettier, Vitest config
- [x] `npm run check` passes
- [x] Blank three.js scene renders in browser

## Phase 1: Basic renderer and camera
- [x] ThreeRenderer with scene, camera, renderer
- [x] Resize handling
- [x] Hemisphere + directional lights
- [x] Fog
- [x] Placeholder snow ground plane
- [x] Debug grid

## Phase 2: Physics foundation
- [x] Rapier async init
- [x] PhysicsWorld with World
- [x] Static ground collider
- [x] Debug physics overlay
- [x] Collision groups
- [x] Raycast helper

## Phase 3: Player vertical slice
- [x] Jim capsule placeholder (CharacterKCC)
- [x] Kinematic character controller
- [x] InputManager functional (keyboard events, ControlAction mapping)
- [x] WASD + camera-relative movement
- [x] Sprint
- [x] Jump
- [x] Third-person follow camera

## Phase 4: Slide and wall-run
- [x] Slide state + collider change
- [x] Low obstacle test
- [x] Wall-run raycasts
- [x] Wall-run state
- [x] Wall jump exit
- [x] Cooldowns

## Phase 5: Level data loader
- [x] LevelData interfaces — LevelData.ts (all interfaces: LevelMeta, Vec3, AABB, TerrainPiece, ObstacleData, DogWaypoint, HelicopterPartSpawn, PowerupSpawn, SafeZoneData, HazardSpawn, LevelAtmosphere, DogTuning)
- [x] Load level-01.json — public/assets/levels/level-01.json (Crash Site)
- [x] Spawn terrain from JSON — LevelLoader.spawnTerrainPiece()
- [x] Spawn obstacles from JSON — LevelLoader.spawnObstacle()
- [x] Spawn helicopter part — LevelLoader.spawnHelicopterPart()
- [x] Spawn safe zone — LevelLoader.spawnSafeZone()
- [x] Level unload cleanup — LevelLoader.unloadLevel()

## Phase 6: Pickups and objectives
- [x] GameEntity interface (IGameEntity) + EntityManager tracking (add/remove/clear/update)
- [x] Pickup sensor — Pickup base entity (Rapier sensor body, collected state, onCollect callback, dispose)
- [x] Helicopter part pickup — HelicopterPartPickup (glowing rotating cube, partId)
|- [x] Pickup detection in game loop (proximity check via Pickup.update() against player KCC position)
- [x] HUD objective text — Hud.ts with DOM overlay showing objective state
- [x] Part required for safe zone — SafeZone.ts entity, wired into LevelManager
- [x] Temporary power-up effect — PowerupPickup with type-specific visuals, duration tracking, activation/deactivation callbacks (107 tests)
- [x] Permanent upgrade effect — UpgradePickup + PlayerUpgradeService (4 upgrade types, stat multipliers, 120 tests)

## Phase 7: Monster chase director
- [ ] Dog placeholder model
- [ ] Route progress model
- [ ] Dog gap calculation
- [ ] Dog moves along route
- [ ] Chase trigger after part pickup
- [ ] Catch condition + game over
- [ ] Dog close warning UI

## Phase 8: Hazard system
- [ ] Hazard base class
- [ ] Falling ice hazard
- [ ] Cracked ice / stumble zones
- [ ] Jump-over obstacles
- [ ] Dog gap penalty on mistakes
- [ ] Game over on major hazards

## Phase 9: Save and progression
- [ ] SaveService (localStorage)
- [ ] Save after level complete
- [ ] Save collected parts
- [ ] Save permanent upgrades
- [ ] Level select / unlock
- [ ] Reset save option

## Phase 10: Build all 15 levels
- [ ] Level 1 — Crash Site (rotor blade, basic run/jump)
- [ ] Level 2 — Frozen Forest (battery, fallen trees)
- [ ] Level 3 — Snowy Cliffs (landing skid, wall-run intro)
- [ ] Level 4 — Ice River (fuel pump, sliding ice)
- [ ] Level 5 — Ice Caves (tail rotor, falling ice)
- [ ] Level 6 — Avalanche Pass (radio, timed escape)
- [ ] Level 7 — Frozen Village (fuel line, doors+distractions)
- [ ] Level 8 — Rope Bridge Canyon (cockpit controls, collapsing bridges)
- [ ] Level 9 — Blizzard Mountain (navigation computer, low vis)
- [ ] Level 10 — Glacier Maze (hydraulic system, route choices)
- [ ] Level 11 — Abandoned Mine (rotor shaft, darkness+mine carts)
- [ ] Level 12 — Radioactive Valley (engine housing, faster dog)
- [ ] Level 13 — Research Facility Exterior (transmission, lab clues)
- [ ] Level 14 — Abandoned Lab (cure canister, lab puzzle)
- [ ] Level 15 — Helicopter Landing (main ignition, final chase+cure)

## Phase 11: Audio, animation, polish
- [ ] Jim placeholder animations
- [ ] Dog placeholder animations
- [ ] Pickup sounds
- [ ] Dog positional audio
- [ ] Chase music layers
- [ ] Jim voice lines
- [ ] Dog slip comedy event
- [ ] Snow particle system
- [ ] Camera shake
- [ ] Victory sequence