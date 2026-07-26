import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Sky, Environment, Cloud, Clouds } from "@react-three/drei";
import { XR, createXRStore, useXR } from "@react-three/xr";
import * as THREE from "three";
import { Terrain } from "./Terrain";
import { Stream } from "./Stream";
import { Trees, Rocks, GrassBlades } from "./Scatter";
import { Rabbits, Foxes } from "./Animals";
import { Player } from "./Player";
import { Items } from "./Items";
import { Carrots } from "./Carrots";
import { Minimap } from "./Minimap";
import { SurvivalHUD } from "./SurvivalHUD";
import { TagHUD } from "./TagHUD";
import { VRHud } from "./VRHud";
import { TouchControls } from "./TouchControls";
import {
  isTouchDevice,
  startGame,
  toggleInstructions,
  useUi,
} from "./uiState";

const store = createXRStore({
  foveation: 0,
  // Ask the runtime for local-floor so the world sits at ground level in the headset.
  sessionInit: {
    optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking", "layers"],
  },
});

async function enterVRSafely() {
  try {
    // Some browsers (Quest) only expose navigator.xr on secure origins.
    if (typeof navigator === "undefined" || !("xr" in navigator)) {
      alert(
        "WebXR is not available in this browser.\n\n" +
          "On Meta Quest 3: open the Meta Quest Browser and load this page's URL directly (not through Lovable's preview iframe), then tap 'Enter VR'.",
      );
      return;
    }
    const supported = await (navigator as any).xr?.isSessionSupported?.(
      "immersive-vr",
    );
    if (!supported) {
      alert(
        "Immersive VR is not supported here.\n\n" +
          "Open this exact URL inside the Meta Quest Browser on the headset (not the desktop preview, and not inside an iframe).",
      );
      return;
    }
    await store.enterVR();
    startGame();
  } catch (err) {
    console.error("enterVR failed", err);
    alert(
      "Could not start VR: " +
        (err instanceof Error ? err.message : String(err)) +
        "\n\nTip: open this page's URL directly in the Meta Quest Browser (top-right 'Open in new tab' from the preview), then press Enter VR.",
    );
  }
}

/** Mounted inside <XR>; flips uiState.started as soon as a session begins. */
function XRSessionSync() {
  const session = useXR((s) => s.session);
  useEffect(() => {
    if (session) startGame();
  }, [session]);
  return null;
}

export default function ForestVR() {
  const ui = useUi();

  // Right-click anywhere toggles the instructions panel.
  useEffect(() => {
    const onCtx = (e: MouseEvent) => {
      e.preventDefault();
      toggleInstructions();
    };
    window.addEventListener("contextmenu", onCtx);
    return () => window.removeEventListener("contextmenu", onCtx);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#88b4d8" }}>
      <Minimap />
      <SurvivalHUD />
      <TagHUD />
      {isTouchDevice && ui.started && <TouchControls />}

      {!ui.started && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <button
            onClick={() => {
              store.enterVR();
              startGame();
            }}
            style={{
              padding: "12px 20px",
              fontSize: 16,
              fontWeight: 600,
              background: "#1a1a1a",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Enter VR (Meta Quest 3)
          </button>
          <button
            onClick={() => startGame()}
            style={{
              padding: "10px 18px",
              fontSize: 15,
              fontWeight: 600,
              background: "#3aa0e0",
              color: "#fff",
              border: "1px solid #226",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Start on {isTouchDevice ? "iPhone / Touch" : "Desktop"}
          </button>
        </div>
      )}

      {ui.started && ui.showInstructions && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            zIndex: 10,
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            padding: "10px 12px",
            borderRadius: 8,
            fontSize: 13,
            maxWidth: 300,
            lineHeight: 1.45,
            fontFamily: "sans-serif",
          }}
        >
          <strong>VR:</strong> left stick walk, right stick snap turn, trigger
          near an item to grab, B button toggles this help.
          <br />
          <strong>Desktop:</strong> WASD / arrows to move, Q/E to turn,
          right-click toggles this help.
          <br />
          <strong>iPhone:</strong> left joystick to move, drag right side to
          look.
        </div>
      )}

      {ui.started && !ui.showInstructions && (
        <button
          onClick={() => toggleInstructions()}
          title="Show help (right-click / B button also works)"
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            zIndex: 10,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            border: "1px solid #555",
            cursor: "pointer",
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          ?
        </button>
      )}

      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 70, near: 0.1, far: 600, position: [6, 3, 6] }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          gl.shadowMap.type = THREE.PCFShadowMap;
        }}
      >
        <XR store={store}>
          <XRSessionSync />
          <color attach="background" args={["#9ec3e0"]} />
          <fog attach="fog" args={["#b8d0e2", 55, 220]} />

          <ambientLight intensity={0.35} />
          <hemisphereLight args={["#dceeff", "#3a4a2a", 0.45]} />
          <directionalLight
            position={[40, 55, 25]}
            intensity={2.2}
            color="#fff2d6"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-left={-60}
            shadow-camera-right={60}
            shadow-camera-top={60}
            shadow-camera-bottom={-60}
            shadow-camera-near={0.5}
            shadow-camera-far={200}
            shadow-bias={-0.0004}
            shadow-normalBias={0.04}
          />
          <Sky sunPosition={[40, 55, 25]} turbidity={3} rayleigh={1.2} mieCoefficient={0.005} mieDirectionalG={0.85} />
          <Environment preset="park" background={false} environmentIntensity={0.6} />
          <Clouds material={THREE.MeshBasicMaterial} limit={40}>
            <Cloud seed={1} segments={30} bounds={[8, 2, 4]} volume={7} position={[20, 45, -30]} color="#ffffff" opacity={0.65} />
            <Cloud seed={2} segments={24} bounds={[10, 2, 4]} volume={9} position={[-40, 50, 10]} color="#ffffff" opacity={0.6} />
            <Cloud seed={3} segments={20} bounds={[8, 2, 4]} volume={6} position={[10, 48, 40]} color="#ffffff" opacity={0.55} />
          </Clouds>
          <Terrain />
          <Stream />
          <Trees />
          <GrassBlades />
          <Rocks />
          <Rabbits />
          <Foxes />
          <Items />
          <Carrots />
          <Player />
          <VRHud />
        </XR>
      </Canvas>
    </div>
  );
}
