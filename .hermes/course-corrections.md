# Course Corrections — Snowbound Build Loop

The OUTER loop appends prioritized directives here when it detects drift, guardrail violations, quality regressions, or off-task work.
The INNER loop reads this FIRST every tick and resolves OPEN corrections as top priority before normal work.

**Protocol:**
- Outer APPENDS corrections as OPEN; never edits build-state.md (avoids write races).
- Inner addresses each OPEN item, then marks it RESOLVED (commit <sha>) and moves it.
- Severity: BLOCKER (stop normal work, fix now) · HIGH (this tick) · MEDIUM (2 ticks) · LOW (when convenient)

---

## Open Corrections

### MEDIUM — Builder crash mid-tick: uncommitted Phase 8 work — OPEN (audit 2026-06-30 23:49 UTC)
Problem: Builder lock was stale (4+ hours old at 19:36 UTC, current time 23:49). Lock file `.hermes/builder.lock` was removed. Builder created Phase 8 files (Hazard.ts, FallingIceHazard.ts, tests, LevelManager changes, TASKS.md/build-state.md updates) but never committed them. Supervisor verified quality gate on working tree (169 tests ✅, typecheck ✅, lint 0 errors ✅, build ✅) and committed as 74ed984 (feat: Phase 8 — Hazard base + FallingIceHazard). No code issues found — pure commit failure.
Required fix: Builder's next tick should verify that Phase 8 work (74ed984) is in place by checking the state files, then continue to next Phase 8 tasks. No rework needed.
Acceptance: git log shows 74ed984 on main, Phase 8 files present, 169 tests passing.

## Resolved Corrections

### BLOCKER — Wrong import path in PlayerMovementState.test.ts — RESOLVED (commit e2eb713)
Fix: Changed line 2 from `'../../gameplay/player/PlayerMovementState'` to `'../gameplay/player/PlayerMovementState'`.

### HIGH — SlideController.test.ts shared PhysicsWorld causes test pollution — RESOLVED (commit e2eb713)
Fix: Added `removeRigidBody` to PhysicsWorld, stored PhysicsWorld ref in CharacterKCC, implemented `dispose()` removing rigid body, added `kcc.dispose()` calls after each test.

### HIGH — Rapier 0.19 API mismatch: drainIntersectionEvents not available, Pickup tests broken — RESOLVED (commit 176fef4)
Problem: Builder committed Pickup.test.ts using `drainIntersectionEvents` which doesn't exist in Rapier 0.19.x (the installed version). Only `drainCollisionEvents` exists on EventQueue. Additionally, sensor events via event queue are unreliable in 0.19 compat. Result: 3 tests failing, typecheck failing, quality gate red.
Fix: Changed PhysicsWorld.ts to use `drainCollisionEvents` internally (matching Rapier 0.19 API), added `boxesOverlap()` method for position-based proximity detection, rewrote Pickup.test.ts to use manual AABB overlap checks instead of event-queue-based sensor detection. All 89 tests pass, typecheck + lint + build clean.

### MEDIUM — Builder crash mid-tick: uncommitted Phase 8 work — RESOLVED (commit 74ed984)
Problem: Builder lock was stale (4+ hours old). Builder created Phase 8 files but never committed. Supervisor verified quality gate and committed as 74ed984.