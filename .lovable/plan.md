Fix the phantom player-catch that happens when a stuck "it" animal is killed by the overlap-timeout.

In `src/vr/Animals.tsx`, the animal-animal separation block currently kills `c` (the current critter) after 1.5s of continuous overlap. Change it so that when overlap timeout fires:

- If the current critter is "it" (in `tagState.itIds`) and the other overlapping critter is not, kill the non-it one instead (via `killAnimal(other.id)` and mark it dead in the local critters array if we can find it), and reset `c.overlapT` to 0.
- If neither or both are "it", keep current behavior (kill `c`).

Because the local `critters` array is per-species (rabbits vs foxes) and `tagState.critters` is the union, when we need to hide the killed sibling we look it up in the current group's list; if not found there, `killAnimal(other.id)` alone is enough (the other species' render loop will observe `dead` via its own overlap tracking? No — we should also flag it). Simplest reliable approach: call `killAnimal(other.id)` and additionally set `other.dead = true` on the tag-state critter reference (widen the shared type by casting) so any species group that owns it hides its mesh next frame.

Actually, `dead` is a field on the local `Critter` in `Animals.tsx`, not on `tagState.critters` entries. The `tagState.critters` entries only carry `{ id, pos, species }`. Hiding the mesh needs the local `dead` flag. To keep this simple and correct: when the "it" critter would die, instead swap — mark `c.dead = false` (unchanged), set `c.overlapT = 0`, and find the non-it partner in the current group's local `critters` array; if present, set `partner.dead = true` and call `killAnimal(partner.id)`. If the partner is in the other species group, fall back to killing `c` as today (rare enough — cross-species overlaps still resolve, just not perfectly).

Also bump `APP_VERSION` in `src/vr/Minimap.tsx` to `0.40.0`.

No changes to freeze/celebration timers or catch radii.