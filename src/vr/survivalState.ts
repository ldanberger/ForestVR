// Shared survival state for food/water, backpack, and carrot pickups.
// Mutated imperatively from useFrame; HUD reads via requestAnimationFrame.

export type Carrot = {
  id: number;
  x: number;
  z: number;
  picked: boolean;
  foundByPlayer: boolean;
};

export const survivalState = {
  food: 100,
  water: 100,
  backpack: 0,
  gameOver: false,
  carrots: [] as Carrot[],
  // Bump when a carrot is picked so HUD/scene can react if needed.
  version: 0,
};

// Drain rate per meter travelled (units per meter).
export const FOOD_DRAIN_PER_M = 0.35;
export const WATER_DRAIN_PER_M = 0.5;
// Gain per second while standing in water.
export const WATER_GAIN_PER_S = 25;
// Gain when eating a carrot from the backpack.
export const CARROT_FOOD_GAIN = 30;
export const CARROT_PICK_RADIUS = 1.2;
// Radius at which animals eat a carrot they wander over.
export const ANIMAL_EAT_RADIUS = 0.9;

export function eatFromBackpack() {
  if (survivalState.gameOver) return;
  if (survivalState.backpack <= 0) return;
  survivalState.backpack -= 1;
  survivalState.food = Math.min(100, survivalState.food + CARROT_FOOD_GAIN);
  survivalState.version++;
}

export function resetSurvival() {
  survivalState.food = 100;
  survivalState.water = 100;
  survivalState.backpack = 0;
  survivalState.gameOver = false;
  for (const c of survivalState.carrots) {
    c.picked = false;
    c.foundByPlayer = false;
  }
  survivalState.version++;
}
