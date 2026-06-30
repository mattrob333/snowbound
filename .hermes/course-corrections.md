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
_(history appended below)_