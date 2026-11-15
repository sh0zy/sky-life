import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { clampPlayerToCameraFrustum } from '../../utils/viewportFlightBounds';

interface PlayerCharacterProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
}

export const PlayerCharacter: React.FC<PlayerCharacterProps> = ({ playerPosRef }) => {
  const groupRef = useRef<THREE.Group>(null);
  const leftWingRef = useRef<THREE.Mesh>(null);
  const rightWingRef = useRef<THREE.Mesh>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Mesh>(null);

  const velocityRef = useRef(new THREE.Vector2(0, 0));

  const age = useGameStore((s) => s.age);
  const phase = useGameStore((s) => s.phase);
  const growthFlash = useGameStore((s) => s.growthFlash);

  // Determine character stage appearance from age
  const stageConfig = useMemo(() => {
    if (age < 7) {
      return {
        stage: 'baby',
        label: '幼児期',
        scale: 0.78,
        outfitColor: '#fef08a', // Soft baby yellow/pastel
        capeColor: '#38bdf8',
        wingColor: '#ffffff',
        hasBackpack: false,
        hasTie: false,
        hasCrownHalo: true,
        hairColor: '#78350f',
      };
    }
    if (age < 18) {
      return {
        stage: 'student',
        label: '学生期',
        scale: 0.92,
        outfitColor: '#2563eb', // Student navy/blue uniform
        capeColor: '#60a5fa',
        wingColor: '#e0f2fe',
        hasBackpack: true,
        hasTie: false,
        hasCrownHalo: false,
        hairColor: '#451a03',
      };
    }
    if (age < 30) {
      return {
        stage: 'youth',
        label: '青年期',
        scale: 1.05,
        outfitColor: '#4f46e5', // Dynamic indigo jacket
        capeColor: '#f43f5e',
        wingColor: '#bae6fd',
        hasBackpack: false,
        hasTie: true,
        hasCrownHalo: false,
        hairColor: '#27272a',
      };
    }
    if (age < 60) {
      return {
        stage: 'adult',
        label: '成人期',
        scale: 1.12,
        outfitColor: '#0f766e', // Mature teal/emerald coat
        capeColor: '#f59e0b',
        wingColor: '#fef3c7',
        hasBackpack: false,
        hasTie: true,
        hasCrownHalo: false,
        hairColor: '#3f3f46',
      };
    }
    return {
      stage: 'senior',
      label: '老年期',
      scale: 1.06,
      outfitColor: '#7c2d12', // Warm golden/burgundy sage robe
      capeColor: '#fbbf24',
      wingColor: '#fef08a',
      hasBackpack: false,
      hasTie: false,
      hasCrownHalo: true,
      hairColor: '#e4e4e7', // Silver hair
    };
  }, [age]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);

    const store = useGameStore.getState();
    const bounds = store.flightBounds;
    const isMovingAllowed =
      store.phase === 'PLAYING' || store.phase === 'CHALLENGE_PLAYING';

    // Separate PC vs Mobile sensitivity & scale velocity with screen frustum width
    const isTouchOrMobile = bounds.isMobile || store.inputSource === 'touch';
    const sensitivity = isTouchOrMobile ? store.mobileSensitivity : store.pcSensitivity;
    const portraitWidthScale = bounds.isMobilePortrait ? 0.72 : bounds.isMobileLandscape ? 0.88 : 1.0;
    const portraitHeightScale = bounds.isMobilePortrait ? 0.82 : bounds.isMobileLandscape ? 0.88 : 1.0;

    const maxSpeedX = 13.5 * sensitivity * portraitWidthScale;
    const maxSpeedY = 10.5 * sensitivity * portraitHeightScale;

    const targetVelX = isMovingAllowed ? store.inputVector.x * maxSpeedX : 0;
    const targetVelY = isMovingAllowed ? store.inputVector.y * maxSpeedY : 0;

    // Frame-rate independent smooth acceleration & crisp deceleration on release (no excessive inertia)
    const hasInputX = Math.abs(store.inputVector.x) > 0.001;
    const hasInputY = Math.abs(store.inputVector.y) > 0.001;
    const dampX = 1 - Math.exp(-(hasInputX ? 10.0 : 16.5) * dt);
    const dampY = 1 - Math.exp(-(hasInputY ? 10.0 : 16.5) * dt);

    velocityRef.current.x = THREE.MathUtils.lerp(velocityRef.current.x, targetVelX, dampX);
    velocityRef.current.y = THREE.MathUtils.lerp(velocityRef.current.y, targetVelY, dampY);

    if (!hasInputX && Math.abs(velocityRef.current.x) < 0.05) velocityRef.current.x = 0;
    if (!hasInputY && Math.abs(velocityRef.current.y) < 0.05) velocityRef.current.y = 0;

    if (isMovingAllowed) {
      playerPosRef.current.x += velocityRef.current.x * dt;
      playerPosRef.current.y += velocityRef.current.y * dt;

      // Clamp to dynamic frustum bounds AND verify with actual Three.js Camera matrices
      clampPlayerToCameraFrustum(
        playerPosRef.current,
        state.camera,
        bounds,
        stageConfig.scale
      );

      // Zero outward velocity if touching boundary so reversing direction is instant
      if (
        (playerPosRef.current.x <= bounds.minX + 0.01 && velocityRef.current.x < 0) ||
        (playerPosRef.current.x >= bounds.maxX - 0.01 && velocityRef.current.x > 0)
      ) {
        velocityRef.current.x = 0;
      }
      if (
        (playerPosRef.current.y <= bounds.minY + 0.01 && velocityRef.current.y < 0) ||
        (playerPosRef.current.y >= bounds.maxY - 0.01 && velocityRef.current.y > 0)
      ) {
        velocityRef.current.y = 0;
      }
    } else if (store.phase === 'TITLE' || store.phase === 'BIRTH_SELECT' || store.phase === 'BIRTH_INTRO') {
      playerPosRef.current.x = THREE.MathUtils.lerp(playerPosRef.current.x, 0, 1 - Math.exp(-3 * dt));
      playerPosRef.current.y = THREE.MathUtils.lerp(
        playerPosRef.current.y,
        Math.sin(state.clock.elapsedTime * 2) * 0.45,
        1 - Math.exp(-3 * dt)
      );
    } else {
      // Even while paused or in a modal, ensure player remains clamped if viewport rotated/resized
      clampPlayerToCameraFrustum(
        playerPosRef.current,
        state.camera,
        bounds,
        stageConfig.scale
      );
    }

    // Bobbing motion
    const bobOffset = Math.sin(state.clock.elapsedTime * (store.isBoosting ? 9 : 4.5)) * 0.14;

    groupRef.current.position.set(
      playerPosRef.current.x,
      playerPosRef.current.y + bobOffset,
      0
    );

    // Banking & pitch rotation based on velocity
    const targetRoll = -velocityRef.current.x * 0.055;
    const targetPitch = -0.55 + velocityRef.current.y * 0.045 - (store.isBoosting ? 0.25 : 0);

    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRoll, dt * 8);
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetPitch, dt * 8);

    // Wing flap animation
    const flapSpeed = store.isBoosting ? 18 : 9;
    const flapAngle = Math.sin(state.clock.elapsedTime * flapSpeed) * 0.38;
    if (leftWingRef.current && rightWingRef.current) {
      leftWingRef.current.rotation.z = flapAngle + 0.2;
      rightWingRef.current.rotation.z = -flapAngle - 0.2;
    }

    // Growth aura or boost aura pulse
    if (auraRef.current) {
      const showAura = store.growthFlash || store.isBoosting;
      auraRef.current.visible = showAura;
      if (showAura) {
        const s = 1.6 + Math.sin(state.clock.elapsedTime * 15) * 0.25;
        auraRef.current.scale.set(s, s, s);
      }
    }

    if (trailRef.current) {
      trailRef.current.scale.y = store.isBoosting ? 2.4 : 1.0;
    }
  });

  return (
    <group ref={groupRef}>
      <group scale={stageConfig.scale}>
        {/* Growth / Boost Energy Sphere */}
        <mesh ref={auraRef} visible={growthFlash}>
          <sphereGeometry args={[1.2, 20, 20]} />
          <meshBasicMaterial
            color={growthFlash ? '#fef08a' : '#38bdf8'}
            transparent
            opacity={growthFlash ? 0.55 : 0.28}
          />
        </mesh>

        {/* Head */}
        <mesh position={[0, 0.85, 0]} castShadow>
          <sphereGeometry args={[0.38, 20, 20]} />
          <meshToonMaterial color="#fde68a" />
        </mesh>

        {/* Hair / Cap */}
        <mesh position={[0, 1.02, -0.04]} castShadow>
          <sphereGeometry args={[0.36, 16, 16]} />
          <meshToonMaterial color={stageConfig.hairColor} />
        </mesh>

        {/* Torso / Outfit */}
        <mesh position={[0, 0.15, 0]} castShadow>
          <capsuleGeometry args={[0.32, 0.65, 12, 16]} />
          <meshToonMaterial color={stageConfig.outfitColor} />
        </mesh>

        {/* Student Backpack */}
        {stageConfig.hasBackpack && (
          <mesh position={[0, 0.2, 0.32]} castShadow>
            <boxGeometry args={[0.45, 0.52, 0.25]} />
            <meshToonMaterial color="#dc2626" />
          </mesh>
        )}

        {/* Youth / Adult Scarf or Tie Accent */}
        {stageConfig.hasTie && (
          <mesh position={[0, 0.45, 0.25]} castShadow>
            <boxGeometry args={[0.5, 0.16, 0.35]} />
            <meshToonMaterial color={stageConfig.capeColor} />
          </mesh>
        )}

        {/* Baby / Senior Golden Halo Ring */}
        {stageConfig.hasCrownHalo && (
          <mesh position={[0, 1.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.35, 0.045, 12, 24]} />
            <meshBasicMaterial color="#fde047" />
          </mesh>
        )}

        {/* Flowing Sky Cape */}
        <mesh position={[0, 0.1, 0.34]} rotation={[0.35, 0, 0]}>
          <boxGeometry args={[0.68, 0.95, 0.06]} />
          <meshToonMaterial color={stageConfig.capeColor} />
        </mesh>

        {/* Left Wing */}
        <group position={[-0.3, 0.35, 0.2]}>
          <mesh ref={leftWingRef} position={[-0.55, 0, 0]} castShadow>
            <boxGeometry args={[1.1, 0.1, 0.48]} />
            <meshToonMaterial color={stageConfig.wingColor} />
          </mesh>
        </group>

        {/* Right Wing */}
        <group position={[0.3, 0.35, 0.2]}>
          <mesh ref={rightWingRef} position={[0.55, 0, 0]} castShadow>
            <boxGeometry args={[1.1, 0.1, 0.48]} />
            <meshToonMaterial color={stageConfig.wingColor} />
          </mesh>
        </group>

        {/* Arms */}
        <mesh position={[-0.46, 0.35, -0.2]} rotation={[0.8, 0, -0.2]}>
          <capsuleGeometry args={[0.1, 0.45, 8, 12]} />
          <meshToonMaterial color={stageConfig.outfitColor} />
        </mesh>
        <mesh position={[0.46, 0.35, -0.2]} rotation={[0.8, 0, 0.2]}>
          <capsuleGeometry args={[0.1, 0.45, 8, 12]} />
          <meshToonMaterial color={stageConfig.outfitColor} />
        </mesh>

        {/* Legs */}
        <mesh position={[-0.16, -0.55, 0.15]} rotation={[-0.2, 0, 0]}>
          <capsuleGeometry args={[0.11, 0.48, 8, 12]} />
          <meshToonMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0.16, -0.55, 0.15]} rotation={[-0.2, 0, 0]}>
          <capsuleGeometry args={[0.11, 0.48, 8, 12]} />
          <meshToonMaterial color="#1e293b" />
        </mesh>

        {/* Wind Jet Trail behind feet */}
        {(phase === 'PLAYING' || phase === 'CHALLENGE_PLAYING') && (
          <mesh ref={trailRef} position={[0, -0.95, 0.4]} rotation={[0.2, 0, 0]}>
            <coneGeometry args={[0.28, 1.4, 12]} />
            <meshBasicMaterial color="#7dd3fc" transparent opacity={0.45} />
          </mesh>
        )}
      </group>
    </group>
  );
};
