import { useMemo } from "react";
import { STREAM_WATER_Y } from "./useHeightAt";

// Bridge crossing location and footprint.
// The stream runs along z; the bridge crosses it, long across x and narrow along z.
export const BRIDGE_Z = 0;
export const BRIDGE_HALF_SPAN = 4;  // 8 m long across the stream (x-axis)
export const BRIDGE_HALF_LEN = 1.2; // 2.4 m wide along the stream (z-axis)

/** True when a world-space z falls within the bridge deck along the stream. */
export function onBridge(z: number): boolean {
  return Math.abs(z - BRIDGE_Z) <= BRIDGE_HALF_LEN;
}

export function Bridge() {
  // Sit the deck a comfortable step above the flat water surface.
  const deckY = useMemo(() => STREAM_WATER_Y + 0.7, []);

  const plankBrown = "#6b4a2b";
  const railBrown = "#4a2f18";

  return (
    <group position={[0, 0, BRIDGE_Z]}>
      {/* Deck */}
      <mesh position={[0, deckY, 0]} castShadow receiveShadow>
        <boxGeometry args={[BRIDGE_HALF_SPAN * 2, 0.2, BRIDGE_HALF_LEN * 2]} />
        <meshStandardMaterial color={plankBrown} roughness={0.9} metalness={0.02} />
      </mesh>
      {/* Plank seams — thin dark strips running across the walking direction. */}
      {Array.from({ length: 7 }).map((_, i) => {
        const x = -BRIDGE_HALF_SPAN + ((i + 1) * (BRIDGE_HALF_SPAN * 2)) / 8;
        return (
          <mesh key={i} position={[x, deckY + 0.101, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.04, BRIDGE_HALF_LEN * 2]} />
            <meshStandardMaterial color="#2b1a0d" roughness={1} />
          </mesh>
        );
      })}
      {/* Rails on the two long sides (±z edges of the deck) */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[0, deckY + 0.55, s * BRIDGE_HALF_LEN]} castShadow>
            <boxGeometry args={[BRIDGE_HALF_SPAN * 2, 0.1, 0.1]} />
            <meshStandardMaterial color={railBrown} roughness={0.85} />
          </mesh>
          {/* Posts along the rail */}
          {[-BRIDGE_HALF_SPAN, -BRIDGE_HALF_SPAN / 2, 0, BRIDGE_HALF_SPAN / 2, BRIDGE_HALF_SPAN].map(
            (x) => (
              <mesh
                key={x}
                position={[x, deckY + 0.3, s * BRIDGE_HALF_LEN]}
                castShadow
              >
                <boxGeometry args={[0.12, 0.6, 0.12]} />
                <meshStandardMaterial color={railBrown} roughness={0.85} />
              </mesh>
            ),
          )}
        </group>
      ))}
      {/* Support pillars into the water on both banks */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * (BRIDGE_HALF_SPAN - 0.4), deckY - 0.7, 0]}
          castShadow
        >
          <boxGeometry args={[0.25, 1.4, BRIDGE_HALF_LEN * 2 - 0.2]} />
          <meshStandardMaterial color={railBrown} roughness={0.9} />
        </mesh>
      ))}
      {/* Sloped earthen ramps on each bank so animals can walk up and over. */}
      {[-1, 1].map((s) => {
        const rampLen = 4.5;
        const angle = 0.32; // ~18° incline
        // Top of ramp meets the deck edge; far end slopes down into the bank.
        const cx = s * (BRIDGE_HALF_SPAN + (rampLen / 2) * Math.cos(angle));
        const cy = deckY - (rampLen / 2) * Math.sin(angle);
        return (
          <mesh
            key={s}
            position={[cx, cy, 0]}
            rotation={[0, 0, s * angle]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[rampLen, 0.18, BRIDGE_HALF_LEN * 2]} />
            <meshStandardMaterial color={plankBrown} roughness={0.95} metalness={0.02} />
          </mesh>
        );
      })}
    </group>
  );
}

