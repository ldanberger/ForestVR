import { useEffect, useRef } from "react";
import { heightAt, STREAM_HALF_WIDTH } from "./useHeightAt";
import { playerState } from "./playerState";
import { survivalState } from "./survivalState";
import { tagState } from "./tagState";
import { PONDS } from "./ponds";
import { BRIDGE_HALF_LEN, BRIDGE_HALF_SPAN, BRIDGE_Z } from "./Bridge";

const MAP_WORLD = 220; // covers -110..110
const MAP_PX = 180;
const REVEAL_RADIUS_WORLD = 14;
const APP_VERSION = "0.57.0";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
// Mirrors Scatter.scatterPoints for tree seed=42, count=280
function treePoints() {
  const r = rng(42);
  const pts: Array<{ x: number; z: number }> = [];
  const radius = 100;
  let tries = 0;
  while (pts.length < 280 && tries < 280 * 20) {
    tries++;
    const x = (r() - 0.5) * 2 * radius;
    const z = (r() - 0.5) * 2 * radius;
    if (Math.abs(x) < STREAM_HALF_WIDTH + 1.5) continue;
    const y = heightAt(x, z);
    if (y < 0.3 || y > 12) continue;
    pts.push({ x, z });
  }
  return pts;
}

function worldToPx(v: number) {
  return ((v + MAP_WORLD / 2) / MAP_WORLD) * MAP_PX;
}

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const maskRef = useRef<Uint8Array | null>(null);

  // Build base terrain image once
  useEffect(() => {
    const base = document.createElement("canvas");
    base.width = MAP_PX;
    base.height = MAP_PX;
    const bctx = base.getContext("2d")!;
    const img = bctx.createImageData(MAP_PX, MAP_PX);
    for (let py = 0; py < MAP_PX; py++) {
      for (let px = 0; px < MAP_PX; px++) {
        const wx = (px / MAP_PX) * MAP_WORLD - MAP_WORLD / 2;
        const wz = (py / MAP_PX) * MAP_WORLD - MAP_WORLD / 2;
        const h = heightAt(wx, wz);
        let r = 90, g = 130, b = 70; // grass
        if (Math.abs(wx) < STREAM_HALF_WIDTH + 0.4) {
          r = 55; g = 110; b = 165; // water
        } else if (h > 14) {
          r = 240; g = 240; b = 245; // snow peak
        } else if (h > 8) {
          r = 120; g = 110; b = 100; // rocky mountain
        } else if (h > 4) {
          r = 110; g = 140; b = 80;
        } else if (h < 0.5) {
          r = 180; g = 170; b = 130; // dry lowland
        }
        const i = (py * MAP_PX + px) * 4;
        img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
      }
    }
    bctx.putImageData(img, 0, 0);

    // Draw trees as small dark green dots
    const trees = treePoints();
    bctx.fillStyle = "#1e3a1a";
    for (const t of trees) {
      bctx.beginPath();
      bctx.arc(worldToPx(t.x), worldToPx(t.z), 1.3, 0, Math.PI * 2);
      bctx.fill();
    }

    // Draw ponds as blue discs with a darker outline
    for (const p of PONDS) {
      const px = worldToPx(p.x);
      const py = worldToPx(p.z);
      const rpx = (p.r / MAP_WORLD) * MAP_PX;
      bctx.fillStyle = "#3778a8";
      bctx.strokeStyle = "#12324a";
      bctx.lineWidth = 0.8;
      bctx.beginPath();
      bctx.arc(px, py, rpx, 0, Math.PI * 2);
      bctx.fill();
      bctx.stroke();
    }

    // Draw the bridge as a brown rectangle spanning the stream
    {
      const bx = worldToPx(-BRIDGE_HALF_SPAN);
      const by = worldToPx(BRIDGE_Z - BRIDGE_HALF_LEN);
      const bw = (BRIDGE_HALF_SPAN * 2 / MAP_WORLD) * MAP_PX;
      const bh = (BRIDGE_HALF_LEN * 2 / MAP_WORLD) * MAP_PX;
      bctx.fillStyle = "#6b4a2b";
      bctx.strokeStyle = "#2b1a0d";
      bctx.lineWidth = 0.8;
      bctx.fillRect(bx, by, bw, bh);
      bctx.strokeRect(bx, by, bw, bh);
    }

    baseRef.current = base;
    maskRef.current = new Uint8Array(MAP_PX * MAP_PX);
  }, []);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      const base = baseRef.current;
      const mask = maskRef.current;
      if (canvas && base && mask) {
        const ctx = canvas.getContext("2d")!;
        // Reveal around player
        const cx = worldToPx(playerState.pos.x);
        const cy = worldToPx(playerState.pos.z);
        const rpx = (REVEAL_RADIUS_WORLD / MAP_WORLD) * MAP_PX;
        const r2 = rpx * rpx;
        const x0 = Math.max(0, Math.floor(cx - rpx));
        const x1 = Math.min(MAP_PX - 1, Math.ceil(cx + rpx));
        const y0 = Math.max(0, Math.floor(cy - rpx));
        const y1 = Math.min(MAP_PX - 1, Math.ceil(cy + rpx));
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            const dx = x - cx, dy = y - cy;
            if (dx * dx + dy * dy <= r2) mask[y * MAP_PX + x] = 255;
          }
        }

        // Composite: draw base, then dark overlay where unexplored
        ctx.clearRect(0, 0, MAP_PX, MAP_PX);
        ctx.drawImage(base, 0, 0);
        const overlay = ctx.getImageData(0, 0, MAP_PX, MAP_PX);
        for (let i = 0; i < mask.length; i++) {
          if (mask[i] < 255) {
            const j = i * 4;
            // Fade toward dark based on mask
            const m = mask[i] / 255;
            overlay.data[j] = overlay.data[j] * m + 18 * (1 - m);
            overlay.data[j + 1] = overlay.data[j + 1] * m + 22 * (1 - m);
            overlay.data[j + 2] = overlay.data[j + 2] * m + 28 * (1 - m);
          }
        }
        ctx.putImageData(overlay, 0, 0);

        // Found carrots (picked up by player) shown as orange dots
        for (const c of survivalState.carrots) {
          if (!c.foundByPlayer) continue;
          const mx = worldToPx(c.x);
          const my = worldToPx(c.z);
          ctx.fillStyle = "#e26a1f";
          ctx.strokeStyle = "#000";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(mx, my, 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // Only show animal dots inside explored (revealed) areas
        const isExplored = (wx: number, wz: number) => {
          const px = Math.round(worldToPx(wx));
          const py = Math.round(worldToPx(wz));
          if (px < 0 || py < 0 || px >= MAP_PX || py >= MAP_PX) return false;
          return mask[py * MAP_PX + px] >= 200;
        };

        // All non-it animals shown as small species-colored dots
        for (const critter of tagState.critters) {
          if (tagState.itIds.has(critter.id)) continue;
          if (!isExplored(critter.pos.x, critter.pos.z)) continue;
          const mx = worldToPx(critter.pos.x);
          const my = worldToPx(critter.pos.z);
          ctx.fillStyle =
            (critter as unknown as { species?: string }).species === "fox" ? "#e2691f" : "#f2ead6";
          ctx.strokeStyle = "#000";
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.arc(mx, my, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // "It" animals shown as red dots with a blinking glow
        const blink = 0.5 + 0.5 * Math.sin(performance.now() * 0.012);
        for (const critter of tagState.critters) {
          if (!tagState.itIds.has(critter.id)) continue;
          if (!isExplored(critter.pos.x, critter.pos.z)) continue;
          const mx = worldToPx(critter.pos.x);
          const my = worldToPx(critter.pos.z);
          ctx.fillStyle = `rgba(255,40,40,${0.15 + 0.4 * blink})`;
          ctx.beginPath();
          ctx.arc(mx, my, 4 + 4 * blink, 0, Math.PI * 2);
          ctx.fill();
          if (blink > 0.35) {
            ctx.fillStyle = "#ff2020";
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(mx, my, 2.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }

        // Player marker (triangle pointing along yaw)
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-playerState.yaw);
        ctx.fillStyle = "#ffd23f";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(4, 4);
        ctx.lineTo(-4, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        zIndex: 10,
        padding: 6,
        background: "rgba(0,0,0,0.55)",
        border: "1px solid #444",
        borderRadius: 8,
        pointerEvents: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        width={MAP_PX}
        height={MAP_PX}
        style={{ display: "block", width: MAP_PX, height: MAP_PX, imageRendering: "pixelated", borderRadius: 4 }}
      />
      <div style={{ color: "#fff", fontSize: 11, textAlign: "center", marginTop: 4, fontFamily: "sans-serif" }}>
        Map · explore to reveal
      </div>
      <NearestItReadout />
      <div
        style={{
          color: "#bbb",
          fontSize: 10,
          textAlign: "center",
          marginTop: 4,
          fontFamily: "sans-serif",
          letterSpacing: 0.3,
        }}
      >
        v{APP_VERSION}
      </div>
    </div>
  );
}

function NearestItReadout() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        let best = Infinity;
        for (const c of tagState.critters) {
          if (!tagState.itIds.has(c.id)) continue;
          const dx = c.pos.x - playerState.pos.x;
          const dz = c.pos.z - playerState.pos.z;
          const d = Math.hypot(dx, dz);
          if (d < best) best = d;
        }
        if (!isFinite(best)) {
          el.textContent = tagState.playerIsIt ? "You are IT" : "No 'it' animals";
          el.style.color = "#9fe89f";
        } else {
          el.textContent = `Nearest IT: ${best.toFixed(1)} m`;
          el.style.color = best < 6 ? "#ff6a6a" : best < 15 ? "#ffd23f" : "#fff";
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div
      ref={ref}
      style={{
        color: "#fff",
        fontSize: 12,
        fontWeight: 700,
        textAlign: "center",
        marginTop: 2,
        fontFamily: "sans-serif",
        textShadow: "0 1px 2px rgba(0,0,0,0.8)",
      }}
    />
  );
}
