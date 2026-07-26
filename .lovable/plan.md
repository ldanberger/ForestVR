## Root cause (confirmed)

The bug isn't triggered by eating itself — it's triggered by the food-based player-speed rule. Eating a carrot pushes `survivalState.food` back over the fast threshold, so `src/vr/Player.tsx` moves the player at `MOVE_SPEED_FAST = 7 m/s`. Meanwhile in `src/vr/Animals.tsx`, "it" animals chase at `c.speed * IT_SPEED_MULT`:

- Rabbit base `1.2` × `IT_SPEED_MULT 3.2` = **3.84 m/s**
- Fox base `1.9` × `IT_SPEED_MULT 3.2` = **6.08 m/s**

Both are slower than a well-fed player, so once the player runs, the chaser can never close the gap — it just tracks along at the maximum distance the AI is willing to hold. The occasional 1.6× "hard-guarantee lunge" is a single-frame boost and can't sustain pursuit.

## Fix

Guarantee that any "it" animal is faster than the fastest player state, regardless of species base speed.

1. `src/vr/tagState.ts`
   - Add `export const IT_MIN_SPEED = 7.8;` (≈ player fast 7 m/s + margin).

2. `src/vr/Animals.tsx`
   - Import `IT_MIN_SPEED`.
   - In the chase branch (currently `speed = c.speed * IT_SPEED_MULT;`) use `speed = Math.max(c.speed * IT_SPEED_MULT, IT_MIN_SPEED);` so both rabbits and foxes exceed the player's top speed while "it".
   - Apply the same floor to the hard-lunge step so the lunge distance also reflects the boosted speed.

No changes to survival, carrot, or player-speed logic — those already behave as previously specified.

## Verification

- Read the two edited files back after the change.
- Confirm in the preview that an "it" fox/rabbit closes on a well-fed player who eats a carrot and runs, instead of pacing at a fixed distance.
