import React, { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { SkyEnvironment } from './SkyEnvironment';
import { PlayerCharacter } from './PlayerCharacter';
import { MainFlightDirector } from './MainFlightDirector';
import { ChallengeStageDirector } from './ChallengeStageDirector';
import { useGameStore } from '../../store/useGameStore';

export const GameCanvas: React.FC = () => {
  const playerPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const updateViewportSize = useGameStore((s) => s.updateViewportSize);

  useEffect(() => {
    const handleResize = () => {
      updateViewportSize(window.innerWidth, window.innerHeight);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [updateViewportSize]);

  return (
    <div className="fixed inset-0 w-full h-full z-0">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 1.85, 6.4], fov: 58, near: 0.1, far: 220 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <SkyEnvironment playerPosRef={playerPosRef} />
        <PlayerCharacter playerPosRef={playerPosRef} />
        <MainFlightDirector playerPosRef={playerPosRef} />
        <ChallengeStageDirector playerPosRef={playerPosRef} />
      </Canvas>
    </div>
  );
};
