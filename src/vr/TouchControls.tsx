import { useEffect, useRef } from "react";
import { uiState } from "./uiState";

const KNOB_MAX = 55;

export function TouchControls() {
  const padRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const moveTouch = useRef<{ id: number; cx: number; cy: number } | null>(null);
  const lookTouch = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const insidePad = (x: number, y: number) => {
      const el = padRef.current;
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };

    const onStart = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (insidePad(t.clientX, t.clientY) && !moveTouch.current) {
          const el = padRef.current!;
          const r = el.getBoundingClientRect();
          moveTouch.current = {
            id: t.identifier,
            cx: r.left + r.width / 2,
            cy: r.top + r.height / 2,
          };
          e.preventDefault();
        } else if (!lookTouch.current) {
          lookTouch.current = { id: t.identifier, x: t.clientX, y: t.clientY };
        }
      }
    };

    const onMove = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (moveTouch.current?.id === t.identifier) {
          const dx = t.clientX - moveTouch.current.cx;
          const dy = t.clientY - moveTouch.current.cy;
          const cx = Math.max(-KNOB_MAX, Math.min(KNOB_MAX, dx));
          const cy = Math.max(-KNOB_MAX, Math.min(KNOB_MAX, dy));
          uiState.mobileMove.x = cx / KNOB_MAX;
          uiState.mobileMove.y = cy / KNOB_MAX;
          if (knobRef.current)
            knobRef.current.style.transform = `translate(${cx}px, ${cy}px)`;
          e.preventDefault();
        } else if (lookTouch.current?.id === t.identifier) {
          uiState.mobileLook.x += t.clientX - lookTouch.current.x;
          uiState.mobileLook.y += t.clientY - lookTouch.current.y;
          lookTouch.current.x = t.clientX;
          lookTouch.current.y = t.clientY;
          e.preventDefault();
        }
      }
    };

    const onEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (moveTouch.current?.id === t.identifier) {
          moveTouch.current = null;
          uiState.mobileMove.x = 0;
          uiState.mobileMove.y = 0;
          if (knobRef.current) knobRef.current.style.transform = "";
        }
        if (lookTouch.current?.id === t.identifier) {
          lookTouch.current = null;
        }
      }
    };

    window.addEventListener("touchstart", onStart, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  return (
    <>
      <div
        ref={padRef}
        style={{
          position: "fixed",
          bottom: 32,
          left: 32,
          width: 150,
          height: 150,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.45)",
          background: "rgba(0,0,0,0.28)",
          zIndex: 15,
          touchAction: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          ref={knobRef}
          style={{
            width: 62,
            height: 62,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.6)",
            pointerEvents: "none",
            transition: "transform 60ms linear",
          }}
        />
      </div>
      <div
        style={{
          position: "fixed",
          bottom: 40,
          right: 24,
          padding: "8px 12px",
          borderRadius: 8,
          background: "rgba(0,0,0,0.5)",
          color: "#fff",
          fontFamily: "sans-serif",
          fontSize: 12,
          zIndex: 15,
          pointerEvents: "none",
          maxWidth: 160,
          textAlign: "center",
        }}
      >
        Drag right side to look
      </div>
    </>
  );
}
