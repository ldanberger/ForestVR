// Shared obstacle registry so animals can steer around trees and rocks.
// Positions here MUST mirror the scatter calls in Scatter.tsx (same seed and
// filters) so animals collide with exactly what the player sees.

import { heightAt, STREAM_HALF_WIDTH } from "./useHeightAt";

export type Obstacle = { x: number; z: number; r: number };

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function scatter(
  count: number,
  seed: number,
  opts: { minY?: number; maxY?: number; radius?: number; blockRadius: number },
): Obstacle[] {
  const r = rng(seed);
  const pts: Obstacle[] = [];
  const radius = opts.radius ?? 100;
  let tries = 0;
  while (pts.length < count && tries < count * 20) {
    tries++;
    const x = (r() - 0.5) * 2 * radius;
    const z = (r() - 0.5) * 2 * radius;
    if (Math.abs(x) < STREAM_HALF_WIDTH + 1.5) continue;
    const y = heightAt(x, z);
    if (opts.minY !== undefined && y < opts.minY) continue;
    if (opts.maxY !== undefined && y > opts.maxY) continue;
    pts.push({ x, z, r: opts.blockRadius });
  }
  return pts;
}

let cached: Obstacle[] | null = null;
export function getObstacles(): Obstacle[] {
  if (cached) return cached;
  const trees = scatter(280, 42, { minY: 0.3, maxY: 12, blockRadius: 0.75 });
  const rocks = scatter(120, 7, { minY: -1, maxY: 20, blockRadius: 1.1 });
  cached = [...trees, ...rocks];
  return cached;
}

/**
 * If (x,z) is inside any obstacle, push it out to the obstacle edge.
 * Returns true if a collision was resolved.
 */
export function resolveObstacleCollision(pos: { x: number; z: number }, agentR = 0.35): boolean {
  const obs = getObstacles();
  let hit = false;
  for (const o of obs) {
    const dx = pos.x - o.x;
    const dz = pos.z - o.z;
    const min = o.r + agentR;
    const d2 = dx * dx + dz * dz;
    if (d2 < min * min && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      pos.x = o.x + (dx / d) * min;
      pos.z = o.z + (dz / d) * min;
      hit = true;
    } else if (d2 <= 1e-6) {
      // Exactly on center: nudge in an arbitrary direction.
      pos.x = o.x + min;
      hit = true;
    }
  }
  return hit;
}
