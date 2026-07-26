import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { heightAt, STREAM_HALF_WIDTH } from "./useHeightAt";
import { resolveObstacleCollision, steerAroundObstacles } from "./obstacles";
import { survivalState, ANIMAL_EAT_RADIUS } from "./survivalState";
import { playerState } from "./playerState";
import {
  tagState,
  nextCritterId,
  registerCrittersForSpecies,
  playerCaught,
  playerCaughtAnimal,
  tagAnimal,
  killAnimal,
  isFrozen,
  inTagCooldown,
  CATCH_RADIUS,
  FLEE_RADIUS,
  IT_SPEED_MULT,
  FLEE_SPEED_MULT,
} from "./tagState";

type Critter = {
  id: number;
  species: "rabbit" | "fox";
  pos: THREE.Vector3;
  heading: number;
  speed: number;
  phase: number;
  lastCheckT: number;
  lastCheckX: number;
  lastCheckZ: number;
  overlapT: number;
  dead: boolean;
  itChaseT: number;
  itBestDist: number;
  itNoCloseT: number;
};

const WORLD_LIMIT = 55;
const IT_WORLD_LIMIT = 58;

function angleDelta(target: number, current: number) {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

function turnToward(current: number, target: number, maxStep: number) {
  const delta = angleDelta(target, current);
  if (Math.abs(delta) <= maxStep) return target;
  return current + Math.sign(delta) * maxStep;
}

function steerOutOfRestrictedArea(c: Critter, speed: number, dt: number) {
  const streamLimit = STREAM_HALF_WIDTH + 0.6;
  let steerX = 0;
  let steerZ = 0;

  if (Math.abs(c.pos.x) < streamLimit) {
    const side = c.pos.x >= 0 ? 1 : -1;
    c.pos.x = side * streamLimit;
    steerX += side;
  }
  if (c.pos.x > WORLD_LIMIT) {
    c.pos.x = WORLD_LIMIT;
    steerX -= 1;
  } else if (c.pos.x < -WORLD_LIMIT) {
    c.pos.x = -WORLD_LIMIT;
    steerX += 1;
  }
  if (c.pos.z > WORLD_LIMIT) {
    c.pos.z = WORLD_LIMIT;
    steerZ -= 1;
  } else if (c.pos.z < -WORLD_LIMIT) {
    c.pos.z = -WORLD_LIMIT;
    steerZ += 1;
  }

  if (steerX !== 0 || steerZ !== 0) {
    c.heading = turnToward(c.heading, Math.atan2(steerZ, steerX), dt * 8);
    c.pos.x += Math.cos(c.heading) * speed * dt;
    c.pos.z += Math.sin(c.heading) * speed * dt;
  }
}

function makeCritters(count: number, seed: number, speed: number, species: "rabbit" | "fox"): Critter[] {
  const arr: Critter[] = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    const x = ((s / 0xffffffff) - 0.5) * 60;
    s = (s * 1103515245 + 12345) >>> 0;
    const z = ((s / 0xffffffff) - 0.5) * 60;
    if (Math.abs(x) < STREAM_HALF_WIDTH + 1) continue;
    const critter: Critter = {
      id: nextCritterId(),
      species,
      pos: new THREE.Vector3(x, heightAt(x, z), z),
      heading: Math.random() * Math.PI * 2,
      speed,
      phase: Math.random() * Math.PI * 2,
      lastCheckT: 0,
      lastCheckX: x,
      lastCheckZ: z,
      overlapT: 0,
      dead: false,
      itChaseT: 0,
      itBestDist: Infinity,
      itNoCloseT: 0,
    };
    arr.push(critter);
  }
  return arr;
}

