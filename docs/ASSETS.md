# Third-Party Assets

## Character models

### `public/assets/models/characters/jim.glb` (Soldier)
- Source: [three.js examples](https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/Soldier.glb)
- Original character: "Soldier" by Mixamo (Adobe), packaged for the three.js
  examples. Animations included: `Idle`, `Walk`, `Run`, `TPose`.
- Used as Jim, the playable survivor.

### `public/assets/models/characters/dog.glb` (Fox)
- Source: [Khronos glTF-Sample-Models](https://github.com/KhronosGroup/glTF-Sample-Models/tree/main/2.0/Fox)
- Model by [PixelMannen](https://opengameart.org/content/fox-and-shiba) (CC0).
- Rigging and animation by [@tomkranis](https://sketchfab.com/models/371dea88d7e04a76af5763f2a36866bc),
  licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Used (scaled up and re-tinted) as the giant mutated dog that chases Jim.

If a model fails to load at runtime, the game falls back to the original
capsule placeholder meshes, so gameplay never depends on these files.
