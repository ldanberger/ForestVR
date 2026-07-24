import { useMemo, useRef, useLayoutEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
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
    pts.push(new THREE.Vector3(x, y, z));
  }
  return pts;
}

/* --------- Procedural bark texture --------- */
function makeBarkTextures(size = 256) {
  const color = new Uint8Array(size * size * 4);
  const normal = new Uint8Array(size * size * 4);
  const heightGrid = new Float32Array(size * size);

  const hash = (x: number, y: number) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Vertical grooves + noise
      const groove = Math.sin(x * 0.35 + hash(Math.floor(x / 8), Math.floor(y / 20)) * 6) * 0.5 + 0.5;
      const n = hash(x, y);
      const n2 = hash(Math.floor(x / 3), Math.floor(y / 3));
      const h = groove * 0.6 + n * 0.15 + n2 * 0.25;
      heightGrid[y * size + x] = h;
      const base = 60 + h * 90;
      const i = (y * size + x) * 4;
      color[i] = base * 0.9 + n * 20;      // R
      color[i + 1] = base * 0.65 + n * 15; // G
      color[i + 2] = base * 0.45;          // B
      color[i + 3] = 255;
    }
  }
  // Normal from height
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const h = heightGrid[y * size + x];
      const hx = heightGrid[y * size + ((x + 1) % size)];
      const hy = heightGrid[((y + 1) % size) * size + x];
      const dx = (hx - h) * 8;
      const dy = (hy - h) * 8;
      const nx = -dx, ny = -dy, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const i = (y * size + x) * 4;
      normal[i] = ((nx / len) * 0.5 + 0.5) * 255;
      normal[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      normal[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      normal[i + 3] = 255;
    }
  }
  const cTex = new THREE.DataTexture(color, size, size, THREE.RGBAFormat);
  cTex.wrapS = cTex.wrapT = THREE.RepeatWrapping;
  cTex.repeat.set(1, 3);
  cTex.needsUpdate = true;
  const nTex = new THREE.DataTexture(normal, size, size, THREE.RGBAFormat);
  nTex.wrapS = nTex.wrapT = THREE.RepeatWrapping;
  nTex.repeat.set(1, 3);
  nTex.needsUpdate = true;
  return { colorMap: cTex, normalMap: nTex };
}

/* --------- Procedural rock texture --------- */
function makeRockTextures(size = 256) {
  const color = new Uint8Array(size * size * 4);
  const normal = new Uint8Array(size * size * 4);
  const heightGrid = new Float32Array(size * size);
  const hash = (x: number, y: number) => {
    const s = Math.sin(x * 91.3 + y * 47.9) * 21343.13;
    return s - Math.floor(s);
  };
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi);
    const c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, u), THREE.MathUtils.lerp(c, d, u), v);
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let h = 0, a = 0.5, f = 0.05;
      for (let o = 0; o < 5; o++) { h += noise(x * f, y * f) * a; a *= 0.5; f *= 2.1; }
      heightGrid[y * size + x] = h;
      const crack = Math.pow(1 - Math.abs(noise(x * 0.03, y * 0.03) - 0.5) * 2, 8);
      const v = 90 + h * 120 - crack * 60;
      const moss = Math.max(0, noise(x * 0.02 + 5, y * 0.02) - 0.6) * 2;
      const i = (y * size + x) * 4;
      color[i] = v * 0.9 * (1 - moss * 0.6);
      color[i + 1] = v * 0.9 * (1 - moss * 0.2) + moss * 40;
      color[i + 2] = v * 0.85 * (1 - moss * 0.7);
      color[i + 3] = 255;
    }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const h = heightGrid[y * size + x];
      const hx = heightGrid[y * size + ((x + 1) % size)];
      const hy = heightGrid[((y + 1) % size) * size + x];
      const dx = (hx - h) * 10, dy = (hy - h) * 10;
      const nx = -dx, ny = -dy, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const i = (y * size + x) * 4;
      normal[i] = ((nx / len) * 0.5 + 0.5) * 255;
      normal[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      normal[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      normal[i + 3] = 255;
    }
  }
  const cTex = new THREE.DataTexture(color, size, size, THREE.RGBAFormat);
  cTex.wrapS = cTex.wrapT = THREE.RepeatWrapping;
  cTex.needsUpdate = true;
  const nTex = new THREE.DataTexture(normal, size, size, THREE.RGBAFormat);
  nTex.wrapS = nTex.wrapT = THREE.RepeatWrapping;
  nTex.needsUpdate = true;
  return { colorMap: cTex, normalMap: nTex };
}

