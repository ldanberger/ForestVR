import { useEffect, useRef, useState, type ReactElement } from "react";
import { useFrame } from "@react-three/fiber";
import { useXRInputSourceState } from "@react-three/xr";
import * as THREE from "three";
import { heightAt } from "./useHeightAt";

type ItemKind = "axe" | "sword" | "bow";
type ItemState = {
  kind: ItemKind;
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  heldBy: "left" | "right" | null;
};

function AxeMesh() {
  return (
    <group>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
        <meshStandardMaterial color="#6b4a2a" />
      </mesh>
      <mesh position={[0, 0.45, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.05, 0.18, 0.14]} />
        <meshStandardMaterial color="#c0c4c8" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

function SwordMesh() {
  return (
    <group>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.04, 0.18, 0.04]} />
        <meshStandardMaterial color="#3a2a1e" />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.16, 0.03, 0.05]} />
        <meshStandardMaterial color="#c8a24a" metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.06, 0.6, 0.015]} />
        <meshStandardMaterial color="#dcdfe3" metalness={0.85} roughness={0.2} />
      </mesh>
    </group>
  );
}

function BowMesh() {
  return (
    <group>
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[0.35, 0.02, 6, 16, Math.PI]} />
        <meshStandardMaterial color="#7a4a22" />
      </mesh>
      <mesh position={[0.35, 0, 0]}>
        <cylinderGeometry args={[0.002, 0.002, 0.7, 4]} />
        <meshStandardMaterial color="#eaeaea" />
      </mesh>
    </group>
  );
}

const MESHES: Record<ItemKind, () => ReactElement> = {
  axe: AxeMesh,
  sword: SwordMesh,
  bow: BowMesh,
};

export function Items() {
  const [items, setItems] = useState<ItemState[]>(() => {
    const base: { kind: ItemKind; pos: [number, number, number] }[] = [
      { kind: "axe", pos: [7.5, 0, 6] },
      { kind: "sword", pos: [8.2, 0, 6.4] },
      { kind: "bow", pos: [7.8, 0, 5.4] },
    ];
    return base.map((b) => ({
      kind: b.kind,
      pos: new THREE.Vector3(b.pos[0], heightAt(b.pos[0], b.pos[2]) + 0.3, b.pos[2]),
      quat: new THREE.Quaternion(),
      heldBy: null,
    }));
  });

  const left = useXRInputSourceState("controller", "left");
  const right = useXRInputSourceState("controller", "right");
  

  const refs = useRef<(THREE.Group | null)[]>([]);
  const prevSelect = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });

  useFrame(() => {
    const controllers = { left, right } as const;
    (["left", "right"] as const).forEach((hand) => {
      const state = controllers[hand];
      const trigger = state?.gamepad?.["xr-standard-trigger"]?.button ?? 0;
      const pressed = trigger > 0.6;
      const wasPressed = prevSelect.current[hand];

      // Controller world position
      const ctrl = state?.object as THREE.Object3D | undefined;
      const cpos = new THREE.Vector3();
      const cquat = new THREE.Quaternion();
      if (ctrl) {
        ctrl.getWorldPosition(cpos);
        ctrl.getWorldQuaternion(cquat);
      }

      if (pressed && !wasPressed && ctrl) {
        // Try to grab nearest free item within range
        let bestIdx = -1;
        let bestDist = 0.35;
        items.forEach((it, i) => {
          if (it.heldBy) return;
          const d = it.pos.distanceTo(cpos);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        });
        if (bestIdx >= 0) {
          setItems((prev) => prev.map((it, i) => (i === bestIdx ? { ...it, heldBy: hand } : it)));
        }
      } else if (!pressed && wasPressed) {
        // Drop items held by this hand
        setItems((prev) =>
          prev.map((it) => {
            if (it.heldBy !== hand) return it;
            const g = refs.current[prev.indexOf(it)];
            const np = new THREE.Vector3();
            const nq = new THREE.Quaternion();
            if (g) {
              g.getWorldPosition(np);
              g.getWorldQuaternion(nq);
              np.y = heightAt(np.x, np.z) + 0.2;
            }
            return { ...it, heldBy: null, pos: np, quat: nq };
          }),
        );
      }

      // Move held items with the controller
      items.forEach((it, i) => {
        if (it.heldBy !== hand) return;
        const g = refs.current[i];
        if (g && ctrl) {
          g.position.copy(cpos);
          g.quaternion.copy(cquat);
        }
      });

      prevSelect.current[hand] = pressed;
    });
  });

  // Ensure scene has items at correct starting transforms
  useEffect(() => {
    items.forEach((it, i) => {
      const g = refs.current[i];
      if (g && !it.heldBy) {
        g.position.copy(it.pos);
        g.quaternion.copy(it.quat);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => i.heldBy).join(",")]);

  return (
    <group>
      {items.map((it, i) => {
        const Mesh = MESHES[it.kind];
        return (
          <group
            key={it.kind}
            ref={(g) => {
              refs.current[i] = g;
            }}
          >
            <Mesh />
          </group>
        );
      })}
      {/* Instruction sign */}
      <group position={[7.8, heightAt(7.8, 6.8) + 1.4, 6.8]}>
        <mesh>
          <planeGeometry args={[1.6, 0.5]} />
          <meshBasicMaterial color="#f8f0d8" side={2} />
        </mesh>
      </group>
      {scene ? null : null}
    </group>
  );
}
