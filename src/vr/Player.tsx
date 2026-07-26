import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { XROrigin, useXRInputSourceState, useXR } from "@react-three/xr";
import * as THREE from "three";
import { heightAt } from "./useHeightAt";
import { playerState } from "./playerState";
import {
  survivalState,
  FOOD_DRAIN_PER_M,
  WATER_DRAIN_PER_M,
  WATER_GAIN_PER_S,
  MAX_STAT,
} from "./survivalState";
import { STREAM_HALF_WIDTH } from "./useHeightAt";
import { uiState, toggleInstructions } from "./uiState";

const EYE_HEIGHT = 1.6;
// Speed scales with food: well-fed sprints past animals, starving lags behind.
// Fastest "it" animal ≈ 6 m/s (fox × 3.2). Tiers picked around that.
const MOVE_SPEED_FAST = 7;   // food > 75 — faster than every animal
const MOVE_SPEED_NORMAL = 6; // 25..75  — matches top "it" speed
const MOVE_SPEED_SLOW = 3;   // food < 25 — slower than "it" animals
function currentMoveSpeed() {
  const f = survivalState.food;
  if (f > 75) return MOVE_SPEED_FAST;
  if (f < 25) return MOVE_SPEED_SLOW;
  return MOVE_SPEED_NORMAL;
}
const SNAP_TURN_DEG = 30;

const keys: Record<string, boolean> = {};
if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
  });
  window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });
}

export function Player() {
  const originRef = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const left = useXRInputSourceState("controller", "left");
  const right = useXRInputSourceState("controller", "right");
  const session = useXR((s) => s.session);
  const snapCooldown = useRef(0);
  const yaw = useRef(0);
  const pitch = useRef(0);
  const dragging = useRef(false);
  const prevBButton = useRef(false);

  // Initial desktop camera setup
  useEffect(() => {
    camera.position.set(6, heightAt(6, 6) + EYE_HEIGHT, 12);
    yaw.current = Math.PI; // face -z (toward origin)
    pitch.current = -0.1;
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch.current, yaw.current, 0);
  }, [camera]);

  // Mouse look (desktop): click-and-drag to turn
  useEffect(() => {
    const canvas = gl.domElement;
    const onDown = () => {
      dragging.current = true;
    };
    const onUp = () => {
      dragging.current = false;
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || session) return;
      yaw.current -= e.movementX * 0.003;
      pitch.current -= e.movementY * 0.003;
      pitch.current = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitch.current));
    };
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    return () => {
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
    };
  }, [gl, session]);

  useFrame((_, dt) => {
    if (survivalState.gameOver) return;
    const inXR = !!session;

    // Read inputs
    let mx = 0;
    let mz = 0;
    if (keys["KeyW"] || keys["ArrowUp"]) mz += 1;
    if (keys["KeyS"] || keys["ArrowDown"]) mz -= 1;
    if (keys["KeyD"] || keys["ArrowRight"]) mx += 1;
    if (keys["KeyA"] || keys["ArrowLeft"]) mx -= 1;

    const lstick = left?.gamepad?.["xr-standard-thumbstick"];
    if (lstick) {
      mx += lstick.xAxis ?? 0;
      mz += -(lstick.yAxis ?? 0);
    }

    // Mobile touch joystick.
    mx += uiState.mobileMove.x;
    mz += -uiState.mobileMove.y;

    // B button on right controller toggles instructions (menu button is
    // reserved by the Meta system UI and can't be captured by the app).
    const bBtn: any = (right?.gamepad as any)?.["b-button"];
    const bPressed = !!(bBtn && (bBtn.button > 0.5 || bBtn.state === "pressed"));
    if (bPressed && !prevBButton.current) toggleInstructions();
    prevBButton.current = bPressed;

    if (inXR) {
      const rig = originRef.current;
      if (!rig) return;

      // Forward from head yaw
      const headQuat = new THREE.Quaternion();
      camera.getWorldQuaternion(headQuat);
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(headQuat);
      fwd.y = 0;
      fwd.normalize();
      const strafe = new THREE.Vector3(fwd.z, 0, -fwd.x);

      if (mx !== 0 || mz !== 0) {
        const mv = new THREE.Vector3().addScaledVector(fwd, mz).addScaledVector(strafe, mx);
        if (mv.lengthSq() > 1) mv.normalize();
        rig.position.x += mv.x * currentMoveSpeed() * dt;
        rig.position.z += mv.z * currentMoveSpeed() * dt;
      }

      // Snap turn
      snapCooldown.current -= dt;
      const rstick = right?.gamepad?.["xr-standard-thumbstick"];
      const rx = rstick?.xAxis ?? 0;
      if (Math.abs(rx) > 0.7 && snapCooldown.current <= 0) {
        rig.rotation.y -= (Math.sign(rx) * (SNAP_TURN_DEG * Math.PI)) / 180;
        snapCooldown.current = 0.3;
      }

      rig.position.y = heightAt(rig.position.x, rig.position.z);
    } else {
      // Desktop / mobile: move the actual camera
      // Q/E turn
      if (keys["KeyQ"]) yaw.current += dt * 1.8;
      if (keys["KeyE"]) yaw.current -= dt * 1.8;

      // Mobile touch look (drag on right side).
      if (uiState.mobileLook.x !== 0 || uiState.mobileLook.y !== 0) {
        yaw.current -= uiState.mobileLook.x * 0.005;
        pitch.current -= uiState.mobileLook.y * 0.005;
        pitch.current = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitch.current));
        uiState.mobileLook.x = 0;
        uiState.mobileLook.y = 0;
      }
      camera.rotation.set(pitch.current, yaw.current, 0);

      // Forward on the XZ plane derived from yaw
      const fwd = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
      const strafe = new THREE.Vector3(Math.cos(yaw.current), 0, -Math.sin(yaw.current));

      if (mx !== 0 || mz !== 0) {
        const mv = new THREE.Vector3().addScaledVector(fwd, mz).addScaledVector(strafe, mx);
        if (mv.lengthSq() > 1) mv.normalize();
        camera.position.x += mv.x * currentMoveSpeed() * dt;
        camera.position.z += mv.z * currentMoveSpeed() * dt;
      }
      camera.position.y = heightAt(camera.position.x, camera.position.z) + EYE_HEIGHT;
    }

    // Publish player state for HUD (minimap etc.) and drain/refill survival stats.
    const prevX = playerState.pos.x;
    const prevZ = playerState.pos.z;
    if (inXR && originRef.current) {
      playerState.pos.copy(originRef.current.position);
      playerState.yaw = originRef.current.rotation.y;
    } else {
      playerState.pos.copy(camera.position);
      playerState.yaw = yaw.current;
    }
    const dxm = playerState.pos.x - prevX;
    const dzm = playerState.pos.z - prevZ;
    const moved = Math.hypot(dxm, dzm);
    if (moved > 0) {
      survivalState.food = Math.max(0, survivalState.food - moved * FOOD_DRAIN_PER_M);
      survivalState.water = Math.max(0, survivalState.water - moved * WATER_DRAIN_PER_M);
    }
    // Standing in / at the stream refills water without removing it from the map.
    if (Math.abs(playerState.pos.x) < STREAM_HALF_WIDTH + 0.6) {
      survivalState.water = Math.min(100, survivalState.water + WATER_GAIN_PER_S * dt);
    }
    if (survivalState.food <= 0 || survivalState.water <= 0) {
      survivalState.gameOver = true;
    }
  });

  return <XROrigin ref={originRef} position={[6, 0, 6]} />;
}
