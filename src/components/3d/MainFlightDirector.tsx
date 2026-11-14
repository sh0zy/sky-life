import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { LIFE_EVENTS, OBSTACLES, CHALLENGE_STAGES } from '../../data/gameData';
import {
  LifeEventDef,
  ObstacleDef,
  ChallengeId,
  ChoiceOption,
  ObstaclePatternType,
} from '../../types/game';

interface MainFlightDirectorProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
}

interface ObstacleHazardNode {
  baseX: number;
  baseY: number;
  radiusX: number;
  radiusY: number;
  moveSpeedX: number;
  moveAmpX: number;
  moveSpeedY: number;
  moveAmpY: number;
  phaseOffset: number;
}

type EncounterData =
  | {
      type: 'choice';
      event: LifeEventDef;
    }
  | {
      type: 'forced_event';
      obstacle: ObstacleDef;
    }
  | {
      type: 'avoidable_obstacle';
      obstacle: ObstacleDef;
      pattern: ObstaclePatternType;
      nodes: ObstacleHazardNode[];
    }
  | {
      type: 'portal';
      challengeId: ChallengeId;
      title: string;
      subtitle: string;
    };

/**
 * Generates multi-obstacle 3D formations based on difficulty & chapter
 * so players must actively maneuver up/down/left/right while keeping a fair dodge path.
 */
function buildAvoidableFormation(
  difficulty: 'EASY' | 'NORMAL' | 'HARD',
  chapter: number,
  lifeDifficultyIndex = 45
): { pattern: ObstaclePatternType; nodes: ObstacleHazardNode[] } {
  const isHighEnvChallenge = lifeDifficultyIndex >= 55;
  const patterns: ObstaclePatternType[] =
    difficulty === 'EASY'
      ? isHighEnvChallenge
        ? ['single_moving', 'horizontal_pair', 'vertical_split']
        : ['single_moving', 'horizontal_pair']
      : difficulty === 'HARD'
      ? ['horizontal_pair', 'vertical_split', 'diagonal_barrage', 'slalom_triple']
      : isHighEnvChallenge
      ? ['horizontal_pair', 'vertical_split', 'diagonal_barrage', 'slalom_triple']
      : ['single_moving', 'horizontal_pair', 'vertical_split', 'diagonal_barrage'];

  const pattern = patterns[Math.floor(Math.random() * patterns.length)];
  const envSpeedFactor = 0.92 + (lifeDifficultyIndex / 100) * 0.22;
  const speedScale =
    (difficulty === 'HARD' ? 1.35 : difficulty === 'EASY' ? 0.75 : 1.0) *
    (1 + chapter * 0.08) *
    envSpeedFactor;

  if (pattern === 'single_moving') {
    return {
      pattern,
      nodes: [
        {
          baseX: (Math.random() - 0.5) * 4,
          baseY: (Math.random() - 0.5) * 2,
          radiusX: 3.1,
          radiusY: 2.3,
          moveSpeedX: 1.8 * speedScale,
          moveAmpX: 3.2,
          moveSpeedY: 1.1 * speedScale,
          moveAmpY: 1.2,
          phaseOffset: Math.random() * Math.PI * 2,
        },
      ],
    };
  }

  if (pattern === 'horizontal_pair') {
    // Two large hazards leaving either the center or outer edges open, plus vertical room
    const gapCenter = Math.random() > 0.5;
    return {
      pattern,
      nodes: gapCenter
        ? [
            {
              baseX: -5.4,
              baseY: 0.4,
              radiusX: 3.0,
              radiusY: 2.5,
              moveSpeedX: 0.9 * speedScale,
              moveAmpX: 1.0,
              moveSpeedY: 1.4 * speedScale,
              moveAmpY: 1.4,
              phaseOffset: 0,
            },
            {
              baseX: 5.4,
              baseY: -0.4,
              radiusX: 3.0,
              radiusY: 2.5,
              moveSpeedX: 0.9 * speedScale,
              moveAmpX: 1.0,
              moveSpeedY: 1.4 * speedScale,
              moveAmpY: 1.4,
              phaseOffset: Math.PI,
            },
          ]
        : [
            {
              baseX: -2.4,
              baseY: 1.2,
              radiusX: 2.9,
              radiusY: 2.2,
              moveSpeedX: 1.2 * speedScale,
              moveAmpX: 1.2,
              moveSpeedY: 0.8 * speedScale,
              moveAmpY: 0.8,
              phaseOffset: 0.5,
            },
            {
              baseX: 3.4,
              baseY: -1.4,
              radiusX: 2.9,
              radiusY: 2.2,
              moveSpeedX: 1.2 * speedScale,
              moveAmpX: 1.2,
              moveSpeedY: 0.8 * speedScale,
              moveAmpY: 0.8,
              phaseOffset: 2.2,
            },
          ],
    };
  }

  if (pattern === 'vertical_split') {
    // Upper or lower barrier requiring vertical climb or dive
    const blockTop = Math.random() > 0.5;
    return {
      pattern,
      nodes: [
        {
          baseX: -3.2,
          baseY: blockTop ? 2.4 : -1.8,
          radiusX: 3.8,
          radiusY: 2.2,
          moveSpeedX: 0.8 * speedScale,
          moveAmpX: 1.2,
          moveSpeedY: 0.6 * speedScale,
          moveAmpY: 0.5,
          phaseOffset: 0,
        },
        {
          baseX: 3.2,
          baseY: blockTop ? 2.4 : -1.8,
          radiusX: 3.8,
          radiusY: 2.2,
          moveSpeedX: 0.8 * speedScale,
          moveAmpX: 1.2,
          moveSpeedY: 0.6 * speedScale,
          moveAmpY: 0.5,
          phaseOffset: Math.PI,
        },
      ],
    };
  }

  // diagonal_barrage or slalom_triple
  return {
    pattern,
    nodes: [
      {
        baseX: -5.6,
        baseY: 2.2,
        radiusX: 2.6,
        radiusY: 2.0,
        moveSpeedX: 1.1 * speedScale,
        moveAmpX: 1.1,
        moveSpeedY: 1.1 * speedScale,
        moveAmpY: 0.9,
        phaseOffset: 0,
      },
      {
        baseX: 0,
        baseY: -1.8,
        radiusX: 2.7,
        radiusY: 2.0,
        moveSpeedX: 1.4 * speedScale,
        moveAmpX: 1.5,
        moveSpeedY: 1.0 * speedScale,
        moveAmpY: 0.9,
        phaseOffset: 1.8,
      },
      {
        baseX: 5.6,
        baseY: 2.0,
        radiusX: 2.6,
        radiusY: 2.0,
        moveSpeedX: 1.1 * speedScale,
        moveAmpX: 1.1,
        moveSpeedY: 1.1 * speedScale,
        moveAmpY: 0.9,
        phaseOffset: 3.4,
      },
    ],
  };
}