function useWander(
  critters: Critter[],
  groupRef: React.RefObject<THREE.Group | null>,
  animate: (child: THREE.Object3D, t: number, critter: Critter, movingSpeed: number) => void,
) {
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (!groupRef.current) return;
    const px = playerState.pos.x;
    const pz = playerState.pos.z;

    critters.forEach((c, i) => {
      const child = groupRef.current!.children[i] as THREE.Object3D | undefined;
      if (c.dead) {
        if (child) child.visible = false;
        return;
      }
      const isIt = tagState.itIds.has(c.id);
      if (!isIt) {
        c.itChaseT = 0;
        c.itBestDist = Infinity;
        c.itNoCloseT = 0;
      }
      const dxp = px - c.pos.x;
      const dzp = pz - c.pos.z;
      const distP = Math.hypot(dxp, dzp) || 0.0001;
      let speed = c.speed;
      let steered = false;
      const cooling = inTagCooldown();
      // "It" animals are 2x scale, so their effective touch radius is bigger.
      const itCatchR = CATCH_RADIUS * 1.6;

      if (!isIt && tagState.playerIsIt && !cooling && distP < CATCH_RADIUS) {
        // Player (it) catches this rendered critter.
        playerCaughtAnimal(c.id);
        speed = 0;
        steered = true;
      } else if (isIt) {
        if (isFrozen(c.id)) {
          // Freshly tagged: stand still for a few seconds.
          speed = 0;
          steered = true;
          c.itChaseT = t;
          c.itBestDist = distP;
          c.itNoCloseT = 0;
        } else {
          // Chase the player, steering around trees/rocks in the way and
          // adding a small weave while still forcing a direct line whenever the
          // animal is close or has stopped closing distance.
          const forceDirect = distP < 10 || c.itNoCloseT > 0.45;
          const weave = forceDirect ? 0 : Math.sin(t * 1.7 + c.phase) * 0.25;
          const rawChase = Math.atan2(dzp, dxp);
          const avoid = forceDirect ? rawChase : steerAroundObstacles(c.pos.x, c.pos.z, rawChase, 2.6, 0.7);
          c.heading = turnToward(c.heading, avoid + weave, dt * 7);
          speed = c.speed * IT_SPEED_MULT;
          steered = true;
          if (!cooling && distP < itCatchR) {
            playerCaught();
            // After swap this animal is no longer "it"; flee this frame so it
            // moves out of catch range instead of oscillating.
            c.heading = Math.atan2(-dzp, -dxp);
          }
          // Chase-progress unstick: if we haven't gotten meaningfully closer
          // to the player within 2s, teleport to ~6m from them so the chase
          // stays lively.
          if (c.itChaseT === 0) {
            c.itChaseT = t;
            c.itBestDist = distP;
          } else if (distP < c.itBestDist - 0.5) {
            c.itChaseT = t;
            c.itBestDist = distP;
          } else if (t - c.itChaseT > 2) {
            const ang = Math.atan2(c.pos.z - pz, c.pos.x - px) + (Math.random() - 0.5) * 0.6;
            const rad = 5.5 + Math.random() * 1.5;
            let nx = px + Math.cos(ang) * rad;
            let nz = pz + Math.sin(ang) * rad;
            if (Math.abs(nx) < STREAM_HALF_WIDTH + 1) nx = (nx >= 0 ? 1 : -1) * (STREAM_HALF_WIDTH + 1);
            nx = Math.max(-IT_WORLD_LIMIT, Math.min(IT_WORLD_LIMIT, nx));
            nz = Math.max(-IT_WORLD_LIMIT, Math.min(IT_WORLD_LIMIT, nz));
            c.pos.x = nx;
            c.pos.z = nz;
            c.pos.y = heightAt(nx, nz);
            c.heading = Math.atan2(pz - nz, px - nx);
            c.itChaseT = t;
            c.itBestDist = Math.hypot(px - nx, pz - nz);
            c.itNoCloseT = 0;
          }
        }
        // "It" animals — frozen or chasing — infect any non-it critter they
        // touch. Checking from the "it" side covers frozen taggers too.
        if (tagState.playerIsIt === false) {
          const r2 = CATCH_RADIUS * CATCH_RADIUS;
          for (const other of tagState.critters) {
            if (other.id === c.id) continue;
            if (tagState.itIds.has(other.id)) continue;
            const ox = other.pos.x - c.pos.x;
            const oz = other.pos.z - c.pos.z;
            if (ox * ox + oz * oz < r2) tagAnimal(other.id);
          }
        }
      } else if (tagState.playerIsIt && distP < FLEE_RADIUS) {
        // Flee from the player.
        c.heading = turnToward(c.heading, Math.atan2(-dzp, -dxp), dt * 6);
        speed = c.speed * FLEE_SPEED_MULT;
        steered = true;
      } else if (!tagState.playerIsIt) {
        // Player is not "it": any non-it animal that brushes an "it" animal
        // becomes "it" too. Also gives the player some space during chases.
        const r2 = CATCH_RADIUS * CATCH_RADIUS;
        let fleeIt: { dx: number; dz: number } | null = null;
        for (const other of tagState.critters) {
          if (!tagState.itIds.has(other.id)) continue;
          const ox = c.pos.x - other.pos.x;
          const oz = c.pos.z - other.pos.z;
          const od2 = ox * ox + oz * oz;
          if (od2 < r2) {
            tagAnimal(c.id);
            break;
          }
          if (!fleeIt && od2 < FLEE_RADIUS * FLEE_RADIUS) {
            fleeIt = { dx: ox, dz: oz };
          }
        }
        if (!tagState.itIds.has(c.id) && fleeIt) {
          // Non-it animals also flee from "it" animals so they don't sit still
          // and get tagged trivially.
          c.heading = turnToward(c.heading, Math.atan2(fleeIt.dz, fleeIt.dx), dt * 5);
          speed = c.speed * FLEE_SPEED_MULT;
          steered = true;
        } else if (distP < FLEE_RADIUS * 0.6) {
          c.heading = turnToward(c.heading, Math.atan2(-dzp, -dxp), dt * 5);
          speed = c.speed * 1.1;
          steered = true;
        }
      }

      if (!steered && Math.sin(t * 0.3 + i) > 0.995) {
        c.heading += (Math.random() - 0.5) * 1.2;
      }

      c.pos.x += Math.cos(c.heading) * speed * dt;
      c.pos.z += Math.sin(c.heading) * speed * dt;
      if (isIt) {
        // "It" animals chase the player wherever they roam — don't flip their
        // heading at the world edge, just clamp position so they can't leave.
        if (c.pos.x > IT_WORLD_LIMIT) c.pos.x = IT_WORLD_LIMIT;
        else if (c.pos.x < -IT_WORLD_LIMIT) c.pos.x = -IT_WORLD_LIMIT;
        if (c.pos.z > IT_WORLD_LIMIT) c.pos.z = IT_WORLD_LIMIT;
        else if (c.pos.z < -IT_WORLD_LIMIT) c.pos.z = -IT_WORLD_LIMIT;
      } else {
        steerOutOfRestrictedArea(c, speed, dt);
      }
      // Trees & rocks: push out if we walked into one and nudge heading away.
      const agentR = (isIt ? 2 : 1) * 0.35;
      if (resolveObstacleCollision(c.pos, agentR)) {
        if (isIt) c.heading = Math.atan2(pz - c.pos.z, px - c.pos.x);
        else c.heading += (Math.random() - 0.5) * 1.2;
      }
      c.pos.y = heightAt(c.pos.x, c.pos.z);

      // Hard guarantee for "it" animals: if this frame did not reduce the
      // player distance, immediately lunge straight at the player. This fixes
      // the visible stall case where an animal is nearby with no obstacle but
      // its heading/avoidance keeps it from actually closing.
      if (isIt && !isFrozen(c.id) && !tagState.playerIsIt) {
        const distAfterMove = Math.hypot(px - c.pos.x, pz - c.pos.z) || 0.0001;
        const closedBy = distP - distAfterMove;
        if (closedBy > 0.03) {
          c.itNoCloseT = Math.max(0, c.itNoCloseT - dt * 2);
        } else {
          c.itNoCloseT += dt;
        }
        if (c.itNoCloseT > 0.35 && distAfterMove > itCatchR) {
          const direct = Math.atan2(pz - c.pos.z, px - c.pos.x);
          const lunge = speed * dt * 1.6;
          c.heading = direct;
          c.pos.x += Math.cos(direct) * lunge;
          c.pos.z += Math.sin(direct) * lunge;
          if (c.pos.x > IT_WORLD_LIMIT) c.pos.x = IT_WORLD_LIMIT;
          else if (c.pos.x < -IT_WORLD_LIMIT) c.pos.x = -IT_WORLD_LIMIT;
          if (c.pos.z > IT_WORLD_LIMIT) c.pos.z = IT_WORLD_LIMIT;
          else if (c.pos.z < -IT_WORLD_LIMIT) c.pos.z = -IT_WORLD_LIMIT;
          resolveObstacleCollision(c.pos, agentR);
          c.pos.y = heightAt(c.pos.x, c.pos.z);
        }
        const distAfterLunge = Math.hypot(px - c.pos.x, pz - c.pos.z) || 0.0001;
        if (!cooling && distAfterLunge < itCatchR) {
          playerCaught();
          c.heading = Math.atan2(c.pos.z - pz, c.pos.x - px);
          c.itNoCloseT = 0;
        } else if (c.itNoCloseT > 1.1 && distAfterLunge > 4) {
          const ang = Math.atan2(c.pos.z - pz, c.pos.x - px) + (Math.random() - 0.5) * 0.45;
          const rad = 4.8 + Math.random() * 1.2;
          let nx = px + Math.cos(ang) * rad;
          let nz = pz + Math.sin(ang) * rad;
          if (Math.abs(nx) < STREAM_HALF_WIDTH + 1) nx = (nx >= 0 ? 1 : -1) * (STREAM_HALF_WIDTH + 1);
          nx = Math.max(-IT_WORLD_LIMIT, Math.min(IT_WORLD_LIMIT, nx));
          nz = Math.max(-IT_WORLD_LIMIT, Math.min(IT_WORLD_LIMIT, nz));
          c.pos.x = nx;
          c.pos.z = nz;
          c.pos.y = heightAt(nx, nz);
          c.heading = Math.atan2(pz - nz, px - nx);
          c.itNoCloseT = 0;
          c.itChaseT = t;
          c.itBestDist = Math.hypot(px - nx, pz - nz);
        }
      }

      // Animal-animal separation: prevent critters from stacking on the same
      // spot (especially "it" animals converging on the player or a fresh tag
      // target). Push both apart along their delta.
      const myR = (tagState.itIds.has(c.id) ? 2 : 1) * 0.45;
      let overlappedThisFrame = false;
      for (const other of tagState.critters) {
        if (other.id === c.id) continue;
        const dx = c.pos.x - other.pos.x;
        const dz = c.pos.z - other.pos.z;
        const otherR = (tagState.itIds.has(other.id) ? 2 : 1) * 0.45;
        const minD = myR + otherR;
        const d2 = dx * dx + dz * dz;
        if (d2 > 0 && d2 < minD * minD) {
          overlappedThisFrame = true;
          const d = Math.sqrt(d2);
          const push = (minD - d) * 0.5;
          const nx = dx / d;
          const nz = dz / d;
          c.pos.x += nx * push;
          c.pos.z += nz * push;
          other.pos.x -= nx * push;
          other.pos.z -= nz * push;
        }
      }
      if (overlappedThisFrame) {
        c.overlapT += dt;
        // Stuck together for too long: kill this one to unstick the pair.
        // Only one dies per collision because the survivor's timer resets
        // once nobody is overlapping it anymore.
        if (c.overlapT > 1.5) {
          c.dead = true;
          killAnimal(c.id);
          if (child) child.visible = false;
          return;
        }
      } else {
        c.overlapT = 0;
      }
      c.pos.y = heightAt(c.pos.x, c.pos.z);

      // Unstick: if the critter hasn't moved much in 5s, teleport nearby.
      // Skip while an "it" animal is frozen — it's supposed to stand still.
      if (isIt && isFrozen(c.id)) {
        c.lastCheckT = t;
        c.lastCheckX = c.pos.x;
        c.lastCheckZ = c.pos.z;
      } else if (c.lastCheckT === 0) {
        c.lastCheckT = t;
        c.lastCheckX = c.pos.x;
        c.lastCheckZ = c.pos.z;
      } else if (t - c.lastCheckT > 5) {
        const dxm = c.pos.x - c.lastCheckX;
        const dzm = c.pos.z - c.lastCheckZ;
        if (dxm * dxm + dzm * dzm < 0.25) {
          for (let tryI = 0; tryI < 8; tryI++) {
            const ang = Math.random() * Math.PI * 2;
            const rad = 3 + Math.random() * 4;
            const nx = c.pos.x + Math.cos(ang) * rad;
            const nz = c.pos.z + Math.sin(ang) * rad;
            if (Math.abs(nx) < STREAM_HALF_WIDTH + 1) continue;
            if (Math.abs(nx) > 55 || Math.abs(nz) > 55) continue;
            c.pos.x = nx;
            c.pos.z = nz;
            c.pos.y = heightAt(nx, nz);
            c.heading = Math.random() * Math.PI * 2;
            break;
          }
        }
        c.lastCheckT = t;
        c.lastCheckX = c.pos.x;
        c.lastCheckZ = c.pos.z;
      }

      // Animals eat carrots they wander over (only when not chasing).
      if (!isIt) {
        const r2 = ANIMAL_EAT_RADIUS * ANIMAL_EAT_RADIUS;
        for (const carrot of survivalState.carrots) {
          if (carrot.picked) continue;
          const dx = carrot.x - c.pos.x;
          const dz = carrot.z - c.pos.z;
          if (dx * dx + dz * dz < r2) {
            carrot.picked = true;
            survivalState.version++;
          }
        }
      }
      if (child) {
        child.visible = true;
        child.position.set(c.pos.x, c.pos.y, c.pos.z);
        child.rotation.y = -c.heading + Math.PI / 2;
        // "It" animals grow to 2x size so they're easy to spot.
        const targetScale = isIt ? 2 : 1;
        child.scale.setScalar(targetScale);
        const mark = child.getObjectByName("itMark");
        if (mark) mark.visible = isIt;
        animate(child, t, c, speed);
      }
    });
  });
}

