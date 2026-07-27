// Shared obstacle registry so animals can steer around trees and rocks.
// Positions here MUST mirror the scatter calls in Scatter.tsx (same seed and
// filters) so animals collide with exactly what the player sees.

import { heightAt, STREAM_HALF_WIDTH } from "./useHeightAt";
import { PONDS } from "./ponds";
import { onBridge } from "./Bridge";

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
  // Ponds act as impassable water discs for animals.
  const ponds: Obstacle[] = PONDS.map((p) => ({ x: p.x, z: p.z, r: p.r + 0.4 }));
  cached = [...trees, ...rocks, ...ponds];
  return cached;
}

/**
 * If (x,z) is inside any obstacle, push it out to the obstacle edge.
 * Returns true if a collision was resolved.
 */
export function resolveObstacleCollision(pos: { x: number; z: number }, agentR = 0.35): boolean {
  const obs = getObstacles();
  let hit = false;
  // Water strip along x = 0: push agents out to the nearest bank, except where
  // the bridge crosses (animals may walk over the deck there).
  const bank = STREAM_HALF_WIDTH + agentR;
  if (Math.abs(pos.x) < bank && !onBridge(pos.z)) {
    pos.x = pos.x >= 0 ? bank : -bank;
    hit = true;
  }
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

/**
 * If the desired heading points into an obstacle within `lookahead`, return an
 * adjusted heading that steers around it (whichever side is closer). Otherwise
 * returns the desired heading unchanged.
 */
export function steerAroundObstacles(
  x: number,
  z: number,
  desiredHeading: number,
  lookahead: number,
  agentR = 0.5,
): number {
  const obs = getObstacles();
  const dirX = Math.cos(desiredHeading);
  const dirZ = Math.sin(desiredHeading);
  // Water strip along x = 0: if heading would cross or enter the stream within
  // lookahead, steer parallel to it along the current bank. Skipped when the
  // agent is aligned with the bridge deck.
  if (!onBridge(z)) {
    const bank = STREAM_HALF_WIDTH + agentR;
    const sideSign = x >= 0 ? 1 : -1;
    const signedDist = sideSign * x - bank; // >0 outside bank, <0 inside/over
    const approach = -sideSign * dirX; // >0 when heading toward water
    if (approach > 1e-3) {
      const distToBank = Math.max(signedDist, 0);
      if (distToBank < lookahead) {
        // Turn to run along the stream (±z), preferring the smaller course change.
        const alongZ = dirZ >= 0 ? Math.PI / 2 : -Math.PI / 2;
        return alongZ;
      }
    }
  }
  let best: { o: Obstacle; along: number } | null = null;
  for (const o of obs) {
    const dx = o.x - x;
    const dz = o.z - z;
    const along = dx * dirX + dz * dirZ;
    if (along <= 0 || along > lookahead) continue;
    const perp = Math.abs(dx * -dirZ + dz * dirX);
    if (perp > o.r + agentR + 0.2) continue;
    if (!best || along < best.along) best = { o, along };
  }
  if (!best) return desiredHeading;
  // Pick the side that requires the smaller turn.
  const toObs = Math.atan2(best.o.z - z, best.o.x - x);
  const relative = Math.atan2(Math.sin(desiredHeading - toObs), Math.cos(desiredHeading - toObs));
  const side = relative >= 0 ? 1 : -1;
  // Turn ~60° off the obstacle bearing on the chosen side.
  return toObs + side * (Math.PI / 3);
}

