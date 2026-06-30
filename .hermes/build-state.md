# Build State: Snowbound

**Spec source:** docs/PRD.md, docs/ARCHITECTURE.md, Snowbound.txt (full spec)
**Repo:** https://github.com/mattrob333/snowbound.git
**Workspace:** /home/mrobe/snowbound
**Status:** Phase 4 complete — Phase 5 next (Level data loader)

## Architecture: Two-Tier Build Loop
- Inner Loop (builder) — every 10m: Check → Test → Advance → Repeat. Self-pauses both crons at a genuine stopping point.
- Outer Loop (supervisor) — every 60m: active supervisor (audits + writes corrections + trivial fixes + escalation).

## Phases / Waves
1. [x] Phase 0 — Repo foundation (Vite, deps, blank three.js scene)
2. [x] Phase 1 — Basic renderer and camera
3. [x] Phase 2 — Physics foundation
4. [x] Phase 3 — Player vertical slice
5. [x] Phase 4 — Slide and wall-run
6. [x] Phase 5 — Level data loader
7. [ ] Phase 6 — Pickups and objectives
8. [ ] Phase 7 — Monster chase director
9. [ ] Phase 8 — Hazard system
10. [ ] Phase 9 — Save and progression
11. [ ] Phase 10 — Build all 15 levels
12. [ ] Phase 11 — Audio, animation, polish

## Completed Tasks
- **Phase 0:** Vite vanilla-ts project, all deps installed, full folder structure, ESLint/Prettier/Vitest config, `npm run check` passes
- **Phase 1:** ThreeRenderer (scene/camera/renderer/resize), HemisphereLight + DirectionalLight, fog, placeholder snow ground, debug grid
- **Phase 2:** Rapier async init, PhysicsWorld, static ground collider, CollisionGroups, PhysicsDebug overlay, raycast helper, tests
- **Phase 3:** CharacterKCC (Rapier kinematic controller), PlayerController (WASD+sprint+jump), functional InputManager, ThirdPersonCameraRig, Player entity, wired into GameApp/GameLoop. 23 tests passing (6 suites).
- **Phase 4:** SlideController + WallRunController wired into PlayerController, setColliderHalfHeight on CharacterKCC (collider change for slide), wall-run raycasts + state + wall jump + cooldowns, low obstacle slide test. 50 tests passing (9 suites).
- **Phase 5:** LevelData interfaces, LevelLoader (spawn terrain/obstacles/part/safe zone/hazards), LevelManager (load/unload lifecycle), RoutePath (waypoint path + closest progress), level-01.json (Crash Site), LevelLoader.test.ts (11 tests). 77 tests passing (11 suites).
- **Phase 6:** EntityManager (entity tracking: add/remove/clear/update), Pickup base entity (Rapier sensor + onCollect callback + dispose, proximity detection via Pickup.update()), HelicopterPartPickup (glowing rotating cube, partId). 92 tests passing (13 suites).

## Open Issues / Blockers
_(none yet)_

## Next Action
- Phase 6: HUD objective text — show in-game text overlay for current objective (find helicopter part, deliver to safe zone)
- Phase 6: Part required for safe zone — safe zone only triggers completion when part is collected

## Pitfalls / Notes for Future Ticks
- Commit each green slice before starting the next file.
- Always `git pull` before working (multiple agents + user push).
- Quality gate: `npm run typecheck && npm run lint && npm test && npm run build`
- Placeholder-first: use Three.js primitives (capsule, box, sphere) for all characters until Phase 11.
- Levels are data-driven via JSON — never hardcode level geometry in gameplay systems.
- enum keyword is banned by tsconfig's `erasableSyntaxOnly: true` — use const objects + type alias pattern.
- Use separate `describe` blocks with separate PhysicsWorld instances for integration tests to avoid leftover KCC rigid body pollution.

**Last Updated:** 2026-06-30 — Phase 6: Pickup detection wired via Pickup.update() proximity check (92 tests)