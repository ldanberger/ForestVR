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
// Player moves at 4 m/s, so "it" animals need to be clearly faster to catch up.
export const IT_SPEED_MULT = 3.2;
export const FLEE_SPEED_MULT = 1.6;

export const IT_FREEZE_SECONDS = 10;

export const tagState = {
  playerIsIt: true,
  itIds: new Set<number>(),
  /** Wall-clock ms when each animal became "it"; used to freeze them briefly. */
  itSince: new Map<number, number>(),
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

export function registerCrittersForSpecies(species: TagCritter["species"], critters: TagCritter[]) {
  const removedIds = new Set<number>();
  tagState.critters = tagState.critters.filter((c) => {
    if (c.species !== species) return true;
    removedIds.add(c.id);
    return false;
  });
  for (const id of removedIds) {
    tagState.itIds.delete(id);
    tagState.itSince.delete(id);
  }
  tagState.critters.push(...critters);
  tagState.version++;

  return () => {
    const ids = new Set(critters.map((c) => c.id));
    tagState.critters = tagState.critters.filter((c) => !ids.has(c.id));
    for (const id of ids) {
      tagState.itIds.delete(id);
      tagState.itSince.delete(id);
    }
    tagState.version++;
  };
}

export function tagAnimal(id: number) {
  if (!tagState.itIds.has(id)) {
    tagState.itIds.add(id);
    tagState.itSince.set(id, performance.now());
    tagState.version++;
  }
}

/** An "it" animal touched the player: player becomes "it", all animals cleared. */
export function playerCaught() {
  tagState.playerIsIt = true;
  tagState.itIds.clear();
  tagState.itSince.clear();
  tagState.version++;
}

/** Player (while "it") touched an animal: that animal becomes the sole "it". */
export function playerCaughtAnimal(id: number) {
  tagState.playerIsIt = false;
  tagState.itIds.clear();
  tagState.itSince.clear();
  tagState.itIds.add(id);
  tagState.itSince.set(id, performance.now());
  tagState.version++;
}

export function isFrozen(id: number) {
  const since = tagState.itSince.get(id);
  if (since === undefined) return false;
  return performance.now() - since < IT_FREEZE_SECONDS * 1000;
}
