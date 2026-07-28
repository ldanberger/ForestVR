import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useXR } from "@react-three/xr";
import * as THREE from "three";
import { survivalState } from "./survivalState";
import { tagState } from "./tagState";

/**
 * In-VR heads-up display: floating panel attached to the camera so the player
 * always sees food/water/backpack and tag status while in an XR session.
 */
export function VRHud() {
  const groupRef = useRef<THREE.Group>(null);
  const foodRef = useRef<any>(null);
  const waterRef = useRef<any>(null);
  const packRef = useRef<any>(null);
  const tagRef = useRef<any>(null);
  const camera = useThree((s) => s.camera);
  const session = useXR((s) => s.session);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    if (!session) {
      g.visible = false;
      return;
    }
    g.visible = true;
    // Place the panel in the lower-left of the player's view.
    const offset = new THREE.Vector3(-0.28, -0.22, -0.7);
    offset.applyQuaternion(camera.quaternion);
    g.position.copy(camera.position).add(offset);
    g.quaternion.copy(camera.quaternion);

    if (foodRef.current)
      foodRef.current.text = `Food  ${Math.round(survivalState.food)}`;
    if (waterRef.current)
      waterRef.current.text = `Water ${Math.round(survivalState.water)}`;
    if (packRef.current)
      packRef.current.text = `Carrots ${survivalState.backpack}`;
    if (tagRef.current)
      tagRef.current.text = tagState.playerIsIt
        ? "YOU ARE IT"
        : `RUN! ${tagState.itIds.size} chasing`;
    if (tagRef.current?.material)
      tagRef.current.material.color.set(tagState.playerIsIt ? "#8bff8b" : "#ff8080");
  });

  const textProps = {
    anchorX: "left" as const,
    anchorY: "middle" as const,
    fontSize: 0.035,
    outlineWidth: 0.004,
    outlineColor: "#000",
    renderOrder: 999,
  };

  return (
    <group ref={groupRef} visible={false} renderOrder={999}>
      <mesh position={[0, 0, 0.02]} renderOrder={1000}>
        <ringGeometry args={[0.012, 0.018, 24]} />
        <meshBasicMaterial color="#39ff14" depthTest={false} toneMapped={false} />
      </mesh>
      <mesh position={[0.18, -0.01, -0.01]} renderOrder={998}>
        <planeGeometry args={[0.44, 0.28]} />
        <meshBasicMaterial color="#000" transparent opacity={0.55} depthTest={false} />
      </mesh>
      <Text ref={foodRef} {...textProps} position={[0, 0.09, 0]} color="#ffb070">
        Food
      </Text>
      <Text ref={waterRef} {...textProps} position={[0, 0.04, 0]} color="#7ac8ff">
        Water
      </Text>
      <Text ref={packRef} {...textProps} position={[0, -0.01, 0]} color="#ffffff">
        Carrots
      </Text>
      <Text
        ref={tagRef}
        {...textProps}
        position={[0, -0.08, 0]}
        fontSize={0.042}
        color="#8bff8b"
        maxWidth={0.42}
      >
        YOU ARE IT
      </Text>
    </group>
  );
}
