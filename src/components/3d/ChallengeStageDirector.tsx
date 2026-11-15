import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { DEFAULT_COUNTRY_PARAMETERS } from '../../utils/socialSimulation';

interface ChallengeStageDirectorProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
}

interface ChallengeWave {
  id: number;
  kind: 'quiz_pair' | 'value_triad' | 'orb_cluster';
  questionText: string;
  items: {
    x: number;
    y: number;
    label: string;
    points: number;
    color: string;
    isHazard?: boolean;
    extraTag?: string;
    supportLabel?: string;
  }[];
}

function buildDynamicExamWaves(): Omit<ChallengeWave, 'id'>[] {
  const store = useGameStore.getState();
  const countryParams =
    store.countryParamsMap[store.country.id] || DEFAULT_COUNTRY_PARAMETERS[store.country.id];
  const isHighTuition =
    countryParams.educationCostBurden >= 55 ||
    store.conditions.economy === '経済的に厳しい家庭' ||
    store.conditions.economy === '逆境からのスタート';

  return [
    {
      kind: 'quiz_pair',
      questionText: `【${store.country.name}・進学準備1】基礎学力の試練！正しい知識ゲートへ飛び込め！`,
      items: [
        { x: -4.2, y: 0.5, label: '⭕ 基礎理論の習得 +30pt', points: 30, color: '#38bdf8' },
        { x: 4.2, y: 0.5, label: '❌ 準備不足の壁 -10pt', points: -10, color: '#ef4444', isHazard: true },
      ],
    },
    isHighTuition
      ? {
          kind: 'value_triad',
          questionText:
            '【学費と環境の突破ゲート】家庭や地域の教育費ハードルをどう乗り越えて進学する？',
          items: [
            {
              x: -5.2,
              y: 0.6,
              label: '🎓 奨学金・学費支援獲得 +40pt',
              points: 40,
              color: '#0ea5e9',
              extraTag: 'scholarship_secured',
              supportLabel: '受験チャレンジ特別奨学金枠',
            },
            {
              x: 0,
              y: -1.2,
              label: '⚡ 学費高騰の重圧 -12pt',
              points: -12,
              color: '#ef4444',
              isHazard: true,
            },
            {
              x: 5.2,
              y: 0.6,
              label: '🏫 公立・働きながら進学ルート +34pt',
              points: 34,
              color: '#10b981',
              extraTag: 'vocational_trained',
              supportLabel: '公立・夜間学費減免進学制度',
            },
          ],
        }
      : {
          kind: 'orb_cluster',
          questionText:
            '【充実した学習環境ゾーン】豊富な教材・公教育の追い風を受けて応用力を伸ばせ！',
          items: [
            { x: -4.5, y: 1.4, label: '✨ 専門研究・応用力 +32pt', points: 32, color: '#facc15' },
            { x: 0, y: 0, label: '⚡ 油断とプレッシャー -10pt', points: -10, color: '#ef4444', isHazard: true },
            { x: 4.5, y: -1.0, label: '📘 国際教養・探求 +32pt', points: 32, color: '#38bdf8' },
          ],
        },
    {
      kind: 'quiz_pair',
      questionText: '【応用試験】困難な問題に直面したとき、合格を引き寄せる思考法は？',
      items: [
        { x: -4.2, y: -0.5, label: '❌ 焦って丸暗記に頼る -10pt', points: -10, color: '#ef4444', isHazard: true },
        { x: 4.2, y: -0.5, label: '⭕ 原理から冷静に解く +32pt', points: 32, color: '#38bdf8' },
      ],
    },
    {
      kind: 'value_triad',
      questionText: '【最終進路ゲート】あなたの環境と目標に合う進学ルートを選んで突破せよ！',
      items: [
        { x: -5.2, y: 0.5, label: '🏛️ 第一志望・総合大学合格 +36pt', points: 36, color: '#3b82f6' },
        { x: 0, y: 1.6, label: '🛠️ 高等専門・技術アカデミー +35pt', points: 35, color: '#10b981', extraTag: 'vocational_trained' },
        { x: 5.2, y: 0.5, label: '🌍 奨学金留学・オンライン大学 +36pt', points: 36, color: '#a855f7', extraTag: 'scholarship_secured' },
      ],
    },
  ];
}

