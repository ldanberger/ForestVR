import { Canvas } from "@react-three/fiber";
import { Sky, Environment, SoftShadows, Cloud, Clouds } from "@react-three/drei";
import { XR, createXRStore } from "@react-three/xr";
import * as THREE from "three";
import { Terrain } from "./Terrain";
import { Stream } from "./Stream";
import { Trees, Rocks, GrassBlades } from "./Scatter";
import { Rabbits, Foxes } from "./Animals";
import { Player } from "./Player";
import { Items } from "./Items";

const store = createXRStore();

export default function ForestVR() {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#88b4d8" }}>
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
          onClick={() => store.enterVR()}
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
        <div
          style={{
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            padding: "10px 12px",
            borderRadius: 8,
            fontSize: 13,
            maxWidth: 280,
            lineHeight: 1.4,
          }}
        >
          <strong>VR:</strong> left stick = walk, right stick = snap turn, trigger near an item = grab, release = drop.
          <br />
          <strong>Desktop:</strong> WASD or arrows to move, Q/E to turn.
        </div>
      </div>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 70, near: 0.1, far: 600, position: [6, 3, 6] }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <XR store={store}>
          <color attach="background" args={["#9ec3e0"]} />
          <fog attach="fog" args={["#b8d0e2", 55, 220]} />
          <SoftShadows size={28} samples={12} focus={0.6} />
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
          <Player />
        </XR>
      </Canvas>
    </div>
  );
}
