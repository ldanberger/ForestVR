import { useMemo } from "react";
import * as THREE from "three";
import { heightAt } from "./useHeightAt";

// Smooth 2D value noise for micro color variation
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
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, u), THREE.MathUtils.lerp(c, d, u), v);
}

export function Terrain() {
  const geometry = useMemo(() => {
    const size = 260;
    const segs = 320;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const grassA = new THREE.Color("#3f6a2c");
    const grassB = new THREE.Color("#597f36");
    const dirt = new THREE.Color("#6a5236");
    const rock = new THREE.Color("#7d786a");
    const rockDark = new THREE.Color("#4d4a42");
    const snow = new THREE.Color("#f4f6f8");
    const sand = new THREE.Color("#c9b487");
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = heightAt(x, z);
      pos.setY(i, y);

      const n = noise2(x * 0.15, z * 0.15);
      const nMacro = noise2(x * 0.03, z * 0.03);

      if (y > 20) {
        tmp.copy(snow).offsetHSL(0, 0, (n - 0.5) * 0.04);
      } else if (y > 14) {
        tmp.copy(rock).lerp(snow, THREE.MathUtils.clamp((y - 14) / 6, 0, 1)).offsetHSL(0, 0, (n - 0.5) * 0.08);
      } else if (y > 7) {
        tmp.copy(rock).lerp(rockDark, n * 0.5);
      } else if (y < 0.35 && Math.abs(x) < 3.2) {
        tmp.copy(sand).lerp(dirt, n * 0.5);
      } else {
        tmp.copy(grassA).lerp(grassB, nMacro).offsetHSL(0, (n - 0.5) * 0.04, (n - 0.5) * 0.06);
      }

      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
    </mesh>
  );
}
