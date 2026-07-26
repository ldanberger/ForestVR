## Changes to `src/vr/Animals.tsx`

1. **Remove the hard-guarantee lunge block** (~line 289).
   - Delete the `itNoCloseT` accumulator, forced heading override, extra lunge step, and its post-lunge distance re-check / `playerCaught()` call.
   - Keep only the steering-based catch (distance check inside the normal chase branch) as the single catch pathway.

2. **Mark the catching animal blue permanently.**
   - Add a `caughtPlayer: boolean` flag to each critter's state (default `false`).
   - When the steering catch fires `playerCaught()`, also set `c.caughtPlayer = true` on that critter.
   - In the render/material step, if `c.caughtPlayer` is true, override the mesh color to blue for the rest of the session (takes precedence over the red "it" tint and normal species color).
   - Persist across future tag swaps — the flag is never cleared, so once blue, always blue.

3. **Minimap** (`src/vr/Minimap.tsx`): bump `APP_VERSION` to `0.35.0`.

## Notes

- No changes to `tagState.ts`, catch radius, freeze, cooldown, or infection logic.
- The 5-second celebration jump stays as-is.
- Multiple animals can end up blue over a long session (each new catcher joins the blue set).
