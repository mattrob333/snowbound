# Build State: Snowbound

**Spec source:** docs/PRD.md, docs/ARCHITECTURE.md, Snowbound.txt (full spec)
**Repo:** https://github.com/mattrob333/snowbound.git
**Workspace:** /home/mrobe/snowbound
**Status:** Phase 0 — Repo foundation (setting up Vite project)

## Architecture: Two-Tier Build Loop
- Inner Loop (builder) — every 10m: Check → Test → Advance → Repeat. Self-pauses both crons at a genuine stopping point.
- Outer Loop (supervisor) — every 60m: active supervisor (audits + writes corrections + trivial fixes + escalation).

## Phases / Waves
1. [ ] Phase 0 — Repo foundation (Vite, deps, blank three.js scene)
2. [ ] Phase 1 — Basic renderer and camera
3. [ ] Phase 2 — Physics foundation
4. [ ] Phase 3 — Player vertical slice
5. [ ] Phase 4 — Slide and wall-run
6. [ ] Phase 5 — Level data loader
7. [ ] Phase 6 — Pickups and objectives
8. [ ] Phase 7 — Monster chase director
9. [ ] Phase 8 — Hazard system
10. [ ] Phase 9 — Save and progression
11. [ ] Phase 10 — Build all 15 levels
12. [ ] Phase 11 — Audio, animation, polish

## Completed Tasks
_(none yet)_

## Open Issues / Blockers
_(none yet)_

## Next Action
- Create Vite vanilla-ts project, install deps, build folder structure, render a blank three.js scene.

## Pitfalls / Notes for Future Ticks
- Commit each green slice before starting the next file.
- Always `git pull` before working (multiple agents + user push).
- Quality gate: `npm run typecheck && npm run lint && npm test && npm run build`
- Placeholder-first: use Three.js primitives (capsule, box, sphere) for all characters until Phase 11.
- Levels are data-driven via JSON — never hardcode level geometry in gameplay systems.

**Last Updated:** Initial seed