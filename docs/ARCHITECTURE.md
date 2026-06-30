# Snowbound Architecture

## 1. Directory Structure

### High-level layout

```
snowbound/
  public/
    assets/
      audio/
        music/
        sfx/
        voice/
      models/
        characters/
        environment/
        props/
        helicopter/
        pickups/
      textures/
        snow/
        ice/
        rocks/
        ui/
      levels/
        level-01.json
        level-02.json
        ...
        level-15.json

  src/
    main.ts
    vite-env.d.ts

    app/
      GameApp.ts
      GameContext.ts
      GameLoop.ts
      SceneStateMachine.ts

    config/
      constants.ts
      controls.ts
      tuning.ts
      assetManifest.ts

    engine/
      assets/
        AssetManager.ts
        GLTFCache.ts
        TextureCache.ts
      audio/
        AudioManager.ts
        MusicManager.ts
        SfxManager.ts
      camera/
        ThirdPersonCameraRig.ts
        CameraCollision.ts
      debug/
        DebugOverlay.ts
        DebugDraw.ts
        DevFlags.ts
      input/
        InputManager.ts
        KeyboardInput.ts
        MouseInput.ts
        GamepadInput.ts
      physics/
        PhysicsWorld.ts
        CollisionGroups.ts
        ColliderFactory.ts
        CharacterKCC.ts
        PhysicsDebug.ts
      rendering/
        ThreeRenderer.ts
        LightingSystem.ts
        EnvironmentRenderer.ts
        SnowParticleSystem.ts
        MaterialFactory.ts
      time/
        Timer.ts
        Cooldown.ts

    gameplay/
      entities/
        GameEntity.ts
        EntityManager.ts
        EntityFactory.ts
      player/
        Player.ts
        PlayerController.ts
        PlayerMovementState.ts
        PlayerUpgradeService.ts
        WallRunController.ts
        SlideController.ts
      monster/
        MonsterDog.ts
        MonsterChaseDirector.ts
        MonsterAnimationController.ts
        MonsterDistanceModel.ts
      levels/
        LevelManager.ts
        LevelLoader.ts
        LevelData.ts
        LevelRuntime.ts
        RoutePath.ts
        SafeZone.ts
        LevelCompleteService.ts
      pickups/
        Pickup.ts
        HelicopterPartPickup.ts
        PowerupPickup.ts
        UpgradePickup.ts
      hazards/
        Hazard.ts
        FallingIceHazard.ts
        AvalancheHazard.ts
        CrackedIceHazard.ts
        CliffDeathZone.ts
        SlidingIceZone.ts
      obstacles/
        Obstacle.ts
        MovingObstacle.ts
        CollapsingBridge.ts
        RopeBridge.ts
      helicopter/
        Helicopter.ts
        HelicopterRepairService.ts
      narrative/
        StoryFlags.ts
        LabClueService.ts
        FinaleSequence.ts
      save/
        SaveService.ts
        SaveData.ts
      ui/
        Hud.ts
        Menus.ts
        Toasts.ts
        GameOverScreen.ts
        LevelIntroScreen.ts
        VictoryScreen.ts
      progression/
        DifficultyCurve.ts
        LevelUnlockService.ts

    styles/
      main.css

    tests/
      DifficultyCurve.test.ts
      LevelLoader.test.ts
      RoutePath.test.ts
      SaveService.test.ts
      PowerupService.test.ts
```

## 2. Data Flow

### GameContext (dependency injection hub)

```
ThreeRenderer ----+
PhysicsWorld -----+
AssetManager -----+
AudioManager -----+----> GameContext ----+----> EntityManager
InputManager -----+                      |----> LevelManager
SaveService ------+                      |----> Player
DebugOverlay -----+                      |----> MonsterDog
GameLoop ---------+                      |----> Hud
```

Every system receives `GameContext` in its `update(dt, ctx)` call. Systems do NOT import each other directly. Example: `MonsterChaseDirector` reads player position from `ctx.entityManager.getPlayer().position`, not by importing `Player`.

### Game Loop flow

```
requestAnimationFrame(timestamp)
  ├── compute frameDt (capped at 0.1s)
  ├── fixed-step loop (60Hz physics):
  │   ├── PhysicsWorld.step(FIXED_DT)
  │   ├── InputManager.update()
  │   ├── PlayerController.update(dt, ctx)
  │   ├── EntityManager.update(dt, ctx) — runs all GameEntity.update()
  │   └── MonsterChaseDirector.update(dt, ctx)
  ├── ThirdPersonCameraRig.update(dt, ctx)
  ├── Hud.update(dt, ctx)
  └── ThreeRenderer.render(ctx)
```

### State machine flow

```
Boot
  → TitleMenu
    → LoadingLevel
      → LevelIntro
        → Exploration (dog stalking at distance)
          → Chase (triggered by part pickup / trigger zone)
            → LevelComplete (safe zone reached + part collected)
              → LoadingLevel(next)
              → Finale (level 15)
                → Victory
```

Death transitions:
```
Exploration → GameOver → LoadingLevel(current)
Chase → GameOver → LoadingLevel(current)
```

Pause:
```
{Exploration, Chase} → Pause → {Exploration, Chase}
```

## 3. Key Design Decisions

### a. Route-based Chase Director (not navmesh AI)
The dog moves along a `routePath` defined in each level's JSON. Player progress along the same route is tracked via projection. This avoids expensive pathfinding and is more reliable for a platformer.

### b. JSON data-driven levels
All level geometry, spawns, obstacles, hazards, pickups, dog tuning, and lighting are in `public/assets/levels/level-N.json`. The `LevelLoader` reads JSON and populates the physics + rendering worlds. No level logic is hardcoded in gameplay systems.

### c. Placeholder-first
Use capsule/box/cylinder Three.js geometry for all characters and objects during development. No custom .glb models needed until Phase 11.

### d. Rapier kinematic character controller
Jim uses Rapier's built-in `KinematicCharacterController` (move-and-slide). No custom physics solver needed.

### e. Fixed timestep physics, variable render
Physics runs at 60Hz fixed timestep. Rendering runs at display refresh rate. Max 5 physics steps per frame to prevent spiral-of-death.

### f. Save via localStorage
Progress, upgrades, story flags, and settings persist via `localStorage`. Zustand persist middleware is optional — a simple SaveService wrapping localStorage is sufficient.

## 4. Component / Module Dependencies

```
GameApp
  └── SceneStateMachine (manages state transitions)
  └── GameLoop (owns tick)
       └── PhysicsWorld (Rapier)
       └── EntityManager
            └── GameEntity[] (Player, MonsterDog, Pickups, Hazards, etc.)
       └── ThirdPersonCameraRig
       └── ThreeRenderer (owns Three.js scene, camera, renderer, lights, fog)
       └── Hud

Player
  └── PlayerController
       └── PlayerMovementState (state machine: idle/run/sprint/jump/fall/slide/wallrun)
       └── WallRunController (side raycasts + gravity reduction)
       └── SlideController (lower collider + velocity maintain)
  └── CharacterKCC (Rapier kinematic controller)

MonsterDog
  └── MonsterChaseDirector (route progress gap model)
       └── MonsterDistanceModel (gap calculation + alert thresholds)
       └── MonsterAnimationController

LevelManager
  └── LevelLoader (JSON → physics + render entities)
       └── EntityFactory (spawns entities from data)
```
