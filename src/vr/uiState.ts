import { useEffect, useState } from "react";

const listeners = new Set<() => void>();

export const uiState = {
  started: false,
  showInstructions: true,
  // Mobile touch input (populated by TouchControls, consumed by Player).
  mobileMove: { x: 0, y: 0 },
  // Per-frame look delta in CSS px; Player reads then zeroes.
  mobileLook: { x: 0, y: 0 },
};

function notify() {
  for (const l of listeners) l();
}

export function subscribeUi(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function startGame() {
  if (!uiState.started) {
    uiState.started = true;
    uiState.showInstructions = false;
    notify();
  }
}

export function toggleInstructions() {
  uiState.showInstructions = !uiState.showInstructions;
  notify();
}

export function useUi() {
  const [, tick] = useState(0);
  useEffect(() => subscribeUi(() => tick((n) => (n + 1) % 1_000_000)), []);
  return uiState;
}

// Only treat as a touch device when the primary pointer is coarse (phones/tablets).
// Many laptops report maxTouchPoints > 0 but still use a mouse — don't show joystick there.
export const isTouchDevice =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches &&
  (("ontouchstart" in window) || (navigator as any).maxTouchPoints > 0);
