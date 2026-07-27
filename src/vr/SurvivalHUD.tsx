import { useEffect, useState } from "react";
import { survivalState, eatFromBackpack, resetSurvival, MAX_STAT } from "./survivalState";
import { tagState, currentSafeMs } from "./tagState";

function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

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

  const food = Math.max(0, Math.min(MAX_STAT, survivalState.food));
  const water = Math.max(0, Math.min(MAX_STAT, survivalState.water));
  const backpack = survivalState.backpack;
  const gameOver = survivalState.gameOver;

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
            width: `${(val / MAX_STAT) * 100}%`,
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
    <>
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          zIndex: 10,
          width: 260,
          padding: "10px 12px",
          background: "rgba(0,0,0,0.55)",
          border: "1px solid #444",
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {bar("Food", food, "#e26a1f")}
        {bar("Water", water, "#3aa0e0")}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 4,
            color: "#fff",
            fontFamily: "sans-serif",
            fontSize: 12,
          }}
        >
          <span style={{ width: 46 }}>🎒</span>
          <span style={{ flex: 1 }}>Carrots: {backpack}</span>
          <button
            onClick={eatFromBackpack}
            disabled={backpack <= 0 || gameOver}
            style={{
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 600,
              background: backpack > 0 && !gameOver ? "#e26a1f" : "#555",
              color: "#fff",
              border: "1px solid rgba(0,0,0,0.5)",
              borderRadius: 6,
              cursor: backpack > 0 && !gameOver ? "pointer" : "not-allowed",
            }}
          >
            Eat 1
          </button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#fff",
            fontFamily: "sans-serif",
            fontSize: 12,
          }}
        >
          <span style={{ width: 46 }}>⏱️</span>
          <span style={{ flex: 1 }}>Safe: {fmtTime(currentSafeMs())}</span>
          <span style={{ color: "#ffd23f" }}>Best: {fmtTime(Math.max(tagState.highestSafeMs, currentSafeMs()))}</span>
        </div>
      </div>

      {gameOver && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.7)",
            fontFamily: "sans-serif",
            color: "#fff",
          }}
        >
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid #555",
              borderRadius: 12,
              padding: "28px 36px",
              textAlign: "center",
              maxWidth: 360,
            }}
          >
            <h1 style={{ margin: 0, fontSize: 32, color: "#e26a1f" }}>Game Over</h1>
            <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.5 }}>
              {food <= 0 ? "You starved." : "You died of thirst."}
              <br />
              Manage food and water to survive longer.
            </p>
            <button
              onClick={() => resetSurvival()}
              style={{
                marginTop: 16,
                padding: "10px 20px",
                fontSize: 15,
                fontWeight: 600,
                background: "#3aa0e0",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Restart
            </button>
          </div>
        </div>
      )}
    </>
  );
}