/* --------- TREES (instanced, layered foliage) --------- */

export function Trees() {
  const positions = useMemo(() => scatterPoints(280, 42, { minY: 0.3, maxY: 12 }), []);
  const { colorMap: barkColor, normalMap: barkNormal } = useMemo(() => makeBarkTextures(256), []);

  const trunkGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.22, 0.42, 2.8, 14, 6);
    // Add subtle noise to trunk vertices for organic shape
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
      const r = Math.hypot(x, z);
      if (r > 0.001) {
        const bump = 1 + (Math.sin(y * 3 + Math.atan2(z, x) * 4) * 0.04);
        pos.setX(i, x * bump);
        pos.setZ(i, z * bump);
      }
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const trunkMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      map: barkColor,
      normalMap: barkNormal,
      normalScale: new THREE.Vector2(1.2, 1.2),
      color: "#6a4a30",
      roughness: 0.95,
    }),
    [barkColor, barkNormal],
  );

  const foliageGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 2), []);
  const foliageMats = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ color: "#2b5620", roughness: 0.9, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: "#3f7a2e", roughness: 0.9, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: "#568c3a", roughness: 0.9, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: "#6ea345", roughness: 0.9, flatShading: true }),
    ],
    [],
  );

  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const f0 = useRef<THREE.InstancedMesh>(null);
  const f1 = useRef<THREE.InstancedMesh>(null);
  const f2 = useRef<THREE.InstancedMesh>(null);
  const f3 = useRef<THREE.InstancedMesh>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seededMemo = useMemo(() => {
    return positions.map((p, i) => {
      const scale = 0.9 + ((i * 37) % 100) / 120;
      const rotY = (i * 1.7) % (Math.PI * 2);
      const lean = ((i * 13) % 100) / 100 * 0.08 - 0.04;
      return { p, scale, rotY, lean };
    });
  }, [positions]);

  useLayoutEffect(() => {
    const setInstances = (
      mesh: THREE.InstancedMesh | null,
      cb: (i: number, d: THREE.Object3D, s: number) => void,
    ) => {
      if (!mesh) return;
      seededMemo.forEach(({ p, scale, rotY, lean }, i) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(lean, rotY, lean * 0.5);
        dummy.scale.setScalar(scale);
        cb(i, dummy, scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    setInstances(trunkRef.current, (_i, d) => {
      d.position.y += 1.4 * d.scale.y;
    });
    setInstances(f0.current, (_i, d) => {
      d.position.y += 2.8 * d.scale.y;
      d.scale.multiplyScalar(1.45);
    });
    setInstances(f1.current, (i, d) => {
      d.position.x += Math.cos(i * 1.3) * 0.4 * d.scale.x;
      d.position.z += Math.sin(i * 1.3) * 0.4 * d.scale.z;
      d.position.y += 3.5 * d.scale.y;
      d.scale.multiplyScalar(1.15);
    });
    setInstances(f2.current, (i, d) => {
      d.position.x += Math.cos(i * 2.1 + 1) * 0.35 * d.scale.x;
      d.position.z += Math.sin(i * 2.1 + 1) * 0.35 * d.scale.z;
      d.position.y += 4.15 * d.scale.y;
      d.scale.multiplyScalar(0.9);
    });
    setInstances(f3.current, (_i, d) => {
      d.position.y += 4.7 * d.scale.y;
      d.scale.multiplyScalar(0.6);
    });
  }, []);

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[trunkGeo, trunkMat, seededMemo.length]} castShadow receiveShadow />
      <instancedMesh ref={f0} args={[foliageGeo, foliageMats[0], seededMemo.length]} castShadow />
      <instancedMesh ref={f1} args={[foliageGeo, foliageMats[1], seededMemo.length]} castShadow />
      <instancedMesh ref={f2} args={[foliageGeo, foliageMats[2], seededMemo.length]} castShadow />
      <instancedMesh ref={f3} args={[foliageGeo, foliageMats[3], seededMemo.length]} castShadow />
    </group>
  );
}

/* --------- ROCKS --------- */

