import { useEffect, useState } from "react";
import { survivalState } from "./survivalState";

export function SurvivalHUD() {
  const [, tick] = useState(0);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      tick((n) => (n + 1) % 1000000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const food = Math.max(0, Math.min(100, survivalState.food));
  const water = Math.max(0, Math.min(100, survivalState.water));

  const bar = (label: string, val: number, color: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 46, fontSize: 12, color: "#fff", fontFamily: "sans-serif" }}>
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 12,
          background: "rgba(255,255,255,0.15)",
          borderRadius: 6,
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            width: `${val}%`,
            height: "100%",
            background: color,
            transition: "width 120ms linear",
          }}
        />
      </div>
      <span style={{ width: 28, textAlign: "right", fontSize: 12, color: "#fff", fontFamily: "sans-serif" }}>
        {Math.round(val)}
      </span>
    </div>
  );

  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        left: 16,
        zIndex: 10,
        width: 240,
        padding: "10px 12px",
        background: "rgba(0,0,0,0.55)",
        border: "1px solid #444",
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        pointerEvents: "none",
      }}
    >
      {bar("Food", food, "#e26a1f")}
      {bar("Water", water, "#3aa0e0")}
    </div>
  );
}
