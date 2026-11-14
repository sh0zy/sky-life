import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Zap } from 'lucide-react';

export const FlightControls: React.FC = () => {
  const phase = useGameStore((s) => s.phase);
  const isBoosting = useGameStore((s) => s.isBoosting);
  const setInputVector = useGameStore((s) => s.setInputVector);
  const setBoosting = useGameStore((s) => s.setBoosting);
  const setPhase = useGameStore((s) => s.setPhase);

  const keysRef = useRef<{ [key: string]: boolean }>({});
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchActiveRef = useRef<boolean>(false);

  const recomputeKeyVector = () => {
    if (touchActiveRef.current) return;
    const k = keysRef.current;
    let x = 0;
    let y = 0;
    if (k['KeyA'] || k['ArrowLeft']) x -= 1;
    if (k['KeyD'] || k['ArrowRight']) x += 1;
    if (k['KeyW'] || k['ArrowUp']) y += 1;
    if (k['KeyS'] || k['ArrowDown']) y -= 1;
    setInputVector(x, y);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        const currentPhase = useGameStore.getState().phase;
        if (currentPhase === 'PLAYING') {
          setPhase('PAUSED');
        } else if (currentPhase === 'PAUSED') {
          setPhase('PLAYING');
        }
        return;
      }

      if (e.code === 'Space') {
        const currentPhase = useGameStore.getState().phase;
        if (currentPhase === 'PLAYING' || currentPhase === 'CHALLENGE_PLAYING') {
          e.preventDefault();
          setBoosting(true);
        }
        return;
      }

      keysRef.current[e.code] = true;
      recomputeKeyVector();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setBoosting(false);
        return;
      }
      keysRef.current[e.code] = false;
      recomputeKeyVector();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setBoosting, setInputVector, setPhase]);

  const handleJoystickMove = (clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = rect.width / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const nx = (Math.cos(angle) * clampedDist) / maxRadius;
    const ny = (Math.sin(angle) * clampedDist) / maxRadius;

    setKnobOffset({
      x: Math.cos(angle) * clampedDist * 0.65,
      y: Math.sin(angle) * clampedDist * 0.65,
    });
    // Invert Y because screen up is negative Y
    setInputVector(nx, -ny);
  };

  const resetJoystick = () => {
    touchActiveRef.current = false;
    setKnobOffset({ x: 0, y: 0 });
    setInputVector(0, 0);
  };

  if (phase !== 'PLAYING' && phase !== 'CHALLENGE_PLAYING') return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-20 pointer-events-none px-5 flex items-end justify-between">
      {/* Virtual Joystick (Touch & Mouse drag supported) */}
      <div
        ref={joystickBaseRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          touchActiveRef.current = true;
          handleJoystickMove(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!touchActiveRef.current) return;
          handleJoystickMove(e.clientX, e.clientY);
        }}
        onPointerUp={resetJoystick}
        onPointerCancel={resetJoystick}
        className="pointer-events-auto relative w-28 h-28 md:w-32 md:h-32 rounded-full bg-slate-900/60 border-2 border-sky-400/50 backdrop-blur-md flex items-center justify-center shadow-2xl touch-none cursor-grab active:cursor-grabbing"
      >
        <div className="absolute inset-2 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute top-1.5 text-[10px] font-bold text-sky-300/80">上昇 W/↑</div>
        <div className="absolute bottom-1.5 text-[10px] font-bold text-sky-300/80">下降 S/↓</div>
        <div className="absolute left-2 text-[10px] font-bold text-sky-300/80">←A</div>
        <div className="absolute right-2 text-[10px] font-bold text-sky-300/80">D→</div>

        <div
          style={{
            transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
          }}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg border-2 border-white/80 transition-transform duration-75"
        />
      </div>

      {/* Center Control Hint for PC */}
      <div className="hidden md:flex flex-col items-center glass-panel px-4 py-2 rounded-xl text-xs text-slate-300 mb-1">
        <div className="font-bold text-sky-300">
          【操作】W/A/S/D または 矢印キー：上下左右に飛行 ｜ Space：加速ブースト ｜ Esc：ポーズ
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          前方の選択ゲートへ飛び込み、障害物をかわしてあなただけの人生を描こう
        </div>
      </div>

      {/* Boost Button */}
      <button
        type="button"
        onPointerDown={() => setBoosting(true)}
        onPointerUp={() => setBoosting(false)}
        onPointerLeave={() => setBoosting(false)}
        className={`pointer-events-auto w-24 h-24 md:w-28 md:h-28 rounded-full flex flex-col items-center justify-center font-black shadow-2xl border-2 transition-all active:scale-95 ${
          isBoosting
            ? 'bg-gradient-to-br from-amber-400 to-orange-600 border-yellow-200 scale-105 text-slate-950'
            : 'bg-slate-900/70 border-amber-400/60 text-amber-300 hover:bg-slate-800/80'
        }`}
      >
        <Zap className={`w-7 h-7 ${isBoosting ? 'animate-bounce' : ''}`} />
        <span className="text-xs md:text-sm mt-1">加速</span>
        <span className="text-[10px] opacity-80">SPACE</span>
      </button>
    </div>
  );
};
