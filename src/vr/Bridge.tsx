import { useMemo } from "react";
import * as THREE from "three";
import { heightAt, STREAM_HALF_WIDTH } from "./useHeightAt";

// Bridge crossing location (center along stream length z-axis) and footprint.
export const BRIDGE_Z = 0;
export const BRIDGE_HALF_LEN = 3; // 6 m long along the stream (z-axis)
export const BRIDGE_HALF_SPAN = 3; // 6 m span across x (covers ~3 m wide stream + banks)

/** True when a world-space z falls within the bridge deck along the stream. */
export function onBridge(z: number): boolean {
  return Math.abs(z - BRIDGE_Z) <= BRIDGE_HALF_LEN;
}

export function Bridge() {
  // Anchor the deck slightly above bank height so it clearly sits over the water.
  const deckY = useMemo(() => {
    const bank = STREAM_HALF_WIDTH + 0.2;
    const h = Math.max(heightAt(bank, BRIDGE_Z), heightAt(-bank, BRIDGE_Z));
    return h + 0.35;
  }, []);

  const plankBrown = "#6b4a2b";
  const railBrown = "#4a2f18";

  return (
    <group position={[0, 0, BRIDGE_Z]}>
      {/* Deck */}
      <mesh position={[0, deckY, 0]} castShadow receiveShadow>
        <boxGeometry args={[BRIDGE_HALF_SPAN * 2, 0.2, BRIDGE_HALF_LEN * 2]} />
        <meshStandardMaterial color={plankBrown} roughness={0.9} metalness={0.02} />
      </mesh>
      {/* Plank seams (thin dark strips) */}
      {Array.from({ length: 5 }).map((_, i) => {
        const z = -BRIDGE_HALF_LEN + ((i + 1) * (BRIDGE_HALF_LEN * 2)) / 6;
        return (
          <mesh key={i} position={[0, deckY + 0.101, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[BRIDGE_HALF_SPAN * 2, 0.04]} />
            <meshStandardMaterial color="#2b1a0d" roughness={1} />
          </mesh>
        );
      })}
      {/* Rails (both sides, along x-axis edges of the deck) */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * BRIDGE_HALF_SPAN, deckY + 0.55, 0]} castShadow>
            <boxGeometry args={[0.1, 0.1, BRIDGE_HALF_LEN * 2]} />
            <meshStandardMaterial color={railBrown} roughness={0.85} />
          </mesh>
          {/* Posts */}
          {[-BRIDGE_HALF_LEN, -BRIDGE_HALF_LEN / 2, 0, BRIDGE_HALF_LEN / 2, BRIDGE_HALF_LEN].map(
            (z) => (
              <mesh
                key={z}
                position={[s * BRIDGE_HALF_SPAN, deckY + 0.3, z]}
                castShadow
              >
                <boxGeometry args={[0.12, 0.6, 0.12]} />
                <meshStandardMaterial color={railBrown} roughness={0.85} />
              </mesh>
            ),
          )}
        </group>
      ))}
    </group>
  );
}
