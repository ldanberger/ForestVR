import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { heightAt } from "./useHeightAt";

// Simple value noise for procedural textures
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, u), THREE.MathUtils.lerp(c, d, u), v);
}
function fbm(x: number, y: number, oct = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += vnoise(x * f, y * f) * a; n += a; a *= 0.5; f *= 2.02; }
  return s / n;
}

function makeNormalMap(size: number, scaleX: number, scaleY: number) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = x * scaleX, sy = y * scaleY;
      const h = fbm(sx, sy, 4);
      const hx = fbm(sx + 0.5, sy, 4);
      const hy = fbm(sx, sy + 0.5, 4);
      const dx = (hx - h) * 8;
      const dy = (hy - h) * 8;
      const nx = -dx, ny = -dy, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const i = (y * size + x) * 4;
      data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function Stream() {
  const geomRef = useRef<THREE.PlaneGeometry>(null);
  const basePositions = useRef<Float32Array | null>(null);

  const normalA = useMemo(() => {
    const t = makeNormalMap(256, 0.06, 0.045);
    t.repeat.set(3, 30);
    return t;
  }, []);
  const normalB = useMemo(() => {
    const t = makeNormalMap(256, 0.11, 0.09);
    t.repeat.set(5, 55);
    return t;
  }, []);

  // Riverbank foam strip using a second thin plane could be added later.

  const STREAM_LEN = 240;
  const WATER_DEPTH = 0.35; // meters below the bank

  // Build a plane whose vertices follow the terrain valley in world Y.
  function buildStreamGeo(width: number, segX: number) {
    const g = new THREE.PlaneGeometry(width, STREAM_LEN, segX, 240);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      // Local y after rotation(-PI/2 about X) maps to world -z, so worldZ = -localY.
      const localY = pos.getY(i);
      const worldZ = -localY;
      const bankY = heightAt(0, worldZ);
      // Displace local z (which becomes world y) to seat water below the bank.
      pos.setZ(i, bankY - WATER_DEPTH);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }

  const waterGeo = useMemo(() => {
    const g = buildStreamGeo(3, 12);
    basePositions.current = new Float32Array(g.attributes.position.array as Float32Array);
    return g;
  }, []);
  const rippleGeo = useMemo(() => buildStreamGeo(3, 12), []);
  const bankGeo = useMemo(() => buildStreamGeo(3.6, 6), []);

  useFrame((state, dt) => {
    normalA.offset.y -= dt * 0.22;
    normalA.offset.x += dt * 0.02;
    normalB.offset.y -= dt * 0.35;
    normalB.offset.x -= dt * 0.015;

    // Gentle wave displacement on the water surface, added on top of the
    // baked-in terrain-following Z from basePositions.
    const g = geomRef.current;
    const base = basePositions.current;
    if (g && base) {
      const pos = g.attributes.position as THREE.BufferAttribute;
      const t = state.clock.elapsedTime;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3];
        const y = base[i * 3 + 1];
        const baseZ = base[i * 3 + 2];
        const wave =
          Math.sin(y * 0.6 + t * 1.4) * 0.04 +
          Math.sin(x * 2.1 + y * 0.3 + t * 2.2) * 0.025 +
          Math.cos(y * 1.3 - t * 1.1) * 0.02;
        pos.setZ(i, baseZ + wave);
      }
      pos.needsUpdate = true;
      g.computeVertexNormals();
    }
  });

  return (
    <group>
      {/* Water */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <primitive object={waterGeo} ref={geomRef} attach="geometry" />
        <meshPhysicalMaterial
          color="#1f4a63"
          transparent
          opacity={0.9}
          roughness={0.08}
          metalness={0.05}
          transmission={0.35}
          thickness={0.6}
          ior={1.33}
          clearcoat={1}
          clearcoatRoughness={0.1}
          normalMap={normalA}
          normalScale={new THREE.Vector2(0.7, 0.7)}
          envMapIntensity={1.6}
        />
      </mesh>
      {/* Secondary ripple layer, nudged just above the water */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <primitive object={rippleGeo} attach="geometry" />
        <meshStandardMaterial
          color="#78a8c0"
          transparent
          opacity={0.18}
          roughness={0.25}
          metalness={0.1}
          normalMap={normalB}
          normalScale={new THREE.Vector2(0.5, 0.5)}
          depthWrite={false}
        />
      </mesh>
      {/* Wet bank strip, seated just below the water surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <primitive object={bankGeo} attach="geometry" />
        <meshStandardMaterial color="#2a1d12" roughness={1} transparent opacity={0.55} depthWrite={false} />
      </mesh>
    </group>
  );
}
