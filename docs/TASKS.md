# Snowbound — Task Board

## Phase 0: Repo foundation
- [ ] Create Vite vanilla-ts project
- [ ] Install all dependencies
- [ ] Add full folder structure
- [ ] Add ESLint, Prettier, Vitest config
- [ ] `npm run check` passes
- [ ] Blank three.js scene renders in browser

## Phase 1: Basic renderer and camera
- [ ] ThreeRenderer with scene, camera, renderer
- [ ] Resize handling
- [ ] Hemisphere + directional lights
- [ ] Fog
- [ ] Placeholder snow ground plane
- [ ] Debug grid

## Phase 2: Physics foundation
- [ ] Rapier async init
- [ ] PhysicsWorld with World
- [ ] Static ground collider
- [ ] Debug physics overlay
- [ ] Collision groups
- [ ] Raycast helper

## Phase 3: Player vertical slice
- [ ] Jim capsule placeholder
- [ ] Kinematic character controller
- [ ] WASD + camera-relative movement
- [ ] Sprint
- [ ] Jump
- [ ] Third-person follow camera

## Phase 4: Slide and wall-run
- [ ] Slide state + collider change
- [ ] Low obstacle test
- [ ] Wall-run raycasts
- [ ] Wall-run state
- [ ] Wall jump exit
- [ ] Cooldowns

## Phase 5: Level data loader
- [ ] LevelData interfaces
- [ ] Load level-01.json
- [ ] Spawn terrain from JSON
- [ ] Spawn obstacles from JSON
- [ ] Spawn helicopter part
- [ ] Spawn safe zone
- [ ] Level unload cleanup

## Phase 6: Pickups and objectives
- [ ] Pickup sensor (Rapier)
- [ ] Helicopter part pickup
- [ ] HUD objective text
- [ ] Part required for safe zone
- [ ] Temporary power-up effect
- [ ] Permanent upgrade effect

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