function buildDynamicCareerWaves(): Omit<ChallengeWave, 'id'>[] {
  const store = useGameStore.getState();
  const countryParams =
    store.countryParamsMap[store.country.id] || DEFAULT_COUNTRY_PARAMETERS[store.country.id];
  const hasTechOrVocational =
    store.tags.includes('vocational_trained') ||
    store.tags.includes('learned_coding') ||
    store.tags.includes('digital_leapfrog_skill');

  return [
    {
      kind: 'value_triad',
      questionText: `【${store.country.name}の雇用環境】地域の求人条件や競争の壁をどう突破する？`,
      items: [
        {
          x: -5.2,
          y: 0.5,
          label: hasTechOrVocational
            ? '💻 習得スキル・資格で専門求人突破 +38pt'
            : '🛠️ 職業訓練・資格取得で突破 +34pt',
          points: hasTechOrVocational ? 38 : 34,
          color: '#06b6d4',
          extraTag: 'vocational_trained',
          supportLabel: '専門職能・資格キャリア認証',
        },
        {
          x: 0,
          y: -1.3,
          label: '🌩️ 求人難と雇用の壁 -12pt',
          points: -12,
          color: '#ef4444',
          isHazard: true,
        },
        {
          x: 5.2,
          y: 0.5,
          label: '🏙️ 都市・成長拠点へ移動して就職 +35pt',
          points: 35,
          color: '#f59e0b',
          extraTag: 'urban_relocated',
        },
      ],
    },
    {
      kind: 'orb_cluster',
      questionText:
        countryParams.employmentOpportunity >= 72
          ? '【活発な雇用市場】過労の雷雲をかわし、キャリア飛躍のチャンスを掴め！'
          : '【変動する雇用市場】不安定な気流をかわし、信頼と実務スキルの光を掴め！',
      items: [
        { x: -4.5, y: -1.0, label: '💡 専門プロジェクト推進 +28pt', points: 28, color: '#38bdf8' },
        { x: 0, y: 1.2, label: '⚡ 長時間労働の罠 -12pt', points: -12, color: '#ef4444', isHazard: true },
        { x: 4.5, y: 1.2, label: '🤝 チームの信頼と連帯 +28pt', points: 28, color: '#10b981' },
      ],
    },
    {
      kind: 'quiz_pair',
      questionText: '【キャリアの最終決断】自分の強みと社会の変化が交差する場面での選択は？',
      items: [
        { x: -4.2, y: -0.4, label: '❌ 環境のせいにして立ち止まる -10pt', points: -10, color: '#ef4444', isHazard: true },
        { x: 4.2, y: -0.4, label: '⭕ 経験とスキルを結集して挑戦 +36pt', points: 36, color: '#f59e0b' },
      ],
    },
  ];
}

