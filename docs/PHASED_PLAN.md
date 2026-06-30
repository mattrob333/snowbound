# Snowbound — Phased Build Plan

## Phase 0: Repo foundation
- Create Vite vanilla-ts project, add deps, folder structure, ESLint/Prettier/Vitest
- Render blank three.js scene
- `npm run check` passes

## Phase 1: Basic renderer and camera
- ThreeRenderer, scene, camera, lights, fog, resize
- Placeholder snow ground

## Phase 2: Physics foundation
- Rapier async init, PhysicsWorld, static ground collider, debug mode, raycast

## Phase 3: Player vertical slice
- Jim capsule, kinematic controller, WASD movement, camera-relative, sprint, jump

## Phase 4: Slide and wall-run
- Slide state, wall-run raycasts, wall-run state, wall jump, cooldowns

## Phase 5: Level data loader
- LevelData interfaces, load level-01.json, spawn terrain/obstacles/part/safe zone

## Phase 6: Pickups and objectives
- Pickup sensors, helicopter part, HUD objective, part-required safe zone

## Phase 7: Monster chase director
- Dog placeholder, route progress, dog gap, chase trigger, catch, game over

## Phase 8: Hazard system
- Falling ice, cracked ice, slide-under, jump-over, stumble effects, dog gap penalty

## Phase 9: Save and progression
- SaveService, localStorage persistence, level select, save reset

## Phase 10: Build all 15 levels
- JSON for each level, modular obstacles, difficulty curve, story clues, lab + finale

## Phase 11: Audio, animation, polish
- Animations, sounds, music, particle snow, camera shake, victory sequence