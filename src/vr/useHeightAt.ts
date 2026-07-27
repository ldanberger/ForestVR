import { createNoise2D } from "simplex-noise";

// Seeded noise so terrain is identical on every render/frame.
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const noise = createNoise2D(seeded(1337));
const noise2 = createNoise2D(seeded(9021));

/** World-space terrain height sampler. Stream runs along x = 0. */
export function heightAt(x: number, z: number): number {
  const hills = noise(x * 0.025, z * 0.025) * 3.5;
  const bumps = noise2(x * 0.09, z * 0.09) * 0.9;
  // Mountain ridge to the north (negative z).
  const ridgeDist = Math.abs(z + 90);
  const ridge = Math.max(0, 1 - ridgeDist / 45) * 28;
  // Stream valley carved along x = 0.
  const valley = -Math.exp(-(x * x) / 18) * 2.2;
  return hills + bumps + ridge + valley;
}

export const STREAM_HALF_WIDTH = 1.6;
export const PLAYABLE_HALF_EXTENT = 105;
