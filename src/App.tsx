import React from 'react';
import { GameCanvas } from './components/3d/GameCanvas';
import { HUD } from './components/ui/HUD';
import { FlightControls } from './components/ui/FlightControls';
import { ScreenOverlays } from './components/ui/ScreenOverlays';
import { EndingScreen } from './components/ui/EndingScreen';

export function App() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* 3D Flying World & Character */}
      <GameCanvas />

      {/* Real-time Status HUD & Floating Choice Notifications */}
      <HUD />

      {/* PC Keyboard & Mobile Virtual Joystick + Boost Controls */}
      <FlightControls />

      {/* Title, World Map Birth, Intro, Recovery, Challenge & Pause Modals */}
      <ScreenOverlays />

      {/* Ending Celebration, Title Evaluation & Image Export */}
      <EndingScreen />
    </main>
  );
}

export default App;