function ItMark() {
  return (
    <mesh name="itMark" position={[0, 1.05, 0]} visible={false}>
      <sphereGeometry args={[0.12, 12, 10]} />
      <meshStandardMaterial color="#ff2020" emissive="#ff2020" emissiveIntensity={2.4} toneMapped={false} />
    </mesh>
  );
}

/* -------------- RABBIT -------------- */

function RabbitMesh() {
  // Named parts so we can animate them
  return (
    <group>
      {/* body */}
      <mesh name="body" position={[0, 0.22, 0]} castShadow>
        <sphereGeometry args={[0.22, 16, 12]} />
        <meshStandardMaterial color="#c8b89a" roughness={0.95} />
      </mesh>
      {/* haunches */}
      <mesh position={[-0.14, 0.2, 0]} castShadow>
        <sphereGeometry args={[0.17, 12, 10]} />
        <meshStandardMaterial color="#b8a888" roughness={0.95} />
      </mesh>
      {/* head */}
      <mesh name="head" position={[0.22, 0.32, 0]} castShadow>
        <sphereGeometry args={[0.14, 14, 12]} />
        <meshStandardMaterial color="#d1c1a3" roughness={0.95} />
      </mesh>
      {/* cheeks */}
      <mesh position={[0.3, 0.28, 0.06]} castShadow>
        <sphereGeometry args={[0.06, 10, 8]} />
        <meshStandardMaterial color="#d1c1a3" />
      </mesh>
      <mesh position={[0.3, 0.28, -0.06]} castShadow>
        <sphereGeometry args={[0.06, 10, 8]} />
        <meshStandardMaterial color="#d1c1a3" />
      </mesh>
      {/* nose */}
      <mesh position={[0.34, 0.31, 0]} castShadow>
        <sphereGeometry args={[0.025, 8, 6]} />
        <meshStandardMaterial color="#3a2018" roughness={0.6} />
      </mesh>
      {/* eyes */}
      <mesh position={[0.28, 0.36, 0.08]}>
        <sphereGeometry args={[0.018, 8, 6]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.28, 0.36, -0.08]}>
        <sphereGeometry args={[0.018, 8, 6]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* ears */}
      <mesh name="earL" position={[0.2, 0.5, 0.07]} rotation={[0, 0, -0.15]} castShadow>
        <capsuleGeometry args={[0.028, 0.22, 4, 8]} />
        <meshStandardMaterial color="#c8b89a" />
      </mesh>
      <mesh name="earR" position={[0.2, 0.5, -0.07]} rotation={[0, 0, -0.15]} castShadow>
        <capsuleGeometry args={[0.028, 0.22, 4, 8]} />
        <meshStandardMaterial color="#c8b89a" />
      </mesh>
      {/* fluff tail */}
      <mesh position={[-0.24, 0.24, 0]} castShadow>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshStandardMaterial color="#f2ead6" roughness={1} />
      </mesh>
      {/* front paws */}
      <mesh name="pawFL" position={[0.12, 0.06, 0.08]} castShadow>
        <sphereGeometry args={[0.04, 8, 6]} />
        <meshStandardMaterial color="#b09880" />
      </mesh>
      <mesh name="pawFR" position={[0.12, 0.06, -0.08]} castShadow>
        <sphereGeometry args={[0.04, 8, 6]} />
        <meshStandardMaterial color="#b09880" />
      </mesh>
      {/* back paws */}
      <mesh name="pawBL" position={[-0.14, 0.06, 0.1]} rotation={[0, 0, 0.2]} castShadow>
        <capsuleGeometry args={[0.045, 0.08, 4, 6]} />
        <meshStandardMaterial color="#b09880" />
      </mesh>
      <mesh name="pawBR" position={[-0.14, 0.06, -0.1]} rotation={[0, 0, 0.2]} castShadow>
        <capsuleGeometry args={[0.045, 0.08, 4, 6]} />
        <meshStandardMaterial color="#b09880" />
      </mesh>
    </group>
  );
}

