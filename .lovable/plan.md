## Problem

The current `createXRStore` call in `src/vr/ForestVR.tsx` doesn't specify a reference space. `@react-three/xr` v6 defaults to requesting `bounded-floor` (with `local-floor` as fallback). On Quest 3, `bounded-floor` requires a properly configured Guardian/bounded play area — if it can't be resolved, the session can start but render as a black frame (camera pose never resolves, or the scene sits outside the bounds volume).

You asked whether the code uses `bounded-floor`. Indirectly, yes — via the library default. That's a likely cause of the black screen.

## Fix

1. **In `src/vr/ForestVR.tsx`**, change the `createXRStore({...})` config to explicitly request only safe reference spaces and features:
   - `referenceSpace: "local-floor"` (fall back to `"local"` if unsupported)
   - Drop the implicit `bounded-floor` requirement
   - Keep `offerSession: "immersive-vr"`, `foveation: 0`, hand teleport pointer
   - Add `optionalFeatures: ["local-floor", "hand-tracking"]` and `requiredFeatures: ["local-floor"]` if the version accepts them; otherwise use the store's `sessionInit` option

2. **Add a small "VR session started" sanity log + on-screen overlay** while `vrSessionActive` is true, showing camera Y and the resolved reference space. This confirms the session is live even if the scene renders black, so we can tell "session never started" apart from "session started but scene invisible".

3. **Guarantee the player is above ground the moment the session begins.** In `src/vr/Player.tsx` (or `ForestVR.tsx` via `XRSessionSync`), on session start, snap the XR rig's world position to a safe spawn (`x=6, y=heightAt(6,6)+1.6, z=6`). Some Quest setups leave the rig at world origin (0,0,0), which under our carved stream corridor is at `y=-1.6` — the camera ends up underwater/underground, which reads as black.

4. **Bump version** in `src/vr/Minimap.tsx` to `v0.55.0`.

## Files touched

- `src/vr/ForestVR.tsx` — XR store config + diagnostic overlay
- `src/vr/Player.tsx` — spawn-snap on XR session start
- `src/vr/Minimap.tsx` — version bump

## Verification

After the change, entering VR on Quest 3 should show the forest immediately. If it's still black, the on-screen diagnostic will tell us whether the session even started and where the camera thinks it is, so the next iteration is targeted rather than another guess.

## Question

Is the black screen happening **inside the Meta Quest Browser opened directly to the site URL** (not inside Lovable's preview iframe)? WebXR won't render inside a cross-origin iframe on Quest — that alone causes a black VR view even when everything else is correct. If you're launching from the Lovable preview panel, open the published URL directly on the headset first; if that already works, this plan is unnecessary.