export const MainFlightDirector: React.FC<MainFlightDirectorProps> = ({ playerPosRef }) => {
  const encounterGroupRef = useRef<THREE.Group>(null);
  const hazardMeshesRef = useRef<(THREE.Group | null)[]>([]);
  const prevZRef = useRef<number>(-115);
  const zPosRef = useRef<number>(-115);
  const cooldownRef = useRef<number>(1.0);
  const resolvedCurrentRef = useRef<boolean>(false);

  const [currentEncounter, setCurrentEncounter] = useState<EncounterData | null>(null);
  const [hoveredGateIndex, setHoveredGateIndex] = useState<number>(0);

  const phase = useGameStore((s) => s.phase);

  const spawnNextEncounter = () => {
    const store = useGameStore.getState();
    const age = store.age;
    const chapter = store.chapter;
    const weights = store.schedulerWeights;

    //Spawn distance adjusted by difficulty so players have ample time to read options from afar
    const startZ =
      store.difficulty === 'EASY' ? -125 : store.difficulty === 'HARD' ? -105 : -115;

    // 1. Check Turning Point Challenge Portals first
    if (age >= 15.5 && !store.triggeredChallengeIds.includes('exam')) {
      const def = CHALLENGE_STAGES.exam;
      prevZRef.current = startZ;
      zPosRef.current = startZ;
      resolvedCurrentRef.current = false;
      setCurrentEncounter({
        type: 'portal',
        challengeId: 'exam',
        title: def.portalTitle,
        subtitle: def.stageTitle,
      });
      return;
    }

    if (age >= 26.5 && !store.triggeredChallengeIds.includes('career')) {
      const def = CHALLENGE_STAGES.career;
      prevZRef.current = startZ;
      zPosRef.current = startZ;
      resolvedCurrentRef.current = false;
      setCurrentEncounter({
        type: 'portal',
        challengeId: 'career',
        title: def.portalTitle,
        subtitle: def.stageTitle,
      });
      return;
    }

    if (age >= 44.5 && !store.triggeredChallengeIds.includes('crossroads')) {
      const def = CHALLENGE_STAGES.crossroads;
      prevZRef.current = startZ;
      zPosRef.current = startZ;
      resolvedCurrentRef.current = false;
      setCurrentEncounter({
        type: 'portal',
        challengeId: 'crossroads',
        title: def.portalTitle,
        subtitle: def.stageTitle,
      });
      return;
    }

    // 2. Check if a high-priority causal chain event is triggered (e.g., overwork fatigue chain!)
    const countryId = store.country.id;
    const countryParams = store.countryParamsMap[countryId];
    const causalChainEvent = LIFE_EVENTS.find(
      (ev) =>
        !store.usedEventIds.includes(ev.id) &&
        (!ev.countries || ev.countries.includes(countryId)) &&
        ev.chapter <= chapter &&
        ev.requiredTag &&
        store.tags.includes(ev.requiredTag)
    );
    if (causalChainEvent && age >= causalChainEvent.minAge) {
      prevZRef.current = startZ;
      zPosRef.current = startZ;
      resolvedCurrentRef.current = false;
      setCurrentEncounter({
        type: 'choice',
        event: causalChainEvent,
      });
      return;
    }

    // 3. Event Scheduler using configurable weights (A: 40%, B: 20%, C: 25%, D: 15% default)
    // Strictly preserve base category ratios! Country & social environment change the event content/conditions within each category.
    const effMandatory = Math.max(0, weights.mandatoryChoice);
    const effForced = age < 3 ? 0 : Math.max(0, weights.forcedEvent);
    const effAvoidable =
      age < 3
        ? 0
        : Math.max(
            0,
            store.difficulty === 'EASY'
              ? weights.avoidableObstacle * 0.7
              : store.difficulty === 'HARD'
              ? weights.avoidableObstacle * 1.3
              : weights.avoidableObstacle
          );
    const effRisk = Math.max(0, weights.chanceRisk);

    const totalWeight = effMandatory + effForced + effAvoidable + effRisk;
    const roll = totalWeight > 0 ? Math.random() * totalWeight : -1;

    let selectedCategory: 'A_MANDATORY' | 'B_FORCED' | 'C_AVOIDABLE' | 'D_RISK' = 'A_MANDATORY';
    if (roll < 0) {
      selectedCategory = 'A_MANDATORY';
    } else if (roll < effMandatory) {
      selectedCategory = 'A_MANDATORY';
    } else if (roll < effMandatory + effForced) {
      selectedCategory = 'B_FORCED';
    } else if (roll < effMandatory + effForced + effAvoidable) {
      selectedCategory = 'C_AVOIDABLE';
    } else {
      selectedCategory = 'D_RISK';
    }

    // Execute spawn for selected category
    if (selectedCategory === 'B_FORCED') {
      const forcedPool = OBSTACLES.filter(
        (o) =>
          o.unavoidable &&
          (!o.countries || o.countries.includes(countryId)) &&
          !store.recentEncounterIds.includes(o.id)
      );
      const tagMatched = forcedPool.find(
        (o) => o.triggerTag && store.tags.includes(o.triggerTag)
      );
      // Prefer medical cost crisis if country has high medicalCostBurden or low medicalAccess
      const envMatched = forcedPool.find(
        (o) =>
          !store.usedObstacleIds.includes(o.id) &&
          ((o.envDriver === 'medicalBurden' &&
            (countryParams.medicalCostBurden >= 58 || countryParams.medicalAccess < 68)) ||
            (o.envDriver === 'economicInstability' && countryParams.economicInstability >= 55))
      );
      const chapterPool = forcedPool.filter(
        (o) => !store.usedObstacleIds.includes(o.id) && o.chapter <= chapter + 1
      );
      const chosenForced =
        tagMatched ||
        envMatched ||
        chapterPool[Math.floor(Math.random() * chapterPool.length)] ||
        forcedPool[0] ||
        OBSTACLES.find((o) => o.unavoidable)!;

      prevZRef.current = startZ;
      zPosRef.current = startZ;
      resolvedCurrentRef.current = false;
      setCurrentEncounter({
        type: 'forced_event',
        obstacle: chosenForced,
      });
      return;
    }

    if (selectedCategory === 'C_AVOIDABLE') {
      const avoidablePool = OBSTACLES.filter(
        (o) =>
          !o.unavoidable &&
          (!o.countries || o.countries.includes(countryId)) &&
          !store.recentEncounterIds.includes(o.id)
      );

      // Prefer environment-driven obstacle when structural barrier is relevant
      const envObstacle = avoidablePool.find(
        (o) =>
          !store.usedObstacleIds.includes(o.id) &&
          o.chapter === chapter &&
          ((o.envDriver === 'educationBarrier' &&
            (countryParams.educationCostBurden >= 55 ||
              countryParams.educationAccess < 72 ||
              store.tags.includes('low_income_household'))) ||
            (o.envDriver === 'employmentGap' &&
              (countryParams.employmentOpportunity < 70 ||
                countryParams.regionalDisparity >= 55 ||
                store.tags.includes('rural_origin'))))
      );

      const chosenObs =
        envObstacle ||
        avoidablePool[Math.floor(Math.random() * avoidablePool.length)] ||
        OBSTACLES.find((o) => !o.unavoidable)!;

      const formation = buildAvoidableFormation(
        store.difficulty,
        chapter,
        store.lifeDifficultyIndex
      );
      prevZRef.current = startZ;
      zPosRef.current = startZ;
      resolvedCurrentRef.current = false;
      setCurrentEncounter({
        type: 'avoidable_obstacle',
        obstacle: chosenObs,
        pattern: formation.pattern,
        nodes: formation.nodes,
      });
      return;
    }

    // Type A (Mandatory Choice) or Type D (Chance & Risk Choice)
    const targetKind = selectedCategory === 'D_RISK' ? 'chance_risk' : 'mandatory';
    const isCountryEligible = (ev: LifeEventDef) =>
      !ev.countries || ev.countries.includes(countryId);

    // 1st priority: Unused Country-Specific Event or Structural Barrier Support Event for current chapter!
    const needsEduSupport =
      !store.tags.includes('scholarship_secured') &&
      (store.tags.includes('low_income_household') ||
        countryParams.educationCostBurden >= 56 ||
        countryParams.educationAccess < 72);
    const needsEmploymentSupport =
      !store.tags.includes('vocational_trained') &&
      (store.tags.includes('rural_origin') ||
        countryParams.regionalDisparity >= 55 ||
        countryParams.employmentOpportunity < 70);

    const priorityPool = LIFE_EVENTS.filter(
      (ev) =>
        ev.kind === targetKind &&
        isCountryEligible(ev) &&
        !store.usedEventIds.includes(ev.id) &&
        !store.recentEncounterIds.includes(ev.id) &&
        ev.chapter === chapter &&
        ((ev.countries && ev.countries.includes(countryId)) ||
          (ev.preferHighBarrier === 'educationCost' && needsEduSupport) ||
          (ev.preferHighBarrier === 'regionalGap' && needsEmploymentSupport))
    );

    let pool =
      priorityPool.length > 0
        ? priorityPool
        : LIFE_EVENTS.filter(
            (ev) =>
              ev.kind === targetKind &&
              isCountryEligible(ev) &&
              !store.usedEventIds.includes(ev.id) &&
              !store.recentEncounterIds.includes(ev.id) &&
              ev.chapter === chapter
          );

    if (pool.length === 0) {
      pool = LIFE_EVENTS.filter(
        (ev) =>
          ev.kind === targetKind &&
          isCountryEligible(ev) &&
          !store.usedEventIds.includes(ev.id) &&
          !store.recentEncounterIds.includes(ev.id)
      );
    }
    if (pool.length === 0) {
      pool = LIFE_EVENTS.filter(
        (ev) =>
          ev.kind === targetKind &&
          isCountryEligible(ev) &&
          !store.recentEncounterIds.includes(ev.id)
      );
    }
    if (pool.length === 0) {
      pool = LIFE_EVENTS.filter(
        (ev) =>
          isCountryEligible(ev) &&
          !store.usedEventIds.includes(ev.id) &&
          !store.recentEncounterIds.includes(ev.id) &&
          ev.chapter === chapter
      );
    }
    if (pool.length === 0) {
      pool = LIFE_EVENTS.filter(isCountryEligible);
    }

    const chosenEvent = pool[Math.floor(Math.random() * pool.length)] || LIFE_EVENTS[0];
    prevZRef.current = startZ;
    zPosRef.current = startZ;
    resolvedCurrentRef.current = false;
    setCurrentEncounter({
      type: 'choice',
      event: chosenEvent,
    });
  };

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const store = useGameStore.getState();

    if (store.phase !== 'PLAYING') return;

    // Advance age smoothly during flight
    const ageRate = store.isBoosting ? 1.75 : 0.98;
    store.advanceAge(dt * ageRate);

    if (!currentEncounter) {
      cooldownRef.current -= dt;
      if (cooldownRef.current <= 0) {
        spawnNextEncounter();
      }
      return;
    }

    // Speed scales with difficulty so EASY gives longer reading time and HARD is brisk
    const diffSpeedMult =
      store.difficulty === 'EASY' ? 0.82 : store.difficulty === 'HARD' ? 1.18 : 1.0;
    const baseSpeed = store.isBoosting ? 38 : 22;
    const flightSpeed = baseSpeed * diffSpeedMult;

    prevZRef.current = zPosRef.current;
    zPosRef.current += flightSpeed * dt;

    if (encounterGroupRef.current) {
      encounterGroupRef.current.position.z = zPosRef.current;
    }

    // Update live highlighted gate index based on player's X position so visual & collision match 100%
    if (currentEncounter.type === 'choice') {
      const px = playerPosRef.current.x;
      const hasCenter = Boolean(currentEncounter.event.centerChoice);
      const nextIdx = hasCenter ? (px < -2.85 ? 0 : px <= 2.85 ? 1 : 2) : px <= 0 ? 0 : 1;
      if (nextIdx !== hoveredGateIndex) {
        setHoveredGateIndex(nextIdx);
      }
    }

    // Animate moving obstacle nodes in Type C Avoidable Obstacles
    if (currentEncounter.type === 'avoidable_obstacle') {
      const t = state.clock.elapsedTime;
      currentEncounter.nodes.forEach((node, idx) => {
        const meshGroup = hazardMeshesRef.current[idx];
        if (meshGroup) {
          const curX =
            node.baseX + Math.sin(t * node.moveSpeedX + node.phaseOffset) * node.moveAmpX;
          const curY =
            node.baseY + Math.cos(t * node.moveSpeedY + node.phaseOffset) * node.moveAmpY;
          meshGroup.position.set(curX, curY, 0);
        }
      });

      if (zPosRef.current > -65 && zPosRef.current < 0) {
        const ratio = 1 - Math.abs(zPosRef.current) / 65;
        useGameStore.setState({ skyDarkness: Math.max(0, ratio * 0.5) });
      }
    }

    if (currentEncounter.type === 'forced_event' && zPosRef.current > -65 && zPosRef.current < 0) {
      const ratio = 1 - Math.abs(zPosRef.current) / 65;
      useGameStore.setState({ skyDarkness: Math.max(0, ratio * 0.7) });
    }

    // ==================== SWEPT Z-CROSSING COLLISION & ANTI-BYPASS SYSTEM ====================
    // Swept check: triggers as soon as [prevZ, zPos] crosses the Z = 0 player plane (or enters [-1.5, 2.5]).
    // Even at maximum boost speed, a frame can NEVER tunnel past Z = 0 without resolving!
    const crossedPlayerPlane =
      (prevZRef.current < 0 && zPosRef.current >= 0) ||
      (zPosRef.current >= -1.5 && zPosRef.current <= 2.5);

    if (!resolvedCurrentRef.current && crossedPlayerPlane) {
      const px = playerPosRef.current.x;
      const py = playerPosRef.current.y;

      if (currentEncounter.type === 'choice') {
        resolvedCurrentRef.current = true;
        const ev = currentEncounter.event;
        const hasCenter = Boolean(ev.centerChoice);

        // Full-sky partition: X in [-8.5, +8.5] and Y in [-3.5, +5.5] are 100% partitioned with zero gaps.
        // If player is somehow outside normal bounds (failsafe), open the Failsafe Selection Modal!
        if (!Number.isFinite(px) || !Number.isFinite(py) || Math.abs(px) > 9.5 || Math.abs(py) > 6.5) {
          setCurrentEncounter(null);
          cooldownRef.current = 1.2;
          store.triggerChoiceFailsafe(ev);
          return;
        }

        let chosenOption: ChoiceOption;
        if (hasCenter && ev.centerChoice) {
          if (px < -2.85) {
            chosenOption = ev.leftChoice;
          } else if (px <= 2.85) {
            chosenOption = ev.centerChoice;
          } else {
            chosenOption = ev.rightChoice;
          }
        } else {
          chosenOption = px <= 0 ? ev.leftChoice : ev.rightChoice;
        }

        setCurrentEncounter(null);
        cooldownRef.current = 1.2;
        store.applyChoice(ev, chosenOption);
        return;
      }

      if (currentEncounter.type === 'portal') {
        resolvedCurrentRef.current = true;
        const cid = currentEncounter.challengeId;
        setCurrentEncounter(null);
        cooldownRef.current = 1.5;
        store.enterChallengePortal(cid);
        return;
      }

      if (currentEncounter.type === 'forced_event') {
        // Type B Forced Event: unavoidable regardless of player X/Y or difficulty
        resolvedCurrentRef.current = true;
        const obs = currentEncounter.obstacle;
        setCurrentEncounter(null);
        cooldownRef.current = 1.4;
        store.triggerObstacleHit(obs);
        return;
      }

      if (currentEncounter.type === 'avoidable_obstacle') {
        // Type C Avoidable Obstacle: check against each moving 3D hazard node's current visual position
        const t = state.clock.elapsedTime;
        let hitDetected = false;

        for (let i = 0; i < currentEncounter.nodes.length; i++) {
          const node = currentEncounter.nodes[i];
          const curX =
            node.baseX + Math.sin(t * node.moveSpeedX + node.phaseOffset) * node.moveAmpX;
          const curY =
            node.baseY + Math.cos(t * node.moveSpeedY + node.phaseOffset) * node.moveAmpY;

          if (Math.abs(px - curX) < node.radiusX && Math.abs(py - curY) < node.radiusY) {
            hitDetected = true;
            break;
          }
        }

        if (hitDetected) {
          resolvedCurrentRef.current = true;
          const obs = currentEncounter.obstacle;
          setCurrentEncounter(null);
          cooldownRef.current = 1.4;
          store.triggerObstacleHit(obs);
          return;
        } else if (zPosRef.current > 1.6) {
          resolvedCurrentRef.current = true;
          const obs = currentEncounter.obstacle;
          setCurrentEncounter(null);
          cooldownRef.current = 1.1;
          store.applyObstacleDodge(obs);
          return;
        }
      }
    }

    // Secondary Failsafe: if a choice or forced event somehow reached z > 3 without resolving, force modal!
    if (!resolvedCurrentRef.current && zPosRef.current > 3.0) {
      resolvedCurrentRef.current = true;
      if (currentEncounter.type === 'choice') {
        const ev = currentEncounter.event;
        setCurrentEncounter(null);
        cooldownRef.current = 1.2;
        store.triggerChoiceFailsafe(ev);
        return;
      }
      if (currentEncounter.type === 'forced_event') {
        const obs = currentEncounter.obstacle;
        setCurrentEncounter(null);
        cooldownRef.current = 1.4;
        store.triggerObstacleHit(obs);
        return;
      }
      if (currentEncounter.type === 'avoidable_obstacle') {
        const obs = currentEncounter.obstacle;
        setCurrentEncounter(null);
        cooldownRef.current = 1.1;
        store.applyObstacleDodge(obs);
        return;
      }
    }
  });

  if (phase !== 'PLAYING' || !currentEncounter) return null;

  const renderChoiceGateWall = (ev: LifeEventDef) => {
    const options: ChoiceOption[] = ev.centerChoice
      ? [ev.leftChoice, ev.centerChoice, ev.rightChoice]
      : [ev.leftChoice, ev.rightChoice];

    const isThree = options.length === 3;
    // Full sky width [-9.6, +9.6] and height [-5.2, +6.8] covered with zero gaps!
    const gateWidth = isThree ? 6.2 : 9.4;
    const gateHeight = 11.6;
    const xPositions = isThree ? [-6.3, 0, 6.3] : [-4.75, 4.75];

    return (
      <group>
        {/* Top & Bottom Energy Barrier Beams sealing the entire sky corridor */}
        <mesh position={[0, 6.6, 0]}>
          <boxGeometry args={[20.5, 0.45, 0.6]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0, -4.9, 0]}>
          <boxGeometry args={[20.5, 0.45, 0.6]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.8} />
        </mesh>

        {/* Event Category & Title Header */}
        <Html position={[0, 6.9, 0]} center distanceFactor={34} zIndexRange={[10, 0]}>
          <div className="pointer-events-none select-none whitespace-nowrap px-6 py-2 rounded-full bg-slate-950/92 border-2 border-sky-400/70 text-center shadow-2xl">
            <div className="text-xs font-black tracking-widest text-amber-300 uppercase">
              {ev.kind === 'chance_risk'
                ? '🎲 D. チャンスとリスクの決断（回避不可・いずれかを選択）'
                : '⚖️ A. 人生の必須選択ゲート（回避不可・いずれかを選択）'}
            </div>
            <div className="text-lg md:text-2xl font-black text-white mt-0.5">{ev.title}</div>
          </div>
        </Html>

        {options.map((opt, idx) => {
          const isTargeted = hoveredGateIndex === idx;
          const xPos = xPositions[idx];
          return (
            <group key={opt.id} position={[xPos, 0.85, 0]}>
              {/* Full-Height Rectangular Gate Frame covering the entire vertical & horizontal lane */}
              <mesh>
                <boxGeometry args={[gateWidth, gateHeight, 0.35]} />
                <meshBasicMaterial
                  color={opt.color}
                  transparent
                  opacity={isTargeted ? 0.34 : 0.16}
                />
              </mesh>

              {/* Glowing Gate Pillar Borders */}
              <mesh position={[-gateWidth / 2, 0, 0]}>
                <boxGeometry args={[0.28, gateHeight, 0.5]} />
                <meshStandardMaterial
                  color={opt.color}
                  emissive={opt.color}
                  emissiveIntensity={isTargeted ? 1.1 : 0.45}
                />
              </mesh>
              <mesh position={[gateWidth / 2, 0, 0]}>
                <boxGeometry args={[0.28, gateHeight, 0.5]} />
                <meshStandardMaterial
                  color={opt.color}
                  emissive={opt.color}
                  emissiveIntensity={isTargeted ? 1.1 : 0.45}
                />
              </mesh>

              {/* High-Visibility Early Preview Card (Readable from far away!) */}
              <Html position={[0, 0, 0]} center distanceFactor={34} zIndexRange={[10, 0]}>
                <div
                  className={`pointer-events-none select-none w-64 md:w-72 p-4 rounded-2xl text-center shadow-2xl border-2 transition-transform ${
                    isTargeted ? 'scale-105 ring-4 ring-white/50' : 'opacity-90'
                  }`}
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.94)',
                    borderColor: opt.color,
                  }}
                >
                  {isTargeted && (
                    <div className="mb-1 inline-block px-3 py-0.5 rounded-full text-[11px] font-black bg-amber-400 text-slate-950">
                      🎯 現在の進路（この選択肢へ突入）
                    </div>
                  )}
                  <div className="text-3xl mb-1">{opt.icon}</div>
                  <div className="text-base md:text-lg font-black text-white leading-snug">
                    {opt.label}
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">{opt.subLabel}</div>

                  {/* Pros & Cons Forecast */}
                  <div className="mt-2.5 space-y-1 text-left bg-slate-900/90 p-2.5 rounded-xl border border-white/10">
                    <div className="text-xs font-extrabold text-emerald-300 leading-tight">
                      ⭕ メリット: {opt.prosText}
                    </div>
                    <div className="text-xs font-extrabold text-rose-300 leading-tight">
                      ⚠️ 代償/リスク: {opt.consText}
                    </div>
                    {opt.riskBadge && (
                      <div className="text-[11px] font-black text-amber-300 pt-0.5">
                        {opt.riskBadge}
                      </div>
                    )}
                    {(opt.supportUsedLabel || opt.environmentDifficultyMod) && (
                      <div className="text-[11px] font-black text-sky-300 pt-0.5">
                        🏛️ {opt.supportUsedLabel || '社会環境変化'}{' '}
                        {opt.environmentDifficultyMod
                          ? `（環境難易度 ${opt.environmentDifficultyMod > 0 ? `+${opt.environmentDifficultyMod}` : opt.environmentDifficultyMod}）`
                          : ''}
                      </div>
                    )}
                  </div>
                </div>
              </Html>
            </group>
          );
        })}
      </group>
    );
  };

  return (
    <group ref={encounterGroupRef} position={[0, 0, zPosRef.current]}>
      {/* ==================== 1. TYPE A & D: FULL-CORRIDOR CHOICE GATES ==================== */}
      {currentEncounter.type === 'choice' && renderChoiceGateWall(currentEncounter.event)}

      {/* ==================== 2. TYPE B: FORCED LIFE EVENT CURTAIN ==================== */}
      {currentEncounter.type === 'forced_event' && (
        <group>
          <mesh position={[0, 0.8, 0]}>
            <boxGeometry args={[24, 14, 1.5]} />
            <meshStandardMaterial
              color={currentEncounter.obstacle.color}
              transparent
              opacity={0.58}
              roughness={0.3}
            />
          </mesh>
          <Html position={[0, 1.5, 0]} center distanceFactor={34} zIndexRange={[10, 0]}>
            <div className="pointer-events-none select-none w-80 md:w-96 p-5 rounded-3xl bg-rose-950/95 border-2 border-amber-400 text-center shadow-2xl">
              <div className="text-xs font-black text-amber-300 uppercase tracking-widest">
                ⚡ {currentEncounter.obstacle.categoryLabel}（回避不可）
              </div>
              <div className="text-xl md:text-2xl font-black text-white mt-1">
                {currentEncounter.obstacle.title}
              </div>
              <div className="text-xs md:text-sm text-rose-200 mt-1">
                {currentEncounter.obstacle.subtitle}
              </div>
              <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-amber-200">
                到達時に飛行が一時停止し、対処方法を選択します
              </div>
            </div>
          </Html>
        </group>
      )}

      {/* ==================== 3. TYPE C: MULTI-NODE AVOIDABLE 3D OBSTACLES ==================== */}
      {currentEncounter.type === 'avoidable_obstacle' && (
        <group>
          <Html position={[0, 6.2, 0]} center distanceFactor={34} zIndexRange={[10, 0]}>
            <div className="pointer-events-none select-none w-80 p-3 rounded-2xl bg-slate-950/90 border-2 border-red-400 text-center shadow-2xl">
              <div className="text-xs font-extrabold text-red-300 uppercase">
                🌪️ {currentEncounter.obstacle.categoryLabel}（操作で隙間へ回避せよ！）
              </div>
              <div className="text-base md:text-lg font-black text-white mt-0.5">
                {currentEncounter.obstacle.title}
              </div>
            </div>
          </Html>

          {currentEncounter.nodes.map((node, idx) => (
            <group
              key={idx}
              ref={(el) => {
                hazardMeshesRef.current[idx] = el;
              }}
              position={[node.baseX, node.baseY, 0]}
            >
              <mesh>
                <dodecahedronGeometry args={[node.radiusX * 0.88, 1]} />
                <meshStandardMaterial
                  color="#1e293b"
                  emissive={currentEncounter.obstacle.color}
                  emissiveIntensity={0.45}
                  roughness={0.5}
                />
              </mesh>
              <mesh>
                <torusGeometry args={[node.radiusX * 0.96, 0.16, 12, 32]} />
                <meshBasicMaterial color={currentEncounter.obstacle.color} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* ==================== 4. TURNING POINT CHALLENGE PORTAL ==================== */}
      {currentEncounter.type === 'portal' && (
        <group position={[0, 0.5, 0]}>
          <mesh>
            <torusGeometry args={[5.5, 0.45, 20, 60]} />
            <meshStandardMaterial
              color="#fde047"
              emissive="#f59e0b"
              emissiveIntensity={0.9}
            />
          </mesh>
          <mesh>
            <circleGeometry args={[5.2, 40]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent
              opacity={0.32}
              side={THREE.DoubleSide}
            />
          </mesh>
          <Html position={[0, 0, 0]} center distanceFactor={30} zIndexRange={[10, 0]}>
            <div className="pointer-events-none select-none w-80 p-4 rounded-3xl bg-indigo-950/90 border-2 border-amber-300 text-center shadow-2xl">
              <div className="text-xs font-black tracking-widest text-amber-300 uppercase">
                ✨ SPECIAL TURNING POINT ✨
              </div>
              <div className="text-xl font-black text-white mt-1">
                {currentEncounter.title}
              </div>
              <div className="text-sm text-sky-200 mt-1 font-bold">
                「{currentEncounter.subtitle}」へ突入！
              </div>
            </div>
          </Html>
        </group>
      )}
    </group>
  );
};
