import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { SkyEnvironment } from './SkyEnvironment';
import { PlayerCharacter } from './PlayerCharacter';
import { MainFlightDirector } from './MainFlightDirector';
import { ChallengeStageDirector } from './ChallengeStageDirector';

export const GameCanvas: React.FC = () => {
  const playerPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

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
