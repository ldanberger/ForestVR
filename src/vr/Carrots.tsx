import { useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { heightAt, STREAM_HALF_WIDTH } from "./useHeightAt";
import { playerState } from "./playerState";
import {
  survivalState,
  CARROT_PICK_RADIUS,
  type Carrot,
} from "./survivalState";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function generateCarrots(count = 60): Carrot[] {
  const r = rng(7331);
  const out: Carrot[] = [];
  const radius = 90;
  let tries = 0;
  while (out.length < count && tries < count * 40) {
    tries++;
    const x = (r() - 0.5) * 2 * radius;
    const z = (r() - 0.5) * 2 * radius;
    if (Math.abs(x) < STREAM_HALF_WIDTH + 1.2) continue;
    const y = heightAt(x, z);
    if (y < 0.4 || y > 6) continue;
    out.push({ id: out.length, x, z, picked: false, foundByPlayer: false });
  }
  return out;
}

export function Carrots() {
  const [, force] = useState(0);
  const carrots = useMemo(() => {
    const c = generateCarrots();
    survivalState.carrots = c;
    return c;
  }, []);

  useEffect(() => {
    survivalState.carrots = carrots;
  }, [carrots]);

  const groupRefs = useRef<(THREE.Group | null)[]>([]);

  useFrame(() => {
    if (survivalState.gameOver) return;
    const px = playerState.pos.x;
    const pz = playerState.pos.z;
    let changed = false;
    for (const c of carrots) {
      if (c.picked) continue;
      const dx = c.x - px;
      const dz = c.z - pz;
      if (dx * dx + dz * dz < CARROT_PICK_RADIUS * CARROT_PICK_RADIUS) {
        c.picked = true;
        c.foundByPlayer = true;
        survivalState.backpack += 1;
        survivalState.version++;
        changed = true;
      }
    }
    if (changed) force((n) => n + 1);
  });

  return (
    <group>
      {carrots.map((c, i) => {
        if (c.picked) return null;
        const y = heightAt(c.x, c.z);
        return (
          <group
            key={c.id}
            ref={(g) => {
              groupRefs.current[i] = g;
            }}
            position={[c.x, y + 0.08, c.z]}
            rotation={[Math.PI, 0, 0]}
          >
            {/* Carrot body — cone points down into the ground */}
            <mesh castShadow position={[0, 0.05, 0]}>
              <coneGeometry args={[0.06, 0.22, 10]} />
              <meshStandardMaterial color="#e26a1f" roughness={0.7} />
            </mesh>
            {/* Leafy top */}
            <group rotation={[Math.PI, 0, 0]} position={[0, 0.16, 0]}>
              <mesh position={[0, 0.09, 0]} rotation={[0, 0, 0.2]}>
                <coneGeometry args={[0.03, 0.18, 6]} />
                <meshStandardMaterial color="#2f7a2a" roughness={0.9} />
              </mesh>
              <mesh position={[0.03, 0.09, 0]} rotation={[0.15, 0, -0.25]}>
                <coneGeometry args={[0.025, 0.16, 6]} />
                <meshStandardMaterial color="#3a8f34" roughness={0.9} />
              </mesh>
              <mesh position={[-0.03, 0.09, 0.02]} rotation={[-0.1, 0.2, 0.15]}>
                <coneGeometry args={[0.025, 0.15, 6]} />
                <meshStandardMaterial color="#256b22" roughness={0.9} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
}
