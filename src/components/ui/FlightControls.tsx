import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Zap } from 'lucide-react';

export const FlightControls: React.FC = () => {
  const phase = useGameStore((s) => s.phase);
  const isBoosting = useGameStore((s) => s.isBoosting);
  const flightBounds = useGameStore((s) => s.flightBounds);
  const joystickDeadzone = useGameStore((s) => s.joystickDeadzone);
  const setInputVector = useGameStore((s) => s.setInputVector);
  const setBoosting = useGameStore((s) => s.setBoosting);
  const setPhase = useGameStore((s) => s.setPhase);

  const keysRef = useRef<{ [key: string]: boolean }>({});
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const activeJoystickPointerIdRef = useRef<number | null>(null);
  const activeBoostPointerIdRef = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isStickActive, setIsStickActive] = useState<boolean>(false);

  const recomputeKeyVector = () => {
    if (activeJoystickPointerIdRef.current !== null) return;
    const k = keysRef.current;
    let x = 0;
    let y = 0;
    if (k['KeyA'] || k['ArrowLeft']) x -= 1;
    if (k['KeyD'] || k['ArrowRight']) x += 1;
    if (k['KeyW'] || k['ArrowUp']) y += 1;
    if (k['KeyS'] || k['ArrowDown']) y -= 1;

    // Normalize diagonal keyboard input
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }
    setInputVector(x, y, 'keyboard');
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
    const maxRadius = Math.max(24, rect.width / 2);

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    // Visual knob movement
    setKnobOffset({
      x: Math.cos(angle) * clampedDist * 0.62,
      y: Math.sin(angle) * clampedDist * 0.62,
    });

    // Normalized displacement ratio [0, 1] with deadzone (default 10%) and smooth non-linear response curve
    const ratio = clampedDist / maxRadius;
    const dz = Math.min(0.25, Math.max(0.05, joystickDeadzone));

    if (ratio <= dz) {
      setInputVector(0, 0, 'touch');
      return;
    }

    const effectiveMag = (ratio - dz) / (1 - dz);
    // Progressive curve: fine precision near center, full speed at rim
    const curvedMag = 0.35 * effectiveMag + 0.65 * Math.pow(effectiveMag, 1.65);

    const nx = Math.cos(angle) * curvedMag;
    const ny = Math.sin(angle) * curvedMag;

    // Invert Y because screen up is negative Y
    setInputVector(nx, -ny, 'touch');
  };

  const resetJoystick = () => {
    activeJoystickPointerIdRef.current = null;
    setIsStickActive(false);
    setKnobOffset({ x: 0, y: 0 });
    setInputVector(0, 0, 'touch');
  };

  if (phase !== 'PLAYING' && phase !== 'CHALLENGE_PLAYING') return null;

  const isMobilePortrait = flightBounds.isMobilePortrait;
  const isMobile = flightBounds.isMobile;

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      style={{
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
      className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none flex items-end justify-between select-none touch-none"
    >
      {/* Left: Virtual Joystick (Multi-Touch & Deadzone Supported) */}
      <div
        ref={joystickBaseRef}
        data-testid="virtual-joystick"
        onPointerDown={(e) => {
          if (activeJoystickPointerIdRef.current !== null) return;
          activeJoystickPointerIdRef.current = e.pointerId;
          setIsStickActive(true);
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // ignore synthetic event capture errors
          }
          handleJoystickMove(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (activeJoystickPointerIdRef.current !== e.pointerId) return;
          handleJoystickMove(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (activeJoystickPointerIdRef.current !== e.pointerId) return;
          resetJoystick();
        }}
        onPointerCancel={(e) => {
          if (activeJoystickPointerIdRef.current !== e.pointerId) return;
          resetJoystick();
        }}
        onLostPointerCapture={() => {
          if (activeJoystickPointerIdRef.current !== null) {
            resetJoystick();
          }
        }}
        className={`pointer-events-auto relative rounded-full bg-slate-900/65 border-2 backdrop-blur-md flex items-center justify-center shadow-2xl touch-none select-none cursor-grab active:cursor-grabbing transition-colors ${
          isMobilePortrait
            ? 'w-24 h-24'
            : isMobile
            ? 'w-26 h-26'
            : 'w-28 h-28 md:w-32 md:h-32'
        } ${isStickActive ? 'border-sky-300 bg-slate-900/80' : 'border-sky-400/50'}`}
      >
        {/* Outer guide ring & inner deadzone ring */}
        <div className="absolute inset-2 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute w-4 h-4 rounded-full border border-sky-400/25 pointer-events-none" />

        <div className="absolute top-1 text-[9px] md:text-[10px] font-bold text-sky-300/80 pointer-events-none">
          上昇
        </div>
        <div className="absolute bottom-1 text-[9px] md:text-[10px] font-bold text-sky-300/80 pointer-events-none">
          下降
        </div>
        <div className="absolute left-1.5 text-[9px] md:text-[10px] font-bold text-sky-300/80 pointer-events-none">
          ←
        </div>
        <div className="absolute right-1.5 text-[9px] md:text-[10px] font-bold text-sky-300/80 pointer-events-none">
          →
        </div>

        <div
          style={{
            transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
          }}
          className={`${
            isMobilePortrait ? 'w-10 h-10' : 'w-11 h-11 md:w-12 md:h-12'
          } rounded-full bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg border-2 border-white/85 pointer-events-none`}
        />
      </div>

      {/* Center Control Hint for PC Only */}
      {!isMobile && (
        <div className="hidden md:flex flex-col items-center glass-panel px-4 py-2 rounded-xl text-xs text-slate-300 mb-1">
          <div className="font-bold text-sky-300">
            【操作】W/A/S/D または 矢印キー：上下左右に飛行 ｜ Space：加速ブースト ｜ Esc：ポーズ
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            前方の選択ゲートへ飛び込み、障害物をかわしてあなただけの人生を描こう
          </div>
        </div>
      )}

      {/* Right: Boost Button (Simultaneous Multi-Touch Supported) */}
      <button
        type="button"
        data-testid="boost-button"
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          activeBoostPointerIdRef.current = e.pointerId;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // ignore synthetic event capture errors
          }
          setBoosting(true);
        }}
        onPointerUp={(e) => {
          if (
            activeBoostPointerIdRef.current !== null &&
            activeBoostPointerIdRef.current !== e.pointerId
          ) {
            return;
          }
          activeBoostPointerIdRef.current = null;
          setBoosting(false);
        }}
        onPointerCancel={() => {
          activeBoostPointerIdRef.current = null;
          setBoosting(false);
        }}
        onLostPointerCapture={() => {
          activeBoostPointerIdRef.current = null;
          setBoosting(false);
        }}
        className={`pointer-events-auto rounded-full flex flex-col items-center justify-center font-black shadow-2xl border-2 transition-transform touch-none select-none active:scale-95 ${
          isMobilePortrait
            ? 'w-20 h-20'
            : isMobile
            ? 'w-22 h-22'
            : 'w-24 h-24 md:w-28 md:h-28'
        } ${
          isBoosting
            ? 'bg-gradient-to-br from-amber-400 to-orange-600 border-yellow-200 scale-105 text-slate-950'
            : 'bg-slate-900/70 border-amber-400/60 text-amber-300 hover:bg-slate-800/80'
        }`}
      >
        <Zap className={`${isMobilePortrait ? 'w-5 h-5' : 'w-6 h-6 md:w-7 md:h-7'} ${isBoosting ? 'animate-bounce' : ''}`} />
        <span className="text-[11px] md:text-sm mt-0.5">加速</span>
        {!isMobile && <span className="text-[10px] opacity-80">SPACE</span>}
      </button>
    </div>
  );
};
