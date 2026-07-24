import { useEffect, useState } from "react";
import { tagState } from "./tagState";

export function TagHUD() {
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

  const playerIt = tagState.playerIsIt;
  const itCount = tagState.itIds.size;
  const total = tagState.critters.length;

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        padding: "8px 16px",
        background: playerIt ? "rgba(60,140,60,0.85)" : "rgba(180,40,40,0.9)",
        color: "#fff",
        fontFamily: "sans-serif",
        fontWeight: 700,
        fontSize: 14,
        border: "1px solid rgba(0,0,0,0.5)",
        borderRadius: 8,
        textShadow: "0 1px 2px rgba(0,0,0,0.6)",
        letterSpacing: 0.5,
        textAlign: "center",
      }}
    >
      {playerIt ? (
        <>YOU ARE IT — catch an animal! ({total} nearby)</>
      ) : (
        <>RUN! {itCount} {itCount === 1 ? "animal is" : "animals are"} chasing you</>
      )}
    </div>
  );
}
