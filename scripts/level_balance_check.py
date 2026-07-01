#!/usr/bin/env python3
"""Check all 15 level JSONs for balance issues — v2 with smarter checks."""
import json, os, math

LEVELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'levels')

def terrain_surface_at(terrain, x, z):
    """Find the highest terrain surface at (x, z) position, or None."""
    best_y = None
    for t in terrain:
        tx, ty, tz = t['position']['x'], t['position']['y'], t['position']['z']
        hx, hy, hz = t['halfExtents']['x'], t['halfExtents']['y'], t['halfExtents']['z']
        # Check if (x,z) is within this terrain piece's horizontal bounds
        if abs(x - tx) <= hx and abs(z - tz) <= hz:
            surf_y = ty + hy  # top surface
            if best_y is None or surf_y > best_y:
                best_y = surf_y
    return best_y

def min_dist_to_terrain_edge(terrain, x, z):
    """Find minimum horizontal distance from (x,z) to any terrain piece."""
    min_dist = float('inf')
    for t in terrain:
        tx, ty, tz = t['position']['x'], t['position']['y'], t['position']['z']
        hx, hy, hz = t['halfExtents']['x'], t['halfExtents']['y'], t['halfExtents']['z']
        # Distance from point to AABB (horizontal only)
        dx = max(0, abs(x - tx) - hx)
        dz = max(0, abs(z - tz) - hz)
        dist = math.sqrt(dx*dx + dz*dz)
        min_dist = min(min_dist, dist)
    return min_dist

def check_level(path):
    with open(path) as f:
        data = json.load(f)

    issues = []
    name = data['meta']['name']
    lid = data['meta']['id']

    part = data.get('helicopterPart')
    safe = data.get('safeZone')
    tuning = data.get('dogTuning', {})
    spawn = data.get('playerSpawn', {})
    terrain = data.get('terrain', [])
    obs = data.get('obstacles', [])
    route = data.get('dogRoute', [])

    # 1. Check part reachability — find nearest terrain surface, check height diff
    if part:
        px, py, pz = part['position']['x'], part['position']['y'], part['position']['z']
        surf_y = terrain_surface_at(terrain, px, pz)
        dist_to_terrain = min_dist_to_terrain_edge(terrain, px, pz)

        if surf_y is not None:
            height_above = py - surf_y
            if height_above > 5:
                issues.append(f"Part at y={py} is {height_above:.1f} units above terrain surface at ({px:.0f},{pz:.0f}) — may be unreachable (jump height ~3 units)")
        else:
            # Part is not directly above terrain — check how far from nearest terrain
            if dist_to_terrain > 3:
                issues.append(f"Part at ({px},{py},{pz}) is {dist_to_terrain:.1f} units from nearest terrain — may be unreachable (jump distance ~3-4 units)")
            if py > 5:
                issues.append(f"Part at y={py} is very high and {dist_to_terrain:.1f} units from terrain — may be unreachable")

    # 2. Safe zone is past all obstacles (or at least obstacles shouldn't be AFTER safe zone)
    if safe and obs:
        safe_z = safe['position']['z']
        # Also check safe_zone x
        safe_x = safe['position']['x']
        obs_after = [o for o in obs if o['position']['z'] > safe_z + 1 and abs(o['position']['x'] - safe_x) < 5]
        if obs_after:
            issues.append(f"Safe zone at ({safe_x:.0f},{safe_z:.0f}) has {len(obs_after)} obstacle(s) right after it (z > safe_z + 1, within x=5)")

    # 3. Player spawn sanity
    if spawn:
        spawn_z = spawn.get('z', 0)
        if spawn_z > 0:
            issues.append(f"Player spawn at z={spawn_z} is ahead of z=0 — player should start behind the first obstacle")

    # 4. Dog tuning sanity
    patrol = tuning.get('patrolSpeed', 0)
    chase = tuning.get('chaseSpeed', 0)
    catch = tuning.get('catchRadius', 0)
    patrol_dist = tuning.get('patrolDistance', 0)

    if chase <= patrol:
        issues.append(f"Chase speed ({chase}) <= patrol speed ({patrol}) — dog never catches up")
    if chase > patrol * 4:
        issues.append(f"Chase speed ({chase}) is >4x patrol speed ({patrol}) — may feel unfair")
    if catch < 0.5:
        issues.append(f"Dog catch radius ({catch}) is very small")
    if catch > 3:
        issues.append(f"Dog catch radius ({catch}) is very large")
    if patrol_dist < 5:
        issues.append(f"Patrol distance ({patrol_dist}) is small — dog starts very close to player")

    # 5. Route has enough waypoints
    if len(route) < 3:
        issues.append(f"Route has only {len(route)} waypoints")

    # 6. Check route z-depth vs patrol distance
    if route and len(route) >= 2:
        first = route[0]['position']
        last = route[-1]['position']
        route_depth = abs(last['z'] - first['z'])
        if patrol_dist > route_depth * 0.6 and route_depth > 0:
            issues.append(f"Patrol distance ({patrol_dist}) is >60% of route depth ({route_depth:.0f}) — dog may start too close to player")

    return lid, name, issues

def main():
    all_issues = {}
    for fname in sorted(os.listdir(LEVELS_DIR)):
        if not fname.endswith('.json'):
            continue
        path = os.path.join(LEVELS_DIR, fname)
        lid, name, issues = check_level(path)
        all_issues[lid] = (name, issues)

    total_issues = 0
    for lid in sorted(all_issues.keys()):
        name, issues = all_issues[lid]
        status = "✅" if not issues else "⚠️"
        print(f"{status} {lid}: {name}")
        if issues:
            for i, issue in enumerate(issues, 1):
                print(f"   {i}. {issue}")
            total_issues += len(issues)
        print()

    if total_issues == 0:
        print("✅ All 15 levels pass balance checks!")
    else:
        print(f"⚠️ {total_issues} issue(s) found across levels")

if __name__ == '__main__':
    main()