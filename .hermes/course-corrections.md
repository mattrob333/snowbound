# Course Corrections — Snowbound Build Loop

The OUTER loop appends prioritized directives here when it detects drift, guardrail violations, quality regressions, or off-task work.
The INNER loop reads this FIRST every tick and resolves OPEN corrections as top priority before normal work.

**Protocol:**
- Outer APPENDS corrections as OPEN; never edits build-state.md (avoids write races).
- Inner addresses each OPEN item, then marks it RESOLVED (commit <sha>) and moves it.
- Severity: BLOCKER (stop normal work, fix now) · HIGH (this tick) · MEDIUM (2 ticks) · LOW (when convenient)

---

## Open Corrections

### HIGH — Builder crashed mid-tick: stale lock + uncommitted doc sync — RESOLVED (commit 3ae6e4b — verified by builder tick at 2026-07-01T21:13 UTC)
**Problem:** Builder tick at 21:07 UTC failed (RuntimeError). Lock from previous tick (20:53) was left behind — 16+ min stale at supervisor audit. Builder's code changes (MonsterAnimationController at 24e46c5) were committed, but build-state.md and TASKS.md had uncommitted doc-only changes showing Phase 11 slice 4 as complete. Supervisor removed stale lock and committed doc sync at 95ea1c1.
**Fix:** Builder tick at 3ae6e4b completed successfully with proper lock cleanup — created lock at tick start, completed JimAnimationController (12 tests), passed full quality gate, committed code + updated state files, removed lock at tick end. No stale locks remain. Builder now follows strict lock lifecycle: create → work → commit/push → update state → remove lock.

## Resolved Corrections

### MEDIUM — Builder crash mid-tick: uncommitted Phase 8 work — RESOLVED (commit 74ed984 — verified by builder tick at 2026-06-30T19:53 UTC)
Problem: Builder lock was stale (4+ hours old at 19:36 UTC). Builder created Phase 8 files (Hazard.ts, FallingIceHazard.ts, tests, LevelManager changes, TASKS.md/build-state.md updates) but never committed them. Supervisor verified quality gate on working tree (169 tests ✅, typecheck ✅, lint 0 errors ✅, build ✅) and committed as 74ed984.
Verification: All files present, 169 tests still green, typecheck clean. Builder proceeding with Phase 8 tasks: CrackedIceHazard + dog gap penalty.

### BLOCKER — Wrong import path in PlayerMovementState.test.ts — RESOLVED (commit e2eb713)
Fix: Changed line 2 from `'../../gameplay/player/PlayerMovementState'` to `'../gameplay/player/PlayerMovementState'`.

### HIGH — SlideController.test.ts shared PhysicsWorld causes test pollution — RESOLVED (commit e2eb713)
Fix: Added `removeRigidBody` to PhysicsWorld, stored PhysicsWorld ref in CharacterKCC, implemented `dispose()` removing rigid body, added `kcc.dispose()` calls after each test.

### HIGH — Rapier 0.19 API mismatch: drainIntersectionEvents not available, Pickup tests broken — RESOLVED (commit 176fef4)
Problem: Builder committed Pickup.test.ts using `drainIntersectionEvents` which doesn't exist in Rapier 0.19.x (the installed version). Only `drainCollisionEvents` exists on EventQueue. Additionally, sensor events via event queue are unreliable in 0.19 compat. Result: 3 tests failing, typecheck failing, quality gate red.
Fix: Changed PhysicsWorld.ts to use `drainCollisionEvents` internally (matching Rapier 0.19 API), added `boxesOverlap()` method for position-based proximity detection, rewrote Pickup.test.ts to use manual AABB overlap checks instead of event-queue-based sensor detection. All 89 tests pass, typecheck + lint + build clean.

### MEDIUM — Builder crash mid-tick: uncommitted Phase 8 work — RESOLVED (commit 74ed984)
Problem: Builder lock was stale (4+ hours old). Builder created Phase 8 files but never committed. Supervisor verified quality gate and committed as 74ed984.