export function Rocks() {
  const positions = useMemo(() => scatterPoints(120, 7, { minY: -1, maxY: 20 }), []);
  const { colorMap, normalMap } = useMemo(() => makeRockTextures(256), []);

  // Pre-generate a few varied rock geometries for diversity
  const geos = useMemo(() => {
    const list: THREE.BufferGeometry[] = [];
    for (let n = 0; n < 5; n++) {
      const g = new THREE.IcosahedronGeometry(0.8, 2);
      const pos = g.attributes.position as THREE.BufferAttribute;
      const rand = rng(1000 + n * 17);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const jitter = 0.7 + rand() * 0.6;
        const flatten = 0.6 + rand() * 0.5;
        pos.setXYZ(i, x * jitter, y * flatten * (0.7 + rand() * 0.4), z * jitter);
      }
      g.computeVertexNormals();
      list.push(g);
    }
    return list;
  }, []);

  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({
      map: colorMap,
      normalMap,
      normalScale: new THREE.Vector2(1.4, 1.4),
      color: "#8a8478",
      roughness: 0.9,
      metalness: 0.05,
    }),
    [colorMap, normalMap],
  );

  return (
    <group>
      {positions.map((p, i) => {
        const s = 0.5 + ((i * 13) % 100) / 60;
        const geo = geos[i % geos.length];
        return (
          <mesh
            key={i}
            geometry={geo}
            material={mat}
            position={[p.x, p.y - 0.05 * s, p.z]}
            rotation={[i * 0.3, i * 0.7, i * 0.5]}
            scale={[s, s * (0.6 + ((i * 19) % 100) / 200), s]}
            castShadow
            receiveShadow
          />
        );
      })}
    </group>
  );
}

/* --------- GRASS BLADES (instanced, per-vertex wind sway) --------- */

export function GrassBlades() {
  const count = 6000;
  const positions = useMemo(
    () => scatterPoints(count, 99, { minY: 0.3, maxY: 6, radius: 65 }),
    [],
  );

  // Tapered blade with more segments so wind sway looks smooth
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.09, 0.7, 1, 5);
    g.translate(0, 0.35, 0);
    // Taper toward the tip
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = y / 0.7;
      pos.setX(i, pos.getX(i) * (1 - t * 0.85));
    }
    return g;
  }, []);

  // Custom shader material for per-vertex wind sway
  const mat = useMemo(() => {
    const uniforms = { uTime: { value: 0 } };
    const m = new THREE.MeshStandardMaterial({
      color: "#4e8a34",
      roughness: 1,
      side: THREE.DoubleSide,
      transparent: false,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
           uniform float uTime;`,
        )
        .replace(
          "#include <begin_vertex>",
          `vec3 transformed = vec3( position );
           #ifdef USE_INSTANCING
             vec4 iPos = instanceMatrix * vec4(0.0,0.0,0.0,1.0);
           #else
             vec4 iPos = vec4(0.0);
           #endif
           float sway = sin(uTime * 1.6 + iPos.x * 0.4 + iPos.z * 0.3) * 0.15
                      + sin(uTime * 2.7 + iPos.z * 0.7) * 0.06;
           float bend = pow(max(position.y, 0.0) / 0.7, 2.0);
           transformed.x += sway * bend;
           transformed.z += sway * 0.5 * bend;`,
        );
      // Add slight tip color variation via vertex color
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
         diffuseColor.rgb *= mix(vec3(0.65, 0.8, 0.55), vec3(1.15, 1.1, 0.7), clamp(vViewPosition.y * 0.0, 0.0, 1.0));`,
      );
      (m.userData as { shader?: THREE.WebGLProgramParametersWithUniforms }).shader = shader;
    };
    return m;
  }, []);

  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorArray = useMemo(() => new Float32Array(count * 3), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    if (!ref.current) return;
    positions.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, (i * 1.13) % (Math.PI * 2), 0);
      const scale = 0.7 + ((i * 7) % 100) / 130;
      dummy.scale.set(scale, scale * (0.8 + ((i * 11) % 100) / 200), scale);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
      // Per-blade color variation
      const hueShift = ((i * 37) % 100) / 100;
      tmpColor.setHSL(0.24 + hueShift * 0.06 - 0.03, 0.55, 0.32 + hueShift * 0.12);
      colorArray[i * 3] = tmpColor.r;
      colorArray[i * 3 + 1] = tmpColor.g;
      colorArray[i * 3 + 2] = tmpColor.b;
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.instanceColor = new THREE.InstancedBufferAttribute(colorArray, 3);
    ref.current.instanceColor.needsUpdate = true;
  }, []);

  useFrame((state) => {
    const shader = (mat.userData as { shader?: { uniforms: { uTime: { value: number } } } }).shader;
    if (shader) shader.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[geo, mat, positions.length]}
      castShadow={false}
      receiveShadow={false}
    />
  );
}
