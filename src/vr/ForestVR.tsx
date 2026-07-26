import { Suspense, useEffect, useRef, useState } from "react";
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
  offerSession: "immersive-vr",
  hand: { teleportPointer: true },
});

const DESKTOP_DPR: [number, number] = [1, 2];
const VR_SAFE_DPR: [number, number] = [1, 1];


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
function XRSessionSync({
  onSessionChange,
}: {
  onSessionChange: (active: boolean) => void;
}) {
  const session = useXR((s) => s.session);
  const wasActive = useRef(false);
  useEffect(() => {
    const active = Boolean(session);
    onSessionChange(active);

    if (active) {
      startGame();
      if (!wasActive.current) {
        console.info("Immersive VR session started; using Quest-safe scene settings.");
      }
    } else if (wasActive.current) {
      console.info("Immersive VR session ended; restoring desktop scene settings.");
    }

    wasActive.current = active;
  }, [session, onSessionChange]);
  return null;
}

function WebGLContextGuard({ onLost }: { onLost: () => void }) {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const canvas = gl.domElement;
    const handleLost = (event: Event) => {
      event.preventDefault();
      console.error("WebGL context lost while rendering the VR forest.");
      onLost();
    };
    const handleRestored = () => {
      console.info("WebGL context restored for the VR forest.");
    };

    canvas.addEventListener("webglcontextlost", handleLost);
    canvas.addEventListener("webglcontextrestored", handleRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", handleLost);
      canvas.removeEventListener("webglcontextrestored", handleRestored);
    };
  }, [gl, onLost]);

  return null;
}

function Atmosphere({ vrSafe }: { vrSafe: boolean }) {
  if (vrSafe) {
    return <Sky sunPosition={[40, 55, 25]} turbidity={2.4} rayleigh={1.1} mieCoefficient={0.004} mieDirectionalG={0.82} />;
  }

  return (
    <>
      <Sky sunPosition={[40, 55, 25]} turbidity={3} rayleigh={1.2} mieCoefficient={0.005} mieDirectionalG={0.85} />
      {/* HDRI is a network fetch — isolate it so a slow/failed load can't
          suspend the whole scene (which blacks out the headset). */}
      <Suspense fallback={null}>
        <Environment preset="park" background={false} environmentIntensity={0.6} />
      </Suspense>
      <Clouds material={THREE.MeshBasicMaterial} limit={40}>
        <Cloud seed={1} segments={30} bounds={[8, 2, 4]} volume={7} position={[20, 45, -30]} color="#ffffff" opacity={0.65} />
        <Cloud seed={2} segments={24} bounds={[10, 2, 4]} volume={9} position={[-40, 50, 10]} color="#ffffff" opacity={0.6} />
        <Cloud seed={3} segments={20} bounds={[8, 2, 4]} volume={6} position={[10, 48, 40]} color="#ffffff" opacity={0.55} />
      </Clouds>
    </>
  );
}

export default function ForestVR() {
  const ui = useUi();
  const [vrSessionActive, setVrSessionActive] = useState(false);
  const [webglContextLost, setWebglContextLost] = useState(false);

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
              void enterVRSafely();
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

      {webglContextLost && (
        <div
          role="alert"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.72)",
            color: "#fff",
            padding: 24,
            fontSize: 16,
            lineHeight: 1.45,
            fontFamily: "sans-serif",
            textAlign: "center",
          }}
        >
          The headset lost the forest graphics context. Reload this page, then enter VR again.
        </div>
      )}

      <Canvas
        shadows={!vrSessionActive}
        dpr={vrSessionActive ? VR_SAFE_DPR : DESKTOP_DPR}
        camera={{ fov: 70, near: 0.1, far: 600, position: [6, 3, 6] }}
        gl={{
          antialias: !vrSessionActive,
          alpha: false,
          depth: true,
          stencil: false,
          preserveDrawingBuffer: false,
          powerPreference: vrSessionActive ? "default" : "high-performance",
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = vrSessionActive ? 0.95 : 1.05;
          gl.shadowMap.type = THREE.PCFShadowMap;
          gl.setClearColor("#9ec3e0", 1);
        }}
      >
        <WebGLContextGuard onLost={() => setWebglContextLost(true)} />
        <XR store={store}>
          <XRSessionSync onSessionChange={setVrSessionActive} />
          <color attach="background" args={["#9ec3e0"]} />
          <fog attach="fog" args={["#b8d0e2", 55, 220]} />

          <ambientLight intensity={0.35} />
          <hemisphereLight args={["#dceeff", "#3a4a2a", 0.45]} />
          <directionalLight
            position={[40, 55, 25]}
            intensity={vrSessionActive ? 1.7 : 2.2}
            color="#fff2d6"
            castShadow={!vrSessionActive}
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
          <Atmosphere vrSafe={vrSessionActive} />
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
