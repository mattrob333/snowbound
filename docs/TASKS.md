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
- [x] Dog placeholder model (brown capsule)
- [x] Route progress model (MonsterDistanceModel — gap calc + alert thresholds)
- [x] Dog gap calculation
- [x] Dog moves along route (patrol behind player, chase towards player)
- [x] Chase trigger after part pickup
- [x] Catch condition + game over callback
- [x] Dog close warning UI (HUD element, shows when dog within 8 units)

## Phase 8: Hazard system
- [x] Hazard base class (IGameEntity, template method with trigger-radius detection, activate/spent lifecycle)
- [x] Falling ice hazard (FallingIceHazard — trigger zone, delayed drop, dynamic icosahedron block)
- [x] Cracked ice / stumble zones — CrackedIceHazard
- [x] Jump-over obstacles (already handled by player physics/KCC)
- [x] Dog gap penalty on mistakes (hazards advance dog progress via closeDogGap)
- [x] Game over on major hazards (onMajorHazard callback on Hazard base, wired via FallingIceHazard)

## Phase 9: Save and progression
- [x] SaveService (localStorage)
- [x] Save after level complete
- [x] Save collected parts
- [x] Save permanent upgrades
- [x] Level select / unlock
- [x] Reset save option

## Phase 10: Build all 15 levels
- [x] Level 1 — Crash Site (rotor blade, basic run/jump)
- [x] Level 2 — Frozen Forest (battery, fallen trees)
- [x] Level 3 — Snowy Cliffs (landing skid, wall-run intro)
- [x] Level 4 — Ice River (fuel pump, sliding ice)
- [x] Level 5 — Ice Caves (tail rotor, falling ice)
- [x] Level 6 — Avalanche Pass (radio, timed escape)
- [x] Level 7 — Frozen Village (fuel line, doors+distractions)
- [x] Level 8 — Rope Bridge Canyon (cockpit controls, collapsing bridges)
- [x] Level 9 — Blizzard Mountain (navigation computer, low vis)
- [x] Level 10 — Glacier Maze (hydraulic system, route choices)
- [x] Level 11 — Abandoned Mine (rotor shaft, darkness+mine carts)
- [x] Level 12 — Radioactive Valley (engine housing, faster dog)
- [x] Level 13 — Research Facility Exterior (transmission, lab clues)
- [x] Level 14 — Abandoned Lab (cure canister, lab puzzle)
- [x] Level 15 — Helicopter Landing (main ignition, final chase+cure)

## Phase 11: Audio, animation, polish
- [x] Camera shake — CameraShake.ts with trigger/decay/clear, 8 tests
- [x] Audio system — AudioManager with mock mode + Web Audio API, 17 tests
- [x] Victory sequence — VictorySequence with 6-stage progression, 14 tests
- [x] Dog animation controller — MonsterAnimationController state machine, 17 tests
- [x] Jim placeholder animations
- [x] Dog placeholder animations (wired from MonsterAnimationController)
- [ ] Pickup sounds (AudioManager ready, needs wiring into game loop)
- [ ] Dog positional audio
- [ ] Chase music layers
- [ ] Jim voice lines
- [ ] Dog slip comedy event