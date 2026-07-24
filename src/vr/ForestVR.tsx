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
      <Canvas shadows camera={{ fov: 75, near: 0.1, far: 500, position: [6, 3, 6] }}>
        <XR store={store}>
          <color attach="background" args={["#88b4d8"]} />
          <fog attach="fog" args={["#a8c4d8", 40, 180]} />
          <ambientLight intensity={0.55} />
          <hemisphereLight args={["#cfe6ff", "#3a4a2a", 0.5]} />
          <directionalLight
            position={[30, 40, 20]}
            intensity={1.4}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <Sky sunPosition={[30, 40, 20]} turbidity={4} rayleigh={1} />
          <Terrain />
          <Stream />
          <Trees />
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
