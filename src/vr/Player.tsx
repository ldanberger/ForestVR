import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { XROrigin, useXRInputSourceState } from "@react-three/xr";
import * as THREE from "three";
import { heightAt } from "./useHeightAt";

const EYE_HEIGHT = 1.6;
const MOVE_SPEED = 3.2;
const SNAP_TURN_DEG = 30;

const keys: Record<string, boolean> = {};
if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => (keys[e.code] = true));
  window.addEventListener("keyup", (e) => (keys[e.code] = false));
}

export function Player() {
  const originRef = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const left = useXRInputSourceState("controller", "left");
  const right = useXRInputSourceState("controller", "right");
  const snapCooldown = useRef(0);

  // Start position
  useEffect(() => {
    if (originRef.current) {
      originRef.current.position.set(6, heightAt(6, 6), 6);
    }
  }, []);

  useFrame((_, dt) => {
    const rig = originRef.current;
    if (!rig) return;

    // Determine forward from head yaw (works both in and out of VR)
    const headQuat = new THREE.Quaternion();
    camera.getWorldQuaternion(headQuat);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(headQuat);
    fwd.y = 0;
    fwd.normalize();
    const strafe = new THREE.Vector3(fwd.z, 0, -fwd.x);

    let mx = 0;
    let mz = 0;

    // Keyboard fallback
    if (keys["KeyW"] || keys["ArrowUp"]) mz += 1;
    if (keys["KeyS"] || keys["ArrowDown"]) mz -= 1;
    if (keys["KeyD"] || keys["ArrowRight"]) mx += 1;
    if (keys["KeyA"] || keys["ArrowLeft"]) mx -= 1;

    // Left thumbstick: smooth locomotion
    const lstick = left?.gamepad?.["xr-standard-thumbstick"];
    if (lstick) {
      mx += lstick.xAxis ?? 0;
      mz += -(lstick.yAxis ?? 0);
    }

    if (mx !== 0 || mz !== 0) {
      const mv = new THREE.Vector3()
        .addScaledVector(fwd, mz)
        .addScaledVector(strafe, mx);
      if (mv.lengthSq() > 1) mv.normalize();
      rig.position.x += mv.x * MOVE_SPEED * dt;
      rig.position.z += mv.z * MOVE_SPEED * dt;
    }

    // Right thumbstick: snap turn
    snapCooldown.current -= dt;
    const rstick = right?.gamepad?.["xr-standard-thumbstick"];
    const rx = rstick?.xAxis ?? 0;
    if (Math.abs(rx) > 0.7 && snapCooldown.current <= 0) {
      rig.rotation.y -= Math.sign(rx) * (SNAP_TURN_DEG * Math.PI) / 180;
      snapCooldown.current = 0.3;
    }
    // Keyboard Q/E turn
    if (keys["KeyQ"]) rig.rotation.y += dt * 1.5;
    if (keys["KeyE"]) rig.rotation.y -= dt * 1.5;

    // Terrain follow
    rig.position.y = heightAt(rig.position.x, rig.position.z);
  });

  return (
    <XROrigin ref={originRef}>
      {/* Non-XR camera lives at eye height inside the rig */}
      <perspectiveCamera position={[0, EYE_HEIGHT, 0]} />
    </XROrigin>
  );
}