export function Rabbits() {
  const critters = useMemo(() => makeCritters(20, 4242, 1.2, "rabbit"), []);
  const groupRef = useRef<THREE.Group>(null);
  useEffect(() => {
    return registerCrittersForSpecies(
      "rabbit",
      critters.map((c) => ({ id: c.id, pos: c.pos, species: c.species })),
    );
  }, [critters]);
  useWander(critters, groupRef, (child, t, c) => {
    const phase = c.phase;
    const hop = Math.max(0, Math.sin(t * 5 + phase)) * 0.22;
    child.position.y += hop;
    const pitch = Math.cos(t * 5 + phase) * 0.15;
    child.rotation.x = pitch;
    const earL = child.getObjectByName("earL");
    const earR = child.getObjectByName("earR");
    if (earL) earL.rotation.z = -0.15 + Math.sin(t * 3 + phase) * 0.1;
    if (earR) earR.rotation.z = -0.15 - Math.sin(t * 3 + phase) * 0.1;
  });
  return (
    <group ref={groupRef}>
      {critters.map((_, i) => (
        <group key={i}>
          <RabbitMesh />
          <ItMark />
        </group>
      ))}
    </group>
  );
}

/* -------------- FOX -------------- */

function FoxMesh() {
  return (
    <group>
      {/* body */}
      <mesh position={[0, 0.3, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.14, 0.4, 6, 12]} />
        <meshStandardMaterial color="#c65a1e" roughness={0.9} />
      </mesh>
      {/* underbelly */}
      <mesh position={[0, 0.22, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1.02, 0.6, 0.9]} castShadow>
        <capsuleGeometry args={[0.11, 0.36, 4, 8]} />
        <meshStandardMaterial color="#f5e6cc" roughness={1} />
      </mesh>
      {/* chest ruff */}
      <mesh position={[0.22, 0.3, 0]} castShadow>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color="#d86a26" roughness={0.9} />
      </mesh>
      {/* head */}
      <mesh name="head" position={[0.36, 0.4, 0]} castShadow>
        <sphereGeometry args={[0.14, 14, 12]} />
        <meshStandardMaterial color="#d86a26" />
      </mesh>
      {/* snout */}
      <mesh position={[0.5, 0.36, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[0.06, 0.14, 8]} />
        <meshStandardMaterial color="#2a1a10" />
      </mesh>
      {/* nose tip */}
      <mesh position={[0.57, 0.37, 0]}>
        <sphereGeometry args={[0.022, 8, 6]} />
        <meshStandardMaterial color="#0a0603" />
      </mesh>
      {/* eyes */}
      <mesh position={[0.44, 0.44, 0.08]}>
        <sphereGeometry args={[0.02, 8, 6]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.44, 0.44, -0.08]}>
        <sphereGeometry args={[0.02, 8, 6]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* ears */}
      <mesh position={[0.3, 0.55, 0.09]} rotation={[0, 0, -0.2]} castShadow>
        <coneGeometry args={[0.05, 0.14, 6]} />
        <meshStandardMaterial color="#c65a1e" />
      </mesh>
      <mesh position={[0.3, 0.55, -0.09]} rotation={[0, 0, -0.2]} castShadow>
        <coneGeometry args={[0.05, 0.14, 6]} />
        <meshStandardMaterial color="#c65a1e" />
      </mesh>
      {/* ear inners */}
      <mesh position={[0.31, 0.55, 0.09]} rotation={[0, 0, -0.2]}>
        <coneGeometry args={[0.03, 0.11, 6]} />
        <meshStandardMaterial color="#2a1a10" />
      </mesh>
      <mesh position={[0.31, 0.55, -0.09]} rotation={[0, 0, -0.2]}>
        <coneGeometry args={[0.03, 0.11, 6]} />
        <meshStandardMaterial color="#2a1a10" />
      </mesh>
      {/* tail — bushy */}
      <group name="tail" position={[-0.28, 0.32, 0]} rotation={[0, 0, 0.4]}>
        <mesh position={[-0.05, 0, 0]} castShadow>
          <sphereGeometry args={[0.11, 12, 10]} />
          <meshStandardMaterial color="#c65a1e" roughness={1} />
        </mesh>
        <mesh position={[-0.18, 0.04, 0]} castShadow>
          <sphereGeometry args={[0.1, 12, 10]} />
          <meshStandardMaterial color="#d86a26" roughness={1} />
        </mesh>
        <mesh position={[-0.3, 0.08, 0]} castShadow>
          <sphereGeometry args={[0.09, 12, 10]} />
          <meshStandardMaterial color="#f5e6cc" roughness={1} />
        </mesh>
      </group>
      {/* legs */}
      {[
        ["legFL", 0.22, 0.09],
        ["legFR", 0.22, -0.09],
        ["legBL", -0.18, 0.1],
        ["legBR", -0.18, -0.1],
      ].map(([name, x, z]) => (
        <mesh key={name as string} name={name as string} position={[x as number, 0.11, z as number]} castShadow>
          <capsuleGeometry args={[0.035, 0.18, 4, 6]} />
          <meshStandardMaterial color="#2a1a10" />
        </mesh>
      ))}
    </group>
  );
}

