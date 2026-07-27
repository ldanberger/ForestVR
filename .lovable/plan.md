## Fix: invisible vertical/horizontal line where "it" animals stop chasing

### Confirmed cause

This is **not** the stream/bank issue.

The current code has an animal-only square boundary:

- `src/vr/Animals.tsx`
  - non-it animals are limited to `WORLD_LIMIT = 55`
  - it animals are limited to `IT_WORLD_LIMIT = 58`
  - this clamp applies on both `x` and `z`, so it creates both vertical and horizontal invisible lines
- `src/vr/Player.tsx`
  - the player has no matching world clamp, so the player can walk outside the animal-reachable square

That matches the behavior you described:

1. Player moves outside the animal square.
2. It animals chase until they hit the invisible `x/z = ±58` boundary.
3. They cannot approach farther, so they appear to stay away in a clear field.
4. When the player crosses back over that invisible boundary, the animals can reach/catch the player.
5. `playerCaught()` clears all it animals, so they become non-it and move away because the player is it again.

### Plan

1. Create one shared playable-world boundary value for both player and animals.
   - Use a larger boundary matching the visible/minimap terrain, around `105` world units instead of `55/58`.
   - This removes the small invisible animal-only square inside the forest.

2. Update `src/vr/Animals.tsx`.
   - Replace `WORLD_LIMIT = 55` and `IT_WORLD_LIMIT = 58` with the shared boundary.
   - Keep the stream/bank logic unchanged so animals still cannot go through, under, over, or across water.
   - Keep tree/rock collision unchanged.

3. Update `src/vr/Player.tsx`.
   - Clamp player movement to the same shared playable boundary.
   - This prevents the player from walking outside the area animals can reach.
   - Do **not** block the player from entering the stream; water refill behavior remains unchanged.

4. Optional safety check inside the animal update loop.
   - If an it animal is chasing and far from the player, make sure its heading remains pointed toward the player unless water/tree/rock collision changes it.
   - No teleporting.
   - No stream crossing.

5. Update `src/vr/Minimap.tsx` version to `0.41.0`.

### Behavior after the fix

- It animals will no longer stop at the old hidden `±58` vertical/horizontal lines.
- Animals still cannot cross the stream.
- Player cannot escape outside the animal-reachable world.
- Catch/reset behavior remains the same once an it animal truly reaches the player.