function buildDynamicCrossroadsWaves(): Omit<ChallengeWave, 'id'>[] {
  const store = useGameStore.getState();
  const countryParams =
    store.countryParamsMap[store.country.id] || DEFAULT_COUNTRY_PARAMETERS[store.country.id];
  const highSafetyNet = countryParams.socialSecurity >= 70;

  return [
    {
      kind: 'value_triad',
      questionText: `【${store.country.name}・起業と人生の岐路】資金調達・社会保障・家族のどれを軸に進む？`,
      items: [
        {
          x: -5.2,
          y: 0.5,
          label: highSafetyNet
            ? '🛡️ 充実した社会保障と家族の調和 +34pt'
            : '🤝 家族・地域互助と健康の調和 +34pt',
          points: 34,
          color: '#10b981',
          extraTag: 'social_security_utilized',
        },
        {
          x: 0,
          y: 1.8,
          label: '🚀 資金調達・社会課題ビジネスの起業 +36pt',
          points: 36,
          color: '#f59e0b',
          extraTag: 'founder_path',
        },
        {
          x: 5.2,
          y: 0.5,
          label: '🌱 地域コミュニティ支援と後進育成 +34pt',
          points: 34,
          color: '#38bdf8',
          extraTag: 'community_pillar',
        },
      ],
    },
    {
      kind: 'value_triad',
      questionText: '【市場の波とリスク管理】経済の変動を乗り越えるあなたの戦略は？',
      items: [
        { x: -5.2, y: -0.6, label: '🤝 支え合うネットワーク構築 +32pt', points: 32, color: '#38bdf8' },
        { x: 0, y: -1.5, label: '⚡ 孤立と過剰投資の嵐 -12pt', points: -12, color: '#ef4444', isHazard: true },
        { x: 5.2, y: -0.6, label: '✨ 技術革新と新市場の開拓 +34pt', points: 34, color: '#a855f7' },
      ],
    },
    {
      kind: 'value_triad',
      questionText: '【最終航路】あなた自身が心から納得できる幸せの形へ飛び込もう！',
      items: [
        { x: -4.8, y: 0.5, label: '🌈 愛と感謝の共生ルート +36pt', points: 36, color: '#ec4899' },
        { x: 0, y: 0.5, label: '🌟 挑戦と自己実現のルート +36pt', points: 36, color: '#eab308' },
        { x: 4.8, y: 0.5, label: '🕊️ 平穏と次世代継承ルート +36pt', points: 36, color: '#2dd4bf' },
      ],
    },
  ];
}

