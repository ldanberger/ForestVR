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

/* --------- TREES (instanced, layered foliage) --------- */

export function Trees() {
  const positions = useMemo(() => scatterPoints(260, 42, { minY: 0.3, maxY: 12 }), []);
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.18, 0.32, 2.4, 10), []);
  const trunkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#4a2f1c", roughness: 0.95 }),
    [],
  );

  // Three layered foliage cones/spheres per tree for a fuller silhouette
  const foliageGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const foliageMats = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ color: "#2d5424", roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: "#356b2a", roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: "#4a8038", roughness: 0.9 }),
    ],
    [],
  );

  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const foliageRefs = [
    useRef<THREE.InstancedMesh>(null),
    useRef<THREE.InstancedMesh>(null),
    useRef<THREE.InstancedMesh>(null),
  ];

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seededMemo = useMemo(() => {
    // pre-compute per-instance transforms
    return positions.map((p, i) => {
      const scale = 0.85 + ((i * 37) % 100) / 140;
      const rotY = (i * 1.7) % (Math.PI * 2);
      return { p, scale, rotY };
    });
  }, [positions]);

  useLayoutEffect(() => {
    // fill instance matrices once
    const setInstances = (mesh: THREE.InstancedMesh | null, cb: (i: number, d: THREE.Object3D, s: number) => void) => {
      if (!mesh) return;
      seededMemo.forEach(({ p, scale, rotY }, i) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, rotY, 0);
        dummy.scale.setScalar(scale);
        cb(i, dummy, scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    setInstances(trunkRef.current, (_i, d) => {
      d.position.y += 1.2 * d.scale.y;
    });
    setInstances(foliageRefs[0].current, (_i, d) => {
      d.position.y += 2.6 * d.scale.y;
      d.scale.multiplyScalar(1.3);
    });
    setInstances(foliageRefs[1].current, (_i, d) => {
      d.position.y += 3.4 * d.scale.y;
      d.scale.multiplyScalar(1.05);
    });
    setInstances(foliageRefs[2].current, (_i, d) => {
      d.position.y += 4.1 * d.scale.y;
      d.scale.multiplyScalar(0.75);
    });
  }, []);

  return (
    <group>
      <instancedMesh
        ref={trunkRef}
        args={[trunkGeo, trunkMat, seededMemo.length]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={foliageRefs[0]}
        args={[foliageGeo, foliageMats[0], seededMemo.length]}
        castShadow
      />
      <instancedMesh
        ref={foliageRefs[1]}
        args={[foliageGeo, foliageMats[1], seededMemo.length]}
        castShadow
      />
      <instancedMesh
        ref={foliageRefs[2]}
        args={[foliageGeo, foliageMats[2], seededMemo.length]}
        castShadow
      />
    </group>
  );
}

/* --------- ROCKS --------- */

export function Rocks() {
  const positions = useMemo(() => scatterPoints(90, 7, { minY: -1, maxY: 20 }), []);
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(0.7, 1);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(
        i,
        pos.getX(i) * (0.85 + Math.random() * 0.3),
        pos.getY(i) * (0.75 + Math.random() * 0.4),
        pos.getZ(i) * (0.85 + Math.random() * 0.3),
      );
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#7d786a", roughness: 0.85, metalness: 0.05 }),
    [],
  );
  return (
    <group>
      {positions.map((p, i) => {
        const s = 0.6 + ((i * 13) % 100) / 80;
        return (
          <mesh
            key={i}
            geometry={geo}
            material={mat}
            position={[p.x, p.y + 0.1, p.z]}
            rotation={[i * 0.3, i * 0.7, i * 0.5]}
            scale={s}
            castShadow
            receiveShadow
          />
        );
      })}
    </group>
  );
}

/* --------- GRASS BLADES (instanced, wind-swayed) --------- */

export function GrassBlades() {
  const count = 4000;
  const positions = useMemo(
    () => scatterPoints(count, 99, { minY: 0.3, maxY: 6, radius: 60 }),
    [],
  );
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.08, 0.5, 1, 2);
    g.translate(0, 0.25, 0);
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#4e8a34",
        roughness: 1,
        side: THREE.DoubleSide,
        transparent: true,
        alphaTest: 0.5,
      }),
    [],
  );
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    if (!ref.current) return;
    positions.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, (i * 1.13) % (Math.PI * 2), 0);
      dummy.scale.setScalar(0.7 + ((i * 7) % 100) / 200);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    // subtle global sway via material color pulse is negligible; skip per-instance updates for perf
    ref.current.rotation.y = Math.sin(t * 0.3) * 0.02;
  });

  return (
    <instancedMesh ref={ref} args={[geo, mat, positions.length]} castShadow={false} receiveShadow={false} />
  );
}
