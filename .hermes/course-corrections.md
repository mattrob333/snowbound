# Course Corrections — Snowbound Build Loop

The OUTER loop appends prioritized directives here when it detects drift, guardrail violations, quality regressions, or off-task work.
The INNER loop reads this FIRST every tick and resolves OPEN corrections as top priority before normal work.

**Protocol:**
- Outer APPENDS corrections as OPEN; never edits build-state.md (avoids write races).
- Inner addresses each OPEN item, then marks it RESOLVED (commit <sha>) and moves it.
- Severity: BLOCKER (stop normal work, fix now) · HIGH (this tick) · MEDIUM (2 ticks) · LOW (when convenient)

---

## Open Corrections
_(none — inner loop in alignment as of last audit)_

## Resolved Corrections

### BLOCKER — Wrong import path in PlayerMovementState.test.ts — RESOLVED (commit <pending>)
Fix: Changed line 2 from `'../../gameplay/player/PlayerMovementState'` to `'../gameplay/player/PlayerMovementState'`.

### HIGH — SlideController.test.ts shared PhysicsWorld causes test pollution — RESOLVED (commit <pending>)
Fix: Added `removeRigidBody` to PhysicsWorld, stored PhysicsWorld ref in CharacterKCC, implemented `dispose()` removing rigid body, added `kcc.dispose()` calls after each test.

_(history appended below)_