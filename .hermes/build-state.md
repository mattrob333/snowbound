# Build State: Snowbound

**Spec source:** docs/PRD.md, docs/ARCHITECTURE.md, Snowbound.txt (full spec)
**Repo:** https://github.com/mattrob333/snowbound.git
**Workspace:** /home/mrobe/snowbound
**Status:** Phase 8 complete — hazard system with CrackedIceHazard, dog gap penalty, and major hazard callback. 181 tests green.

## Architecture: Two-Tier Build Loop
- Inner Loop (builder) — every 3m: Check → Test → Advance → Repeat. Self-pauses both crons at a genuine stopping point.
- Outer Loop (supervisor) — every 30m: active supervisor (audits + writes corrections + trivial fixes + escalation).

## Phases / Waves
1. [x] Phase 0 — Repo foundation (Vite, deps, blank three.js scene)
2. [x] Phase 1 — Basic renderer and camera
3. [x] Phase 2 — Physics foundation
4. [x] Phase 3 — Player vertical slice
5. [x] Phase 4 — Slide and wall-run
6. [x] Phase 5 — Level data loader
7. [x] Phase 6 — Pickups and objectives
|8. [x] Phase 7 — Monster chase director
|9. [x] Phase 8 — Hazard system
|10. [ ] Phase 9 — Save and progression
11. [ ] Phase 10 — Build all 15 levels
12. [ ] Phase 11 — Audio, animation, polish

## Completed Tasks
- **Phase 0:** Vite vanilla-ts project, all deps installed, full folder structure, ESLint/Prettier/Vitest config, `npm run check` passes
- **Phase 1:** ThreeRenderer (scene/camera/renderer/resize), HemisphereLight + DirectionalLight, fog, placeholder snow ground, debug grid
- **Phase 2:** Rapier async init, PhysicsWorld, static ground collider, CollisionGroups, PhysicsDebug overlay, raycast helper, tests
- **Phase 3:** CharacterKCC (Rapier kinematic controller), PlayerController (WASD+sprint+jump), functional InputManager, ThirdPersonCameraRig, Player entity, wired into GameApp/GameLoop. 23 tests passing (6 suites).
- **Phase 4:** SlideController + WallRunController wired into PlayerController, setColliderHalfHeight on CharacterKCC (collider change for slide), wall-run raycasts + state + wall jump + cooldowns, low obstacle slide test. 50 tests passing (9 suites).
- **Phase 5:** LevelData interfaces, LevelLoader (spawn terrain/obstacles/part/safe zone/hazards), LevelManager (load/unload lifecycle), RoutePath (waypoint path + closest progress), level-01.json (Crash Site), LevelLoader.test.ts (11 tests). 77 tests passing (11 suites).
- **Phase 6:** EntityManager, Pickup base, HelicopterPartPickup, Hud.ts, SafeZone.ts, PowerupPickup (temporary effects: speed_boost/dog_repel/shield/magnet with duration tracking, activation/deactivation callbacks), PlayerUpgradeService (permanent upgrade tracking with combined stat multipliers), UpgradePickup (permanent upgrade entity with type-specific octahedron visuals). 120 tests passing (16 suites).
- **Phase 7:** MonsterChaseDirector + MonsterDog (brown capsule, route-based movement with patrol/chase states) + MonsterDistanceModel (gap calculation with close/catch thresholds, configurable). Dog moves along route waypoints; stays patrolDistance behind player during patrol; chases at chaseSpeed after part pickup; catch condition fires onCatchPlayer callback. Hud.ts: dog close warning element (red bottom bar, fades in when dog ≤ 8 units). Dog collision group added to CollisionGroups. 152 tests passing (19 suites).
- **Phase 8:** Hazard base class (IGameEntity, template-method with trigger-radius detection, activate/spent lifecycle). FallingIceHazard (trigger zone + delayed falling ice block with icosahedron visual + dynamic physics body + onMajorHazard callback). CrackedIceHazard (stumble zone with cracked-color visual update + timer-based lifecycle). Dog gap penalty (hazards advance dog progress via MonsterChaseDirector.closeDogGap()). Game over callback (onMajorHazard on Hazard base, wired via FallingIceHazard). LevelManager creates hazards from JSON and wires dog gap penalty. 181 tests passing (22 suites).

## Open Issues / Blockers
_(none yet)_

## Next Action
- Phase 9: Save and progression system — implement SaveService (localStorage persistence), save after level complete, save collected parts and upgrades, level select/unlock menu, reset save option

## Pitfalls / Notes for Future Ticks
- Commit each green slice before starting the next file.
- Always `git pull` before working (multiple agents + user push).
- Quality gate: `npm run typecheck && npm run lint && npm test && npm run build`
- Placeholder-first: use Three.js primitives (capsule, box, sphere) for all characters until Phase 11.
- Levels are data-driven via JSON — never hardcode level geometry in gameplay systems.
- enum keyword is banned by tsconfig's `erasableSyntaxOnly: true` — use const objects + type alias pattern.
- Use separate `describe` blocks with separate PhysicsWorld instances for integration tests to avoid leftover KCC rigid body pollution.
- Hud.ts creates DOM elements — may need jsdom environment for unit tests.
- When adding entities that create physics bodies, remove them in `dispose()` to prevent test pollution.
- The HelicopterPartPickup creates its own mesh+body via Pickup. LevelLoader also spawns a raw part mesh+body — this creates duplicates. Next refactor: remove raw part/safezone spawning from LevelLoader and rely on entities only.
- PowerupPickup.onActivate fires after the base Pickup.onCollect. The PowerupPickup sets `this.onCollect` in its constructor. If subclasses override `onCollect`, they must chain super's behavior.
- PlayerUpgradeService stores upgrades in-memory for now; will integrate with SaveService (Phase 9).
- UpgradePickup uses an OctahedronGeometry (different from Pickup's box and PowerupPickup's box) to visually distinguish permanent upgrades from temporary powerups.

**Last Updated:** 2026-06-30 — Phase 6 complete. PowerupPickup + PlayerUpgradeService + UpgradePickup (120 tests)