export const ChallengeStageDirector: React.FC<ChallengeStageDirectorProps> = ({
  playerPosRef,
}) => {
  const waveGroupRef = useRef<THREE.Group>(null);
  const zPosRef = useRef<number>(-82);
  const waveIndexRef = useRef<number>(0);
  const resolvedRef = useRef<boolean>(false);

  const [activeWave, setActiveWave] = useState<ChallengeWave | null>(null);

  const phase = useGameStore((s) => s.phase);
  const activeChallengeId = useGameStore((s) => s.activeChallengeId);
  const flightBounds = useGameStore((s) => s.flightBounds);

  const spawnWave = () => {
    const store = useGameStore.getState();
    const cid = store.activeChallengeId;
    const bounds = store.flightBounds;
    const list =
      cid === 'exam'
        ? buildDynamicExamWaves()
        : cid === 'career'
        ? buildDynamicCareerWaves()
        : buildDynamicCrossroadsWaves();
    const template = list[waveIndexRef.current % list.length];
    waveIndexRef.current += 1;

    // Scale item coordinates dynamically so they always lie inside the player's movable range on mobile & PC
    const scaleX = Math.min(1.0, bounds.corridorHalfWidth / 7.5);
    const scaleY = Math.min(1.0, (bounds.maxY - bounds.minY) / 8.0);
    const scaledItems = template.items.map((it) => ({
      ...it,
      x: THREE.MathUtils.clamp(it.x * scaleX, bounds.minX * 0.85, bounds.maxX * 0.85),
      y: THREE.MathUtils.clamp(it.y * scaleY, bounds.minY * 0.75, bounds.maxY * 0.75),
    }));

    zPosRef.current = -85;
    resolvedRef.current = false;
    setActiveWave({
      id: waveIndexRef.current,
      ...template,
      items: scaledItems,
    });
  };

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const store = useGameStore.getState();

    if (store.phase !== 'CHALLENGE_PLAYING') {
      if (activeWave !== null) {
        setActiveWave(null);
        waveIndexRef.current = 0;
      }
      return;
    }

    store.tickChallengeTimer(dt);

    if (!activeWave) {
      spawnWave();
      return;
    }

    const speed = store.isBoosting ? 44 : 29;
    zPosRef.current += speed * dt;

    if (waveGroupRef.current) {
      waveGroupRef.current.position.z = zPosRef.current;
    }

    if (!resolvedRef.current && zPosRef.current >= -2.2 && zPosRef.current <= 2.4) {
      const px = playerPosRef.current.x;
      const py = playerPosRef.current.y;

      let closestItem = activeWave.items[0];
      let minDist = Infinity;

      for (const item of activeWave.items) {
        const d = Math.hypot(px - item.x, py - item.y);
        if (d < minDist) {
          minDist = d;
          closestItem = item;
        }
      }

      if (activeWave.kind === 'quiz_pair' || activeWave.kind === 'value_triad') {
        resolvedRef.current = true;
        store.addChallengeScore(
          closestItem.points,
          closestItem.label,
          Boolean(closestItem.isHazard),
          closestItem.extraTag,
          closestItem.supportLabel
        );
        setActiveWave(null);
      } else if (minDist < 3.6) {
        resolvedRef.current = true;
        store.addChallengeScore(
          closestItem.points,
          closestItem.label,
          Boolean(closestItem.isHazard),
          closestItem.extraTag,
          closestItem.supportLabel
        );
        setActiveWave(null);
      }
    }

    if (zPosRef.current > 8) {
      setActiveWave(null);
    }
  });

  if (phase !== 'CHALLENGE_PLAYING' || !activeWave) return null;

  const isMobile = flightBounds.isMobile;
  const isPortrait = flightBounds.isMobilePortrait;
  const ringScale = isPortrait ? 0.65 : isMobile ? 0.8 : 1.0;

  return (
    <group ref={waveGroupRef} position={[0, 0, zPosRef.current]}>
      {/* Decorative Challenge Stage Sky Arch */}
      <mesh position={[0, 0, -5]}>
        <torusGeometry args={[isPortrait ? 7.5 : 12, 0.15, 12, 48]} />
        <meshBasicMaterial
          color={
            activeChallengeId === 'exam'
              ? '#60a5fa'
              : activeChallengeId === 'career'
              ? '#2dd4bf'
              : '#f472b6'
          }
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Question / Prompt Banner */}
      <Html
        position={[0, isMobile ? 3.8 : 5.2, 0]}
        center
        distanceFactor={isMobile ? 34 : 28}
        zIndexRange={[10, 0]}
      >
        <div
          className={`pointer-events-none select-none rounded-2xl bg-slate-950/92 border-2 border-amber-400 text-center shadow-2xl ${
            isPortrait ? 'w-72 px-3 py-1.5' : 'w-96 md:w-[480px] px-5 py-2.5'
          }`}
        >
          <div className="text-xs md:text-base font-extrabold text-amber-200 leading-snug">
            {activeWave.questionText}
          </div>
        </div>
      </Html>

      {/* Items / Gates in the Wave */}
      {activeWave.items.map((item, idx) => (
        <group key={idx} position={[item.x, item.y, 0]} scale={ringScale}>
          {item.isHazard ? (
            <mesh>
              <dodecahedronGeometry args={[2.2]} />
              <meshStandardMaterial
                color="#7f1d1d"
                emissive="#ef4444"
                emissiveIntensity={0.6}
              />
            </mesh>
          ) : (
            <group>
              <mesh>
                <torusGeometry args={[2.4, 0.24, 14, 36]} />
                <meshStandardMaterial
                  color={item.color}
                  emissive={item.color}
                  emissiveIntensity={0.7}
                />
              </mesh>
              <mesh>
                <circleGeometry args={[2.25, 28]} />
                <meshBasicMaterial
                  color={item.color}
                  transparent
                  opacity={0.28}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          )}

          <Html
            position={[0, isPortrait && idx === 1 ? -1.4 : 0, 0]}
            center
            distanceFactor={isMobile ? 32 : 26}
            zIndexRange={[10, 0]}
          >
            <div
              className={`pointer-events-none select-none rounded-xl font-black text-white shadow-xl border ${
                isPortrait
                  ? 'px-2 py-1 text-[10px] max-w-[130px] text-center leading-tight'
                  : 'px-4 py-2 text-xs md:text-base whitespace-nowrap'
              }`}
              style={{
                backgroundColor: item.isHazard
                  ? 'rgba(127, 29, 29, 0.92)'
                  : 'rgba(15, 23, 42, 0.9)',
                borderColor: item.color,
              }}
            >
              {item.label}
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
};
