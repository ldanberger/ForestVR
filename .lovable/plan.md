## Goal
Place a visible wooden bridge across the central stream. Animals can walk across the stream within the bridge's footprint; outside it, water remains impassable.

## Approach

### 1. Bridge geometry — new `src/vr/Bridge.tsx`
- Export `BRIDGE_Z = 0` (center along stream length) and `BRIDGE_HALF_LEN = 3` (6 m wide crossing along z-axis).
- Render a group at `[0, terrainHeight(0,0) ~ -0.2, BRIDGE_Z]`:
  - Deck: `boxGeometry` ~ 5 m (x, spans stream + banks) × 0.2 m × 6 m (z), warm plank-brown `MeshStandardMaterial` (roughness 0.85).
  - Two rails: thin boxes on ±z edges, 0.1 × 0.9 × 6, plus 4 short posts at corners.
  - Slight subdivisions across x to fake plank lines via repeated small boxes (optional, keep simple).
- Cast/receive shadows.

### 2. Integrate into scene
- `src/vr/ForestVR.tsx`: import and render `<Bridge />` alongside `<Stream />`.

### 3. Let animals cross on the bridge — `src/vr/obstacles.ts`
- Add helper `onBridge(z: number)` = `Math.abs(z - BRIDGE_Z) <= BRIDGE_HALF_LEN`.
- In `resolveObstacles` and `steerAroundObstacles`, skip the "water strip along x=0" clamp/steer when `onBridge(pos.z)`.

### 4. Let animal wander loop cross too — `src/vr/Animals.tsx`
- In the `bankSide` clamp block (~line 290), skip the push-out when `Math.abs(c.pos.z - BRIDGE_Z) <= BRIDGE_HALF_LEN`. Also once an animal reaches the far bank via the bridge, update `c.bankSide = c.pos.x >= 0 ? 1 : -1` so it isn't yanked back on the next tick.
- In the early stream-limit block (~line 79) that clamps `pos.x`, apply the same bridge exemption.

### 5. Keep spawn exclusion zones intact
- Carrots/Scatter/Animals spawn exclusions around the stream stay unchanged so nothing spawns on the bridge deck itself.

### 6. Minimap
- `src/vr/Minimap.tsx`: draw a small brown rectangle at world (0, BRIDGE_Z) sized to bridge footprint, drawn above the stream line but under animal dots.
- Bump `APP_VERSION` to `0.44.0`.

## Technical notes
- Constants live in the new `Bridge.tsx` and are imported where needed (Animals, obstacles, Minimap).
- No physics library — the deck is purely visual; the player already walks freely (water refill trigger only fires when actually within stream x-band, which the bridge overlaps — acceptable, matches "standing at stream" behavior).
- No changes to survival, tag, or player speed logic.
