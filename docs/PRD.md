# Snowbound — Build Spec (PRD)

**Genre:** Third-person 3D survival chase platformer
**Engine stack:** Browser-based TypeScript — three.js, Vite, Rapier 3D physics
**Target platform:** Desktop browser
**Core hook:** A giant mutated Boston Terrier chases Jim through snowy obstacle courses. Jim collects helicopter parts, finds a cure, fixes the helicopter, cures the dog, and escapes.

## Core Gameplay Loop (per level)
1. Start in a safe place
2. Explore snowy terrain
3. Find upgrades, power-ups, clues, and the required helicopter part
4. Trigger the monster chase (by picking up the part or crossing a trigger)
5. Run, jump, slide, wall-run, dodge hazards, use power-ups
6. Reach the safe shelter
7. Save progress, advance to next level

## Final Game Loop (full game)
1. Jim survives helicopter crash
2. Helicopter is broken — collect parts per level
3. Discover radioactive waste caused the mutation
4. Find cure in abandoned lab (Level 14)
5. Repair helicopter, cure dog (Level 15)
6. Dog becomes friendly — Jim and dog fly away

## Non-negotiable Acceptance Criteria
1. Runs with `npm run dev`, builds with `npm run build`
2. Playable third-person Jim — run, sprint, jump, slide, wall-run
3. Dog chases Jim — dog bite = Game Over
4. All 15 levels playable, each with one helicopter part
5. Difficulty increases across levels
6. Safe shelters complete levels
7. Save progress after each level
8. Level 14 = abandoned lab + cure, Level 15 = repair + cure dog
9. Dog becomes friendly, Jim and dog fly away
10. Funny chase moments

## Build Approach
- Vertical slice first (Level 1 fully playable)
- Data-driven levels via JSON — no hardcoded level geometry
- Placeholder meshes first, final art last
- Milestone-based delivery following 12 phases
