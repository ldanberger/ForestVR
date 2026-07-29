import { useMemo } from "react";
import * as THREE from "three";
import { heightAt } from "./useHeightAt";

// Hash & value noise ---------------------------------------------------------
function hash(x: number, z: number) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise2(x: number, z: number) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi);
  const b = hash(xi + 1, zi);
  const c = hash(xi, zi + 1);
  const d = hash(xi + 1, zi + 1);
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(a, b, u),
    THREE.MathUtils.lerp(c, d, u),
    v
  );
}
// Fractal Brownian motion for richer variation
function fbm(x: number, z: number, oct = 4) {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += noise2(x * freq, z * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

// Procedural tiling normal map for micro surface detail --------------------
function makeDetailNormalMap(size = 512) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const s = 1 / 24;
      const h = fbm(x * s, y * s, 4);
      const hx = fbm((x + 1) * s, y * s, 4);
      const hy = fbm(x * s, (y + 1) * s, 4);
      const dx = (hx - h) * 6;
      const dy = (hy - h) * 6;
      const nx = -dx;
      const ny = -dy;
      const nz = 1;
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
  tex.repeat.set(40, 40);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Procedural tiling roughness map ------------------------------------------
function makeRoughnessMap(size = 256) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = fbm(x * 0.05, y * 0.05, 3);
      const v = Math.floor(180 + r * 60);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(40, 40);
  tex.needsUpdate = true;
  return tex;
}

export function Terrain() {
  const { geometry, normalMap, roughnessMap } = useMemo(() => {
    const size = 260;
    const segs = 400;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;

    // First pass: displace heights
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, heightAt(x, z));
    }
    geo.computeVertexNormals();
    const norm = geo.attributes.normal as THREE.BufferAttribute;

    // Second pass: slope-aware vertex colors
    const colors = new Float32Array(pos.count * 3);
    const grassA = new THREE.Color("#3d6a2b");
    const grassB = new THREE.Color("#5a8138");
    const grassDry = new THREE.Color("#8a9046");
    const moss = new THREE.Color("#2f4a1e");
    const dirt = new THREE.Color("#5a4327");
    const dirtWet = new THREE.Color("#3a2a18");
    const rock = new THREE.Color("#7a736a");
    const rockDark = new THREE.Color("#3f3d38");
    const snow = new THREE.Color("#f2f5f8");
    const snowDirty = new THREE.Color("#c9cfd4");
    const sand = new THREE.Color("#cbb98a");
    const tmp = new THREE.Color();
    const rockMix = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const ny = norm.getY(i); // 1 = flat, 0 = vertical
      const slope = 1 - ny; // 0..1

      const nMicro = noise2(x * 0.18, z * 0.18);
      const nMacro = fbm(x * 0.02, z * 0.02, 3);
      const nDry = fbm(x * 0.008 + 3, z * 0.008 - 7, 3);
      const nearStream = Math.abs(x) < 3.5;

      // Base biome from height
      if (y > 22) {
        tmp.copy(snow).lerp(snowDirty, slope * 0.6 + nMicro * 0.1);
      } else if (y > 16) {
        const t = THREE.MathUtils.clamp((y - 16) / 6, 0, 1);
        tmp.copy(rock).lerp(snow, t * (1 - slope * 0.6));
      } else if (y > 8) {
        tmp.copy(rock).lerp(rockDark, nMacro * 0.7);
      } else if (y < 0.4 && nearStream) {
        tmp.copy(sand).lerp(dirt, nMicro * 0.5);
      } else {
        // Grass zone: blend fresh/dry grass + moss patches
        tmp.copy(grassA).lerp(grassB, nMacro);
        tmp.lerp(grassDry, THREE.MathUtils.clamp(nDry * 1.4 - 0.2, 0, 0.7));
        tmp.lerp(moss, Math.max(0, nMicro - 0.72) * 2);
        // Wet dark patches near stream
        if (nearStream) tmp.lerp(dirtWet, 0.4);
      }

      // Slope overrides toward rock (cliffs) for lower/mid altitudes
      if (slope > 0.35 && y <= 22) {
        rockMix.copy(rock).lerp(rockDark, nMacro * 0.6 + 0.2);
        const t = THREE.MathUtils.smoothstep(slope, 0.35, 0.75);
        tmp.lerp(rockMix, t);
      }

      // Micro tonal variation
      tmp.offsetHSL(0, (nMicro - 0.5) * 0.03, (nMicro - 0.5) * 0.05);

      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    return {
      geometry: geo,
      normalMap: makeDetailNormalMap(512),
      roughnessMap: makeRoughnessMap(256),
    };
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        vertexColors
        roughness={1}
        metalness={0}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(0.9, 0.9)}
        roughnessMap={roughnessMap}
        envMapIntensity={0.6}
      />
    </mesh>
  );
}
