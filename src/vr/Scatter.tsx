import { useMemo } from "react";
import * as THREE from "three";
import { heightAt, STREAM_HALF_WIDTH } from "./useHeightAt";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function scatterPoints(count: number, seed: number, opts: { minY?: number; maxY?: number; radius?: number }) {
  const r = rng(seed);
  const pts: THREE.Vector3[] = [];
  const radius = opts.radius ?? 90;
  let tries = 0;
  while (pts.length < count && tries < count * 20) {
    tries++;
    const x = (r() - 0.5) * 2 * radius;
    const z = (r() - 0.5) * 2 * radius;
    if (Math.abs(x) < STREAM_HALF_WIDTH + 1.5) continue;
    const y = heightAt(x, z);
    if (opts.minY !== undefined && y < opts.minY) continue;
    if (opts.maxY !== undefined && y > opts.maxY) continue;
    pts.push(new THREE.Vector3(x, y, z));
  }
  return pts;
}

export function Trees() {
  const positions = useMemo(() => scatterPoints(220, 42, { minY: 0.3, maxY: 12 }), []);
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.15, 0.22, 1.6, 6), []);
  const leafGeo = useMemo(() => new THREE.ConeGeometry(1.1, 3.2, 7), []);
  const trunkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5a3a22", roughness: 1 }), []);
  const leafMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2f5a2a", roughness: 1, flatShading: true }), []);

  return (
    <group>
      {positions.map((p, i) => {
        const scale = 0.8 + ((i * 37) % 100) / 200;
        return (
          <group key={i} position={[p.x, p.y, p.z]} scale={scale} rotation={[0, (i * 1.7) % (Math.PI * 2), 0]}>
            <mesh geometry={trunkGeo} material={trunkMat} position={[0, 0.8, 0]} castShadow />
            <mesh geometry={leafGeo} material={leafMat} position={[0, 2.8, 0]} castShadow />
          </group>
        );
      })}
    </group>
  );
}

export function Rocks() {
  const positions = useMemo(() => scatterPoints(80, 7, { minY: -1, maxY: 20 }), []);
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(0.6, 0);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(
        i,
        pos.getX(i) * (0.8 + Math.random() * 0.4),
        pos.getY(i) * (0.7 + Math.random() * 0.5),
        pos.getZ(i) * (0.8 + Math.random() * 0.4),
      );
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#8a8577", flatShading: true, roughness: 1 }), []);
  return (
    <group>
      {positions.map((p, i) => {
        const s = 0.6 + ((i * 13) % 100) / 80;
        return <mesh key={i} geometry={geo} material={mat} position={[p.x, p.y + 0.1, p.z]} scale={s} castShadow />;
      })}
    </group>
  );
}
