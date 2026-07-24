import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { heightAt, STREAM_HALF_WIDTH } from "./useHeightAt";

type Critter = {
  pos: THREE.Vector3;
  heading: number;
  speed: number;
  phase: number;
};

function makeCritters(count: number, seed: number, speed: number): Critter[] {
  const arr: Critter[] = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    const x = ((s / 0xffffffff) - 0.5) * 60;
    s = (s * 1103515245 + 12345) >>> 0;
    const z = ((s / 0xffffffff) - 0.5) * 60;
    if (Math.abs(x) < STREAM_HALF_WIDTH + 1) continue;
    arr.push({
      pos: new THREE.Vector3(x, heightAt(x, z), z),
      heading: Math.random() * Math.PI * 2,
      speed,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return arr;
}

function useWander(critters: Critter[], groupRef: React.RefObject<THREE.Group | null>, bounce: number) {
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (!groupRef.current) return;
    critters.forEach((c, i) => {
      // Occasional heading change
      if (Math.sin(t * 0.3 + i) > 0.995) c.heading += (Math.random() - 0.5) * 1.2;
      c.pos.x += Math.cos(c.heading) * c.speed * dt;
      c.pos.z += Math.sin(c.heading) * c.speed * dt;
      // Stay out of stream and inside area
      if (Math.abs(c.pos.x) < STREAM_HALF_WIDTH + 0.5 || Math.abs(c.pos.x) > 55 || Math.abs(c.pos.z) > 55) {
        c.heading += Math.PI;
        c.pos.x += Math.cos(c.heading) * c.speed * dt * 2;
        c.pos.z += Math.sin(c.heading) * c.speed * dt * 2;
      }
      c.pos.y = heightAt(c.pos.x, c.pos.z);
      const child = groupRef.current!.children[i] as THREE.Object3D | undefined;
      if (child) {
        const hop = Math.abs(Math.sin(t * 6 + c.phase)) * bounce;
        child.position.set(c.pos.x, c.pos.y + hop, c.pos.z);
        child.rotation.y = -c.heading + Math.PI / 2;
      }
    });
  });
}

export function Rabbits() {
  const critters = useMemo(() => makeCritters(8, 4242, 1.2), []);
  const groupRef = useRef<THREE.Group>(null);
  useWander(critters, groupRef, 0.15);
  return (
    <group ref={groupRef}>
      {critters.map((_, i) => (
        <group key={i}>
          <mesh position={[0, 0.15, 0]} castShadow>
            <sphereGeometry args={[0.18, 8, 6]} />
            <meshStandardMaterial color="#d9cbb0" roughness={1} />
          </mesh>
          <mesh position={[0.15, 0.22, 0]} castShadow>
            <sphereGeometry args={[0.11, 8, 6]} />
            <meshStandardMaterial color="#d9cbb0" roughness={1} />
          </mesh>
          {/* ears */}
          <mesh position={[0.18, 0.36, 0.05]} rotation={[0, 0, -0.2]} castShadow>
            <coneGeometry args={[0.03, 0.15, 5]} />
            <meshStandardMaterial color="#d9cbb0" />
          </mesh>
          <mesh position={[0.18, 0.36, -0.05]} rotation={[0, 0, -0.2]} castShadow>
            <coneGeometry args={[0.03, 0.15, 5]} />
            <meshStandardMaterial color="#d9cbb0" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Foxes() {
  const critters = useMemo(() => makeCritters(4, 7373, 1.8), []);
  const groupRef = useRef<THREE.Group>(null);
  useWander(critters, groupRef, 0.08);
  return (
    <group ref={groupRef}>
      {critters.map((_, i) => (
        <group key={i}>
          {/* body */}
          <mesh position={[0, 0.28, 0]} castShadow>
            <boxGeometry args={[0.55, 0.22, 0.22]} />
            <meshStandardMaterial color="#c85a1e" roughness={1} />
          </mesh>
          {/* head */}
          <mesh position={[0.3, 0.36, 0]} castShadow>
            <boxGeometry args={[0.22, 0.18, 0.2]} />
            <meshStandardMaterial color="#c85a1e" />
          </mesh>
          {/* snout */}
          <mesh position={[0.44, 0.32, 0]} castShadow>
            <coneGeometry args={[0.06, 0.14, 5]} rotation={[0, 0, -Math.PI / 2]} />
            <meshStandardMaterial color="#3a2a1e" />
          </mesh>
          {/* tail */}
          <mesh position={[-0.32, 0.3, 0]} rotation={[0, 0, 0.4]} castShadow>
            <coneGeometry args={[0.08, 0.35, 6]} />
            <meshStandardMaterial color="#e8e2d0" />
          </mesh>
          {/* legs */}
          {[
            [0.18, 0, 0.09],
            [0.18, 0, -0.09],
            [-0.18, 0, 0.09],
            [-0.18, 0, -0.09],
          ].map((p, k) => (
            <mesh key={k} position={p as [number, number, number]} castShadow>
              <boxGeometry args={[0.06, 0.2, 0.06]} />
              <meshStandardMaterial color="#3a2a1e" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
