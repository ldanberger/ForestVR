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

/** Flat water surface elevation. Terrain along the stream sits below this. */
export const STREAM_WATER_Y = -1.0;
const STREAM_BED_Y = -1.6;
const CORRIDOR_HALF = 3.5; // fully flat within |x| < CORRIDOR_HALF
const CORRIDOR_BLEND = 6.0; // fully natural terrain beyond CORRIDOR_HALF + CORRIDOR_BLEND

/** World-space terrain height sampler. Stream runs along x = 0. */
export function heightAt(x: number, z: number): number {
  const hills = noise(x * 0.025, z * 0.025) * 3.5;
  const bumps = noise2(x * 0.09, z * 0.09) * 0.9;
  // Mountain ridge to the north (negative z).
  const ridgeDist = Math.abs(z + 90);
  const ridge = Math.max(0, 1 - ridgeDist / 45) * 28;
  const natural = hills + bumps + ridge;

  // Blend terrain toward a flat stream bed inside the corridor so the water
  // surface is always visible and never buried by hills or the ridge.
  const ax = Math.abs(x);
  let t: number;
  if (ax <= CORRIDOR_HALF) t = 1;
  else if (ax >= CORRIDOR_HALF + CORRIDOR_BLEND) t = 0;
  else {
    const u = (ax - CORRIDOR_HALF) / CORRIDOR_BLEND;
    t = 1 - u * u * (3 - 2 * u); // smoothstep
  }
  return natural * (1 - t) + STREAM_BED_Y * t;
}

export const STREAM_HALF_WIDTH = 1.6;
export const PLAYABLE_HALF_EXTENT = 105;
