import { useMemo } from "react";
import * as THREE from "three";
import { heightAt } from "./useHeightAt";

export function Terrain() {
  const geometry = useMemo(() => {
    const size = 240;
    const segs = 180;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const grass = new THREE.Color("#4a7c3a");
    const dirt = new THREE.Color("#6b5a3a");
    const rock = new THREE.Color("#8a8577");
    const snow = new THREE.Color("#f0f0f0");
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = heightAt(x, z);
      pos.setY(i, y);
      const c = new THREE.Color();
      if (y > 18) c.copy(snow);
      else if (y > 8) c.copy(rock);
      else if (y < 0.2 && Math.abs(x) < 3) c.copy(dirt);
      else c.copy(grass).offsetHSL(0, 0, (Math.random() - 0.5) * 0.05);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors flatShading roughness={1} />
    </mesh>
  );
}