export function Foxes() {
  const critters = useMemo(() => makeCritters(10, 7373, 1.9, "fox"), []);
  const groupRef = useRef<THREE.Group>(null);
  useEffect(() => {
    return registerCrittersForSpecies(
      "fox",
      critters.map((c) => ({ id: c.id, pos: c.pos, species: c.species })),
    );
  }, [critters]);
  useWander(critters, groupRef, (child, t, c) => {
    const phase = c.phase;
    child.position.y += Math.abs(Math.sin(t * 6 + phase)) * 0.05;
    const swing = Math.sin(t * 8 + phase) * 0.5;
    const fl = child.getObjectByName("legFL");
    const fr = child.getObjectByName("legFR");
    const bl = child.getObjectByName("legBL");
    const br = child.getObjectByName("legBR");
    if (fl) fl.rotation.z = swing;
    if (fr) fr.rotation.z = -swing;
    if (bl) bl.rotation.z = -swing;
    if (br) br.rotation.z = swing;
    const tail = child.getObjectByName("tail");
    if (tail) tail.rotation.y = Math.sin(t * 3 + phase) * 0.4;
    const head = child.getObjectByName("head");
    if (head) head.rotation.y = Math.sin(t * 1.5 + phase) * 0.15;
  });
  return (
    <group ref={groupRef}>
      {critters.map((_, i) => (
        <group key={i}>
          <FoxMesh />
          <ItMark />
        </group>
      ))}
    </group>
  );
}
