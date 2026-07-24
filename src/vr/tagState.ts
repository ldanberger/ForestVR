// Shared "tag" game state.
// Player starts as "it"; catching an animal transfers it. If an "it" animal
// touches another animal, that animal also becomes "it". When any "it" animal
// catches the player, all animals are cleared of "it" and the player is "it"
// again.

import * as THREE from "three";

export type TagCritter = {
  id: number;
  pos: THREE.Vector3;
  species: "rabbit" | "fox";
};

export const CATCH_RADIUS = 1.1;
export const FLEE_RADIUS = 18;
export const IT_SPEED_MULT = 1.55;
export const FLEE_SPEED_MULT = 1.35;

export const tagState = {
  playerIsIt: true,
  itIds: new Set<number>(),
  critters: [] as TagCritter[],
  version: 0,
};

let nextId = 1;
export function nextCritterId() {
  return nextId++;
}

export function registerCritter(c: TagCritter) {
  tagState.critters.push(c);
}

export function tagAnimal(id: number) {
  if (!tagState.itIds.has(id)) {
    tagState.itIds.add(id);
    tagState.version++;
  }
}

/** An "it" animal touched the player: player becomes "it", all animals cleared. */
export function playerCaught() {
  tagState.playerIsIt = true;
  tagState.itIds.clear();
  tagState.version++;
}

/** Player (while "it") touched an animal: that animal becomes the sole "it". */
export function playerCaughtAnimal(id: number) {
  tagState.playerIsIt = false;
  tagState.itIds.clear();
  tagState.itIds.add(id);
  tagState.version++;
}
