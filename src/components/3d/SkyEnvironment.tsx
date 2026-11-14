import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { CHAPTERS } from '../../data/gameData';

interface SkyEnvironmentProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
}

interface SceneryElement {
  id: number;
  x: number;
  y: number;
  z: number;
  scale: number;
  speedMultiplier: number;
  variant: 'cloud' | 'island';
}

export const SkyEnvironment: React.FC<SkyEnvironmentProps> = ({ playerPosRef }) => {
  const { scene, camera } = useThree();
  const cloudsGroupRef = useRef<THREE.Group>(null);
  const islandsGroupRef = useRef<THREE.Group>(null);
  const windLinesRef = useRef<THREE.Group>(null);

  const chapter = useGameStore((s) => s.chapter);
  const phase = useGameStore((s) => s.phase);
  const activeChallengeId = useGameStore((s) => s.activeChallengeId);
  const skyDarkness = useGameStore((s) => s.skyDarkness);

  const chapterInfo = CHAPTERS[chapter];

  // Generate pool of clouds and floating islands/buildings
  const clouds = useMemo<SceneryElement[]>(() => {
    return Array.from({ length: 28 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 75,
      y: (Math.random() - 0.5) * 28 - 4,
      z: -Math.random() * 190,
      scale: 1.2 + Math.random() * 2.5,
      speedMultiplier: 0.85 + Math.random() * 0.4,
      variant: 'cloud',
    }));
  }, []);

  const islands = useMemo<SceneryElement[]>(() => {
    return Array.from({ length: 14 }, (_, i) => ({
      id: i,
      x: (i % 2 === 0 ? -1 : 1) * (14 + Math.random() * 22),
      y: -8 - Math.random() * 10,
      z: -i * 15 - Math.random() * 10,
      scale: 1.5 + Math.random() * 2.0,
      speedMultiplier: 1.0,
      variant: 'island',
    }));
  }, []);

  const windStreaks = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 28,
      y: (Math.random() - 0.5) * 16,
      z: -Math.random() * 90,
    }));
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const store = useGameStore.getState();
    store.decayEffects(dt);

    const isFlying =
      store.phase === 'PLAYING' ||
      store.phase === 'CHALLENGE_PLAYING' ||
      store.phase === 'TITLE' ||
      store.phase === 'BIRTH_SELECT' ||
      store.phase === 'BIRTH_INTRO';

    const baseSpeed = store.phase === 'CHALLENGE_PLAYING' ? 32 : 23;
    const speed = isFlying ? (store.isBoosting ? baseSpeed * 1.75 : baseSpeed) : 3;

    // Update background & fog color smoothly based on chapter, challenge, and obstacle darkness
    let targetBgHex = chapterInfo.skyTopColor;
    let targetFogHex = chapterInfo.fogColor;

    if (store.phase === 'CHALLENGE_PLAYING' || store.phase === 'CHALLENGE_INTRO') {
      if (store.activeChallengeId === 'exam') {
        targetBgHex = '#1e3a8a';
        targetFogHex = '#60a5fa';
      } else if (store.activeChallengeId === 'career') {
        targetBgHex = '#0f172a';
        targetFogHex = '#38bdf8';
      } else {
        targetBgHex = '#3b0764';
        targetFogHex = '#f472b6';
      }
    }

    const bgColor = new THREE.Color(targetBgHex);
    const fogColor = new THREE.Color(targetFogHex);

    if (store.skyDarkness > 0.01) {
      const stormColor = new THREE.Color('#0f172a');
      bgColor.lerp(stormColor, store.skyDarkness * 0.7);
      fogColor.lerp(stormColor, store.skyDarkness * 0.7);
    }

    scene.background = bgColor;
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(fogColor);
    }

    // Move clouds toward camera
    if (cloudsGroupRef.current) {
      cloudsGroupRef.current.children.forEach((child, idx) => {
        const meta = clouds[idx];
        child.position.z += speed * meta.speedMultiplier * dt;
        if (child.position.z > 15) {
          child.position.z = -180 - Math.random() * 25;
          child.position.x = (Math.random() - 0.5) * 75;
          child.position.y = (Math.random() - 0.5) * 26 - 3;
        }
      });
    }

    // Move floating islands / buildings
    if (islandsGroupRef.current) {
      islandsGroupRef.current.children.forEach((child, idx) => {
        child.position.z += speed * dt;
        if (child.position.z > 18) {
          child.position.z = -195 - Math.random() * 20;
        }
      });
    }

    // Move speed wind streaks
    if (windLinesRef.current) {
      const windSpeed = store.isBoosting ? speed * 2.4 : speed * 1.4;
      windLinesRef.current.children.forEach((child) => {
        child.position.z += windSpeed * dt;
        if (child.position.z > 12) {
          child.position.z = -85 - Math.random() * 15;
          child.position.x = (Math.random() - 0.5) * 26;
          child.position.y = (Math.random() - 0.5) * 16;
        }
      });
    }

    // Camera follow player smoothly + FOV boost + obstacle shake
    const targetCamX = playerPosRef.current.x * 0.48;
    const targetCamY = playerPosRef.current.y * 0.45 + 1.85;
    const targetCamZ = store.isBoosting ? 7.2 : 6.4;

    const shakeX = (Math.random() - 0.5) * store.cameraShake * 0.55;
    const shakeY = (Math.random() - 0.5) * store.cameraShake * 0.55;

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX + shakeX, dt * 6);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY + shakeY, dt * 6);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, dt * 5);

    const lookX = playerPosRef.current.x * 0.3;
    const lookY = playerPosRef.current.y * 0.3 + 0.4;
    camera.lookAt(lookX, lookY, -12);

    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov = store.isBoosting ? 74 : store.phase === 'CHALLENGE_PLAYING' ? 66 : 58;
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, dt * 6);
      camera.updateProjectionMatrix();
    }
  });

  const showStars =
    chapter === 5 ||
    phase === 'ENDING' ||
    (phase === 'CHALLENGE_PLAYING' && activeChallengeId === 'crossroads');

  return (
    <>
      <fog attach="fog" args={[chapterInfo.fogColor, 30, 175]} />

      {/* Cinematic Lighting */}
      <ambientLight intensity={skyDarkness > 0.3 ? 0.55 : 0.85} />
      <directionalLight
        position={[18, 30, 15]}
        intensity={skyDarkness > 0.3 ? 0.8 : 1.45}
        color={chapter === 5 ? '#fdba74' : '#ffffff'}
        castShadow
      />
      <hemisphereLight
        args={[chapterInfo.skyTopColor, chapterInfo.groundColor, 0.65]}
      />

      {/* Stars for Sunset/Senior Chapter or Crossroads Challenge */}
      {showStars && (
        <Stars radius={90} depth={60} count={2500} factor={4} saturation={0.5} fade speed={1.5} />
      )}

      {/* Subtle atmospheric sparkles */}
      <Sparkles
        count={65}
        scale={[30, 18, 50]}
        position={[0, 0, -20]}
        size={2.5}
        speed={0.6}
        color={chapter === 5 ? '#fde047' : '#bae6fd'}
      />

      {/* Soft Fluffy Clouds */}
      <group ref={cloudsGroupRef}>
        {clouds.map((c) => (
          <group key={c.id} position={[c.x, c.y, c.z]} scale={c.scale}>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[1.3, 12, 12]} />
              <meshLambertMaterial
                color={skyDarkness > 0.3 ? '#64748b' : chapter === 5 ? '#fed7aa' : '#ffffff'}
                transparent
                opacity={0.86}
              />
            </mesh>
            <mesh position={[1.1, -0.2, 0.2]}>
              <sphereGeometry args={[0.95, 10, 10]} />
              <meshLambertMaterial
                color={skyDarkness > 0.3 ? '#64748b' : chapter === 5 ? '#fed7aa' : '#f8fafc'}
                transparent
                opacity={0.82}
              />
            </mesh>
            <mesh position={[-1.1, -0.25, -0.1]}>
              <sphereGeometry args={[0.9, 10, 10]} />
              <meshLambertMaterial
                color={skyDarkness > 0.3 ? '#64748b' : chapter === 5 ? '#fed7aa' : '#f8fafc'}
                transparent
                opacity={0.82}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Floating Islands & Chapter-Themed Landmarks */}
      <group ref={islandsGroupRef}>
        {islands.map((isl) => (
          <group key={isl.id} position={[isl.x, isl.y, isl.z]} scale={isl.scale}>
            {/* Floating Island Base */}
            <mesh position={[0, -1.2, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[2.6, 3.2, 7]} />
              <meshLambertMaterial color="#78716c" />
            </mesh>
            <mesh position={[0, 0.45, 0]}>
              <cylinderGeometry args={[2.65, 2.5, 0.4, 7]} />
              <meshLambertMaterial color={chapterInfo.groundColor} />
            </mesh>

            {/* Chapter-specific scenery on top of floating islands */}
            {chapter === 1 && (
              // Green trees & warm nature
              <group position={[0, 1.2, 0]}>
                <mesh position={[0, 0.7, 0]}>
                  <coneGeometry args={[1.1, 2.2, 8]} />
                  <meshLambertMaterial color="#22c55e" />
                </mesh>
                <mesh position={[0, -0.4, 0]}>
                  <cylinderGeometry args={[0.25, 0.3, 0.9, 8]} />
                  <meshLambertMaterial color="#78350f" />
                </mesh>
              </group>
            )}

            {chapter === 2 && (
              // School / Town buildings
              <group position={[0, 1.3, 0]}>
                <mesh position={[0, 0.4, 0]}>
                  <boxGeometry args={[2.2, 1.6, 1.4]} />
                  <meshLambertMaterial color="#fef3c7" />
                </mesh>
                <mesh position={[0, 1.4, 0]} rotation={[0, Math.PI / 4, 0]}>
                  <coneGeometry args={[1.8, 0.9, 4]} />
                  <meshLambertMaterial color="#ef4444" />
                </mesh>
              </group>
            )}

            {chapter === 3 && (
              // Futuristic urban towers
              <group position={[0, 2.2, 0]}>
                <mesh position={[-0.5, 0.5, 0]}>
                  <boxGeometry args={[1.1, 4.2, 1.1]} />
                  <meshLambertMaterial color="#38bdf8" />
                </mesh>
                <mesh position={[0.7, -0.2, 0.3]}>
                  <boxGeometry args={[0.95, 2.8, 0.95]} />
                  <meshLambertMaterial color="#818cf8" />
                </mesh>
              </group>
            )}

            {chapter === 4 && (
              // Bridges, monuments & mature world domes
              <group position={[0, 1.4, 0]}>
                <mesh position={[0, 0.6, 0]}>
                  <dodecahedronGeometry args={[1.35]} />
                  <meshLambertMaterial color="#2dd4bf" />
                </mesh>
              </group>
            )}

            {chapter === 5 && (
              // Golden sunset torii/sanctuary pillars & warm lanterns
              <group position={[0, 1.5, 0]}>
                <mesh position={[0, 0.7, 0]}>
                  <octahedronGeometry args={[1.2]} />
                  <meshBasicMaterial color="#fbbf24" />
                </mesh>
              </group>
            )}
          </group>
        ))}
      </group>

      {/* Wind Speed Streaks */}
      <group ref={windLinesRef}>
        {windStreaks.map((w) => (
          <mesh key={w.id} position={[w.x, w.y, w.z]}>
            <boxGeometry args={[0.04, 0.04, 3.8]} />
            <meshBasicMaterial color="#e0f2fe" transparent opacity={0.35} />
          </mesh>
        ))}
      </group>
    </>
  );
};
