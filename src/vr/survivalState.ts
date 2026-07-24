// Shared survival state for food/water and carrot pickups.
// Mutated imperatively from useFrame; HUD reads via requestAnimationFrame.

export type Carrot = { id: number; x: number; z: number; picked: boolean };

export const survivalState = {
  food: 100,
  water: 100,
  carrots: [] as Carrot[],
  // Bump when a carrot is picked so HUD/scene can react if needed.
  version: 0,
};

// Drain rate per meter travelled (units per meter).
export const FOOD_DRAIN_PER_M = 0.35;
export const WATER_DRAIN_PER_M = 0.5;
// Gain per second while standing in water.
export const WATER_GAIN_PER_S = 25;
export const CARROT_FOOD_GAIN = 30;
export const CARROT_PICK_RADIUS = 1.2;
