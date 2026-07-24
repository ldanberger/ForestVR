
## Approach

Meta Quest 3 runs WebXR in its built-in browser, so I'll build the experience as a WebXR scene served from this app. The user opens the preview/published URL on the Quest 3, taps "Enter VR", and walks around with the controllers. No native app / APK — that would need Unity or the Meta SDK, which isn't buildable here.

Stack: **react-three-fiber** + **@react-three/drei** + **@react-three/xr** (all pure JS, Worker-safe for SSR because the canvas mounts client-only).

## Scene

A single immersive route at `/` with an "Enter VR" button. Inside VR:

- **Terrain**: procedurally displaced ground plane with rolling hills and a distant mountain ridge (heightmap via simplex noise).
- **Stream**: a curved animated water strip (scrolling normal-mapped plane) cutting through the valley.
- **Vegetation**: instanced low-poly trees (trunk cylinder + cone foliage) and scattered rocks (icosahedron with noise), placed with seeded randomness, avoiding the stream.
- **Wildlife**: simple low-poly rabbits and foxes (grouped primitives) that wander along randomized paths with a hop/trot animation. ~6 rabbits, ~3 foxes.
- **Sky**: drei `<Sky>` with soft directional sun + hemisphere light; light fog for depth.

## Locomotion

- **Smooth locomotion** on the left thumbstick (walk direction relative to head), **snap-turn** on the right thumbstick — the standard comfort default for Quest.
- Simple ground-follow: player Y snaps to terrain height under their feet.
- Desktop fallback: WASD + mouse-look via `PointerLockControls` so it's testable without a headset.

## Item pickup (axe, bow, sword)

- Three item meshes rest on a rock near spawn.
- Each controller exposes a grab: on **trigger/grip press**, if the controller ray/point intersects an item, the item parents to that controller; on release, it drops (parents back to world at current transform). Two-hand support isn't needed for v1.
- Bow: when held in one hand and the other controller's grip is held near the bowstring, a nocked arrow appears; releasing fires an arrow (simple ballistic Mesh with gravity, despawns on ground/timeout). Arrows are visual only — no hit reactions on animals in v1.
- Axe/sword: held items only, no chopping/damage logic in v1.

## Files

- `bun add three @react-three/fiber @react-three/drei @react-three/xr simplex-noise`
- `src/routes/index.tsx` — replaces placeholder; renders `<ForestVR />` client-only (dynamic import behind `<ClientOnly>` from drei) so SSR doesn't try to import three.
- `src/vr/ForestVR.tsx` — `<Canvas>` + `<XR>` + `<VRButton>`, scene composition.
- `src/vr/Terrain.tsx` — heightmap ground + mountains.
- `src/vr/Stream.tsx` — animated water strip.
- `src/vr/Scatter.tsx` — instanced trees + rocks.
- `src/vr/Animals.tsx` — rabbit/fox wanderers.
- `src/vr/Player.tsx` — locomotion, snap-turn, terrain-follow, desktop fallback.
- `src/vr/Items.tsx` — axe, bow, sword meshes + grab/drop logic + arrow firing.
- `src/vr/useHeightAt.ts` — shared terrain height sampler.
- Update `src/routes/__root.tsx` head metadata (title "Forest VR — Quest 3", description, og tags).

## Not in scope (v1)

- Native Quest APK / Meta SDK build.
- Damaging/killing animals, inventory UI, saving state, multiplayer.
- Photoreal assets — everything is stylized low-poly built from primitives so there are zero external model downloads.

Confirm and I'll build it.
