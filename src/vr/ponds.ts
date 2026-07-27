// Fixed small ponds placed near map edges (but inside the playable area).
// Player can drink from any pond; animals treat ponds as impassable obstacles.
export type Pond = { x: number; z: number; r: number };

export const PONDS: Pond[] = [
  { x: -80, z: -72, r: 4.0 },
  { x:  82, z: -68, r: 3.6 },
  { x: -85, z:  78, r: 4.2 },
  { x:  78, z:  84, r: 3.8 },
];

/** Returns true when (x,z) is within `pad` metres of any pond's water. */
export function nearPondWater(x: number, z: number, pad = 0.8): boolean {
  for (const p of PONDS) {
    const dx = x - p.x;
    const dz = z - p.z;
    const reach = p.r + pad;
    if (dx * dx + dz * dz <= reach * reach) return true;
  }
  return false;
}
