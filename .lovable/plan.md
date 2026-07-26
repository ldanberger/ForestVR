## Remove all teleport logic from animals

Animals will only move via normal steering/walking — never snap to a new position.

### Changes in `src/vr/Animals.tsx`

1. **Chase-progress teleport (lines ~178–202)**: remove the block that snaps an "it" animal to ~6 m from the player when it hasn't closed distance in 2 s. Also drop the now-unused `itChaseT` / `itBestDist` bookkeeping updates tied to it. Keep the direct-line/weave chase steering and the `itNoCloseT` flag (still used by `forceDirect`).

2. **Stuck-in-place teleport (lines ~364–~395)**: remove the "hasn't moved in 5 s → jump to a random nearby spot" block. Replace it with a heading nudge only (randomize `c.heading`) so a stalled critter turns and walks out instead of teleporting. Drop the associated `lastCheckT/X/Z` fields if no longer referenced.

3. Leave intact: collision push-apart, overlap kill (`killAnimal`), freeze behavior, obstacle steering, world-edge clamping.

### Not changed

- `ForestVR.tsx` `hand: { teleportPointer: true }` is the VR hand-ray pointer visual, unrelated to animal teleport. Leaving it alone unless you also want VR locomotion teleport removed — say the word and I'll pull it too.
