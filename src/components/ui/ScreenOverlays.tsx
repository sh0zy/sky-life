import React, { useState } from 'react';
import { useGameStore, DEFAULT_SCHEDULER_WEIGHTS } from '../../store/useGameStore';
import { COUNTRIES, CHALLENGE_STAGES } from '../../data/gameData';
import {
  CountryId,
  DifficultyLevel,
  ChoiceOption,
  CountrySocialParams,
} from '../../types/game';
import {
  getLifeDifficultyBandInfo,
  computeChallengeModifiers,
  DEFAULT_COUNTRY_PARAMETERS,
} from '../../utils/socialSimulation';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Globe,
  Shuffle,
  Sparkles,
  Award,
  History,
  Settings,
  X,
  ArrowRight,
  ShieldAlert,
  Sliders,
  Gauge,
  AlertTriangle,
  Building2,
  Info,
} from 'lucide-react';

const DIFFICULTY_META: {
  id: DifficultyLevel;
  label: string;
  desc: string;
  badgeColor: string;
}[] = [
  {
    id: 'EASY',
    label: 'EASY（ゆったり体験）',
    desc: '障害物が少なく選択時間が長め。困難のダメージも穏やか（※必須選択と強制イベントは発生します）',
    badgeColor: 'border-emerald-400 bg-emerald-500/20 text-emerald-200',
  },
  {
    id: 'NORMAL',
    label: 'NORMAL（標準バランス）',
    desc: 'バランスの取れた障害物と選択時間。挑戦の成功と失敗がドラマチックに交差します',
    badgeColor: 'border-sky-400 bg-sky-500/20 text-sky-200',
  },
  {
    id: 'HARD',
    label: 'HARD（波乱万丈・高速）',
    desc: '立体的な障害物配置・短い判断時間・高いリスクとリターン。歯ごたえのある人生体験',
    badgeColor: 'border-rose-400 bg-rose-500/20 text-rose-200',
  },
];

export const ScreenOverlays: React.FC = () => {
  const phase = useGameStore((s) => s.phase);
  const difficulty = useGameStore((s) => s.difficulty);
  const schedulerWeights = useGameStore((s) => s.schedulerWeights);
  const countryParamsMap = useGameStore((s) => s.countryParamsMap);
  const country = useGameStore((s) => s.country);
  const conditions = useGameStore((s) => s.conditions);
  const initialLifeDifficultyIndex = useGameStore((s) => s.initialLifeDifficultyIndex);
  const lifeDifficultyIndex = useGameStore((s) => s.lifeDifficultyIndex);
  const environmentChangeLogs = useGameStore((s) => s.environmentChangeLogs);
  const stats = useGameStore((s) => s.stats);
  const tags = useGameStore((s) => s.tags);
  const activeChoiceEvent = useGameStore((s) => s.activeChoiceEvent);
  const activeObstacle = useGameStore((s) => s.activeObstacle);
  const activeChallengeId = useGameStore((s) => s.activeChallengeId);
  const challengeScore = useGameStore((s) => s.challengeScore);
  const challengeTargetScore = useGameStore((s) => s.challengeTargetScore);
  const challengeOutcomeText = useGameStore((s) => s.challengeOutcomeText);
  const challengeSubOutcome = useGameStore((s) => s.challengeSubOutcome);
  const history = useGameStore((s) => s.history);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const pastRecords = useGameStore((s) => s.pastRecords);

  const setDifficulty = useGameStore((s) => s.setDifficulty);
  const setSchedulerWeights = useGameStore((s) => s.setSchedulerWeights);
  const updateCountryParams = useGameStore((s) => s.updateCountryParams);
  const resetCountryParams = useGameStore((s) => s.resetCountryParams);
  const startNewGameSelect = useGameStore((s) => s.startNewGameSelect);
  const confirmBirthCountry = useGameStore((s) => s.confirmBirthCountry);
  const beginFlightFromIntro = useGameStore((s) => s.beginFlightFromIntro);
  const resolveChoiceFailsafe = useGameStore((s) => s.resolveChoiceFailsafe);
  const resolveObstacleRecovery = useGameStore((s) => s.resolveObstacleRecovery);
  const startChallengePlay = useGameStore((s) => s.startChallengePlay);
  const closeChallengeResult = useGameStore((s) => s.closeChallengeResult);
  const setPhase = useGameStore((s) => s.setPhase);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const hasSavedGame = useGameStore((s) => s.hasSavedGame);
  const loadSavedGame = useGameStore((s) => s.loadSavedGame);

  const [selectedCountryId, setSelectedCountryId] = useState<CountryId>('japan');
  const [debugCountryId, setDebugCountryId] = useState<CountryId>('japan');
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCountryDebugModal, setShowCountryDebugModal] = useState(false);

  const savedAvailable = hasSavedGame();

  const renderSchedulerSliders = () => {
    const total =
      schedulerWeights.mandatoryChoice +
      schedulerWeights.forcedEvent +
      schedulerWeights.avoidableObstacle +
      schedulerWeights.chanceRisk;

    const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);

    return (
      <div className="glass-card p-4 rounded-2xl space-y-3 border border-sky-400/20">
        <div className="flex items-center justify-between">
          <div className="text-xs font-extrabold text-sky-300 uppercase flex items-center gap-1.5">
            <Sliders className="w-4 h-4" />
            イベントスケジューラー発生比率（デバッグ調整）
          </div>
          <button
            type="button"
            onClick={() => setSchedulerWeights(DEFAULT_SCHEDULER_WEIGHTS)}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold"
          >
            初期値(40/20/25/15)に戻す
          </button>
        </div>

        {[
          {
            key: 'mandatoryChoice' as const,
            label: 'A. 必須選択イベント',
            val: schedulerWeights.mandatoryChoice,
            color: 'accent-sky-400',
          },
          {
            key: 'forcedEvent' as const,
            label: 'B. 強制発生イベント',
            val: schedulerWeights.forcedEvent,
            color: 'accent-amber-400',
          },
          {
            key: 'avoidableObstacle' as const,
            label: 'C. 回避可能な障害物',
            val: schedulerWeights.avoidableObstacle,
            color: 'accent-rose-400',
          },
          {
            key: 'chanceRisk' as const,
            label: 'D. チャンスとリスク',
            val: schedulerWeights.chanceRisk,
            color: 'accent-purple-400',
          },
        ].map((item) => (
          <div key={item.key} className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-200">{item.label}</span>
              <span className="text-sky-300 tabular-nums">
                重み {item.val} （実効割合: 約 {pct(item.val)}%）
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={item.val}
              onChange={(e) =>
                setSchedulerWeights({ [item.key]: Number(e.target.value) })
              }
              className={`w-full h-2 bg-slate-800 rounded-lg cursor-pointer ${item.color}`}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderCountryDebugEditor = () => {
    const cInfo = COUNTRIES.find((c) => c.id === debugCountryId) || COUNTRIES[0];
    const params = countryParamsMap[debugCountryId] || DEFAULT_COUNTRY_PARAMETERS[debugCountryId];

    const sliderItems: {
      key: keyof CountrySocialParams;
      label: string;
      desc: string;
      min: number;
      max: number;
      step: number;
      color: string;
    }[] = [
      {
        key: 'educationAccess',
        label: '1. 教育へのアクセス',
        desc: '高いほど学校・学習機会が得やすい',
        min: 0,
        max: 100,
        step: 1,
        color: 'accent-sky-400',
      },
      {
        key: 'educationCostBurden',
        label: '2. 教育費の負担',
        desc: '高いほど進学時の家計・奨学金確保の必要性が増す',
        min: 0,
        max: 100,
        step: 1,
        color: 'accent-amber-400',
      },
      {
        key: 'medicalAccess',
        label: '3. 医療へのアクセス',
        desc: '高いほど医療機関・治療を利用しやすい',
        min: 0,
        max: 100,
        step: 1,
        color: 'accent-emerald-400',
      },
      {
        key: 'medicalCostBurden',
        label: '4. 医療費の負担',
        desc: '高いほど病気・怪我時の自己負担リスクが大きい',
        min: 0,
        max: 100,
        step: 1,
        color: 'accent-rose-400',
      },
      {
        key: 'employmentOpportunity',
        label: '5. 雇用機会',
        desc: '高いほど求人・キャリアの選択肢が豊富',
        min: 0,
        max: 100,
        step: 1,
        color: 'accent-cyan-400',
      },
      {
        key: 'incomeLivingBalance',
        label: '6. 経済環境（所得と生活費のバランス）',
        desc: '高いほど家計のゆとりが生まれやすい',
        min: 0,
        max: 100,
        step: 1,
        color: 'accent-yellow-400',
      },
      {
        key: 'socialSecurity',
        label: '7. 社会保障',
        desc: '高いほどセーフティネット・公的支援が充実',
        min: 0,
        max: 100,
        step: 1,
        color: 'accent-teal-400',
      },
      {
        key: 'economicInstability',
        label: '8. 経済的不安定さ',
        desc: '高いほど物価変動や突然の出費リスクが高まる',
        min: 0,
        max: 100,
        step: 1,
        color: 'accent-orange-400',
      },
      {
        key: 'regionalDisparity',
        label: '9. 地域間格差',
        desc: '高いほど都市部と地方の機会差が大きくなる',
        min: 0,
        max: 100,
        step: 1,
        color: 'accent-purple-400',
      },
      {
        key: 'socialMobility',
        label: '10. 社会的な移動機会',
        desc: '高いほどスキル・起業による環境改善が進みやすい',
        min: 0,
        max: 100,
        step: 1,
        color: 'accent-indigo-400',
      },
      {
        key: 'difficultyEventMultiplier',
        label: '11. 困難イベントへの影響倍率',
        desc: '1.00が標準。困難・出費イベントの影響度を増減',
        min: 0.5,
        max: 2.0,
        step: 0.05,
        color: 'accent-pink-400',
      },
    ];

    return (
      <div className="glass-card p-4 rounded-2xl space-y-3 border border-amber-400/30 text-left">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-extrabold text-amber-300 uppercase flex items-center gap-1.5">
            <Globe className="w-4 h-4" />
            国別社会環境パラメータ・デバッグ調整（localStorage保存）
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => resetCountryParams(debugCountryId)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold"
            >
              {cInfo.name}を初期値に戻す
            </button>
            <button
              type="button"
              onClick={() => resetCountryParams('all')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 font-bold"
            >
              全6か国を初期値に戻す
            </button>
          </div>
        </div>

        {/* Country selector tabs */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {COUNTRIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setDebugCountryId(c.id)}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1 ${
                debugCountryId === c.id
                  ? 'bg-sky-500/30 border-sky-300 text-white shadow'
                  : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <span>{c.flag}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {sliderItems.map((item) => {
            const val = params[item.key];
            return (
              <div
                key={item.key}
                className="bg-slate-900/65 p-2.5 rounded-xl border border-white/10 space-y-1"
              >
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-200">{item.label}</span>
                  <span className="text-amber-300 tabular-nums">
                    {item.key === 'difficultyEventMultiplier' ? `${val.toFixed(2)}x` : `${val} / 100`}
                  </span>
                </div>
                <input
                  type="range"
                  min={item.min}
                  max={item.max}
                  step={item.step}
                  value={val}
                  onChange={(e) =>
                    updateCountryParams(debugCountryId, {
                      [item.key]: Number(e.target.value),
                    })
                  }
                  className={`w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer ${item.color}`}
                />
                <div className="text-[10px] text-slate-400">{item.desc}</div>
              </div>
            );
          })}
        </div>

        <div className="text-[10px] text-slate-400 bg-slate-950/60 p-2 rounded-lg">
          ※本パラメータは世界銀行・UNDP・UNESCO・WHO等の国際傾向を参考にしつつ、ゲーム体験用に設計されたシミュレーション用仮指標です。国や国民の優劣や固定値を示すものではありません。
        </div>
      </div>
    );
  };

  // ==================== 1. TITLE SCREEN ====================
  if (phase === 'TITLE') {
    return (
      <div className="fixed inset-0 z-30 flex flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-950/50 via-slate-900/40 to-slate-950/80 overflow-y-auto">
        <div className="glass-panel max-w-2xl w-full rounded-3xl p-6 md:p-9 text-center shadow-2xl border border-sky-400/30 my-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-extrabold tracking-widest uppercase mb-3">
            <Sparkles className="w-4 h-4" />
            3D Flying Life Simulation Game
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white text-glow">
            SKY LIFE
          </h1>
          <p className="text-lg md:text-xl font-bold text-sky-200 mt-1">
            ― 空飛ぶ人生ゲーム ―
          </p>
          <p className="text-xl md:text-2xl font-extrabold text-amber-300 mt-3">
            「あなたは、どんな人生を飛ぶ？」
          </p>
          <p className="text-xs text-slate-300 mt-1">
            生まれる環境は選べないが、その空の中でどう生きるかは自分で選択できる。
          </p>

          {/* Difficulty Selector right on Title Screen */}
          <div className="mt-5 text-left glass-card p-3.5 rounded-2xl border border-white/10">
            <div className="text-xs font-extrabold text-sky-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Gauge className="w-4 h-4" />
              ACTION DIFFICULTY — アクション速度・操作難易度
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTY_META.map((d) => {
                const active = difficulty === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDifficulty(d.id)}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      active
                        ? `${d.badgeColor} border-2 font-black shadow-lg scale-[1.02]`
                        : 'bg-slate-900/60 border-white/10 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-xs md:text-sm font-black">{d.id}</div>
                    <div className="text-[10px] opacity-85 mt-0.5 hidden sm:block">
                      {d.label.replace(`${d.id}（`, '').replace('）', '')}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-slate-300 mt-2 text-center">
              {DIFFICULTY_META.find((d) => d.id === difficulty)?.desc}
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={startNewGameSelect}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 hover:from-sky-300 hover:to-indigo-500 text-white font-black text-lg shadow-xl flex items-center justify-center gap-2.5 transition transform hover:scale-105 active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              新しい人生を始める
            </button>

            {savedAvailable && (
              <button
                type="button"
                onClick={() => loadSavedGame()}
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-black text-base shadow-xl flex items-center justify-center gap-2 border border-emerald-300/40 transition transform hover:scale-105"
              >
                <RotateCcw className="w-5 h-5" />
                続きから飛ぶ
              </button>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowRecordsModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs md:text-sm font-bold flex items-center gap-2 border border-white/10 transition"
            >
              <Award className="w-4 h-4 text-amber-300" />
              過去の人生の記録 ({pastRecords.length})
            </button>

            <button
              type="button"
              onClick={() => setShowCountryDebugModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-200 text-xs md:text-sm font-bold flex items-center gap-2 border border-amber-400/30 transition"
            >
              <Globe className="w-4 h-4 text-amber-300" />
              国別環境パラメータ調整
            </button>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs md:text-sm font-bold flex items-center gap-2 border border-white/10 transition"
            >
              <Settings className="w-4 h-4 text-sky-300" />
              設定・イベント比率デバッグ
            </button>
          </div>
        </div>

        {/* Past Records Modal */}
        {showRecordsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="glass-panel max-w-xl w-full rounded-3xl p-6 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-white/15 pb-3">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-300" />
                  これまでの人生の記録
                </h2>
                <button
                  type="button"
                  onClick={() => setShowRecordsModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 my-4 pr-1">
                {pastRecords.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">
                    まだ記録された人生はありません。最初の空へ飛び立ちましょう！
                  </p>
                ) : (
                  pastRecords.map((rec) => (
                    <div key={rec.id} className="glass-card rounded-2xl p-4 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-sky-300">
                          {rec.countryFlag} {rec.countryName}生まれ（享年 {rec.finalAge}歳）
                        </span>
                        <span className="text-xs text-slate-400">{rec.date}</span>
                      </div>
                      <div className="text-lg font-black text-amber-300 mt-1">
                        称号：「{rec.titleName}」
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">
                        主なキャリア：{rec.career}
                        {typeof rec.initialDifficulty === 'number' &&
                          ` ／ 環境難易度: 初期 ${rec.initialDifficulty} → 最終 ${rec.finalDifficulty}`}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Country Social Parameters Debug Modal */}
        {showCountryDebugModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <div className="glass-panel max-w-3xl w-full rounded-3xl p-6 text-left space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/15 pb-3">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-amber-300" />
                  国別社会環境パラメータ・デバッグパネル
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCountryDebugModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {renderCountryDebugEditor()}
            </div>
          </div>
        )}

        {/* Settings & Scheduler Debug Modal */}
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="glass-panel max-w-2xl w-full rounded-3xl p-6 text-left space-y-4 max-h-[88vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/15 pb-3">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-sky-300" />
                  設定・イベントスケジューラー・国別環境デバッグ
                </h2>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-between glass-card p-4 rounded-2xl">
                <div>
                  <div className="font-bold text-white">サウンド・BGM効果音</div>
                  <div className="text-xs text-slate-400">Web AudioによるオリジナルBGMと効果音</div>
                </div>
                <button
                  type="button"
                  onClick={toggleSound}
                  className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 ${
                    soundEnabled ? 'bg-sky-500 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  {soundEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {renderSchedulerSliders()}
              {renderCountryDebugEditor()}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== 2. BIRTH WORLD MAP SELECTION ====================
  if (phase === 'BIRTH_SELECT') {
    const activeCountry = COUNTRIES.find((c) => c.id === selectedCountryId) || COUNTRIES[0];
    const activeParams =
      countryParamsMap[selectedCountryId] || DEFAULT_COUNTRY_PARAMETERS[selectedCountryId];

    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-3 md:p-5 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
        <div className="glass-panel max-w-5xl w-full rounded-3xl p-5 md:p-7 shadow-2xl border border-sky-400/30 my-auto max-h-[94vh] overflow-y-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-3">
            <div>
              <div className="text-xs font-extrabold text-sky-300 uppercase tracking-widest flex items-center gap-1.5">
                <Globe className="w-4 h-4" />
                WORLD BIRTH & SOCIAL ENVIRONMENT — 誕生する国と社会環境
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white mt-0.5">
                あなたはどの空から人生を始めますか？
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDebugCountryId(selectedCountryId);
                  setShowCountryDebugModal(true);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-400/30 flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                国別パラメータ調整
              </button>

              <button
                type="button"
                onClick={() => confirmBirthCountry('random')}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs md:text-sm shadow-xl flex items-center gap-1.5 transition transform hover:scale-105"
              >
                <Shuffle className="w-4 h-4" />
                運命に任せてランダムに誕生する
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left: World Map & 6-Country Buttons */}
            <div className="lg:col-span-6 space-y-3">
              <div className="relative h-56 md:h-64 rounded-2xl bg-slate-900/90 border border-sky-500/30 overflow-hidden shadow-inner">
                <svg
                  viewBox="0 0 1000 500"
                  className="w-full h-full opacity-35 fill-sky-500/40 stroke-sky-300/40"
                >
                  <path d="M100,80 Q220,60 280,150 T220,250 L140,200 Z" />
                  <path d="M270,270 Q360,290 380,380 T310,460 L260,360 Z" />
                  <path d="M440,90 Q520,70 560,150 L460,180 Z" />
                  <path d="M450,200 Q580,200 600,320 T520,430 L440,300 Z" />
                  <path d="M570,80 Q780,60 860,180 T720,280 L580,200 Z" />
                  <circle cx="830" cy="190" r="18" />
                  <path d="M760,340 Q850,330 870,410 L770,420 Z" />
                </svg>

                {COUNTRIES.map((c) => {
                  const isSelected = c.id === selectedCountryId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCountryId(c.id)}
                      style={{ left: `${c.coordinates.x}%`, top: `${c.coordinates.y}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-lg ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 scale-125 ring-4 ring-amber-300/50 z-20'
                          : 'bg-slate-800/90 text-white border border-sky-400/50 hover:scale-110 z-10'
                      }`}
                    >
                      <span>{c.flag}</span>
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {COUNTRIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCountryId(c.id)}
                    className={`p-2 rounded-xl border text-center transition font-bold text-xs ${
                      c.id === selectedCountryId
                        ? 'bg-sky-500/30 border-sky-300 text-white shadow-md'
                        : 'bg-slate-800/60 border-white/10 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-xl mb-0.5">{c.flag}</div>
                    <div>{c.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Country Social Environment Parameter Preview */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-3">
              <div className="glass-card rounded-2xl p-4 text-left space-y-2.5 border border-sky-400/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl">{activeCountry.flag}</span>
                    <div>
                      <div className="text-xs text-sky-300 font-bold">{activeCountry.region}</div>
                      <div className="text-xl font-black text-white">{activeCountry.name}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-200 border border-sky-400/30">
                    家庭環境は誕生時にランダム生成
                  </span>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed">
                  {activeCountry.description}
                </p>
                <p className="text-xs text-amber-200/95 bg-amber-500/10 border border-amber-400/20 rounded-xl p-2">
                  💡 {activeCountry.socialContextNote}
                </p>

                {/* 10 Country Social Environment Parameters Grid */}
                <div className="pt-1">
                  <div className="text-[11px] font-extrabold text-sky-300 uppercase mb-1.5">
                    📊 国の社会環境傾向パラメータ（0〜100 シミュレーション指標）
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {[
                      { label: '教育アクセス', val: activeParams.educationAccess, goodHigh: true },
                      { label: '教育費の負担', val: activeParams.educationCostBurden, goodHigh: false },
                      { label: '医療アクセス', val: activeParams.medicalAccess, goodHigh: true },
                      { label: '医療費の負担', val: activeParams.medicalCostBurden, goodHigh: false },
                      { label: '雇用機会', val: activeParams.employmentOpportunity, goodHigh: true },
                      { label: '所得・生活費均衡', val: activeParams.incomeLivingBalance, goodHigh: true },
                      { label: '社会保障', val: activeParams.socialSecurity, goodHigh: true },
                      { label: '経済的不安定さ', val: activeParams.economicInstability, goodHigh: false },
                      { label: '地域間格差', val: activeParams.regionalDisparity, goodHigh: false },
                      { label: '社会的移動機会', val: activeParams.socialMobility, goodHigh: true },
                    ].map((p) => (
                      <div
                        key={p.label}
                        className="bg-slate-900/75 px-2.5 py-1.5 rounded-lg flex items-center justify-between border border-white/5"
                      >
                        <span className="text-slate-300 font-semibold">{p.label}</span>
                        <span
                          className={`font-black tabular-nums ${
                            p.goodHigh
                              ? p.val >= 75
                                ? 'text-emerald-300'
                                : p.val >= 55
                                ? 'text-sky-300'
                                : 'text-amber-300'
                              : p.val >= 65
                              ? 'text-rose-300'
                              : p.val >= 45
                              ? 'text-amber-300'
                              : 'text-emerald-300'
                          }`}
                        >
                          {p.val}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1.5">
                    ※ゲーム用の仮パラメータであり、同じ国の中でも多様な家庭・地域環境が生まれます。
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => confirmBirthCountry(selectedCountryId)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-600 hover:from-sky-300 hover:to-indigo-500 text-white font-black text-base md:text-lg shadow-xl flex items-center justify-center gap-2 transition transform hover:scale-[1.01]"
              >
                <span>{activeCountry.name}で誕生する</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {showCountryDebugModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <div className="glass-panel max-w-3xl w-full rounded-3xl p-6 text-left space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/15 pb-3">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-amber-300" />
                  国別社会環境パラメータ・デバッグパネル
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCountryDebugModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {renderCountryDebugEditor()}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== 3. BIRTH INTRO CUTSCENE (Required Birth Information Display) ====================
  if (phase === 'BIRTH_INTRO') {
    const bandInfo = getLifeDifficultyBandInfo(initialLifeDifficultyIndex);
    const reg = conditions.regionalOpportunities;

    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
        <div className="glass-panel max-w-2xl w-full rounded-3xl p-6 md:p-8 text-center shadow-2xl border-2 border-sky-300/40 my-auto max-h-[94vh] overflow-y-auto">
          <div className="text-5xl mb-2">{country.flag}</div>
          <h2 className="text-2xl md:text-3xl font-black text-white">
            「あなたは{country.name}で生まれました」
          </h2>
          <p className="text-sm md:text-base font-bold text-sky-300 mt-1">
            生まれる環境は選べませんが、この空をどう飛ぶかはあなたの選択次第です。
          </p>

          {/* 1. Structural Life Environment Difficulty Banner */}
          <div className="mt-4 glass-card rounded-2xl p-4 border border-white/15 text-left">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-extrabold text-slate-300 uppercase flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-sky-300" />
                  人生環境の難易度（構造的ハードル指標）
                </div>
                <div className="text-2xl font-black text-white mt-0.5 flex items-center gap-2.5">
                  <span style={{ color: bandInfo.color }}>
                    {initialLifeDifficultyIndex} / 100
                  </span>
                  <span
                    className={`text-xs font-extrabold px-3 py-1 rounded-full border ${bandInfo.badgeClass}`}
                  >
                    {bandInfo.band}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-300 mt-1.5">{bandInfo.shortDesc}</p>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              この値は直面する構造的な困難を表し、あなた自身の才能や価値を表すものではありません。進学・奨学金・転居・スキル習得で変動します。
            </p>
          </div>

          {/* 2. Household & Social Environment Details */}
          <div className="mt-4 glass-card rounded-2xl p-4 text-left space-y-3 border border-white/15">
            <div className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">
              🏠 あなたの出生環境・地域の機会
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-slate-900/70 p-2.5 rounded-xl">
                <span className="text-slate-400 block text-[10px]">生まれた国</span>
                <span className="font-bold text-white">
                  {country.flag} {country.name}
                </span>
              </div>
              <div className="bg-slate-900/70 p-2.5 rounded-xl">
                <span className="text-slate-400 block text-[10px]">家庭の経済状況</span>
                <span className="font-bold text-amber-300">{conditions.economy}</span>
              </div>
              <div className="bg-slate-900/70 p-2.5 rounded-xl">
                <span className="text-slate-400 block text-[10px]">居住地域</span>
                <span className="font-bold text-sky-300">{conditions.residenceArea}</span>
              </div>
              <div className="bg-slate-900/70 p-2.5 rounded-xl">
                <span className="text-slate-400 block text-[10px]">家庭からの支援</span>
                <span className="font-bold text-white">{conditions.familySupport}</span>
              </div>
              <div className="bg-slate-900/70 p-2.5 rounded-xl">
                <span className="text-slate-400 block text-[10px]">教育へのアクセス</span>
                <span className="font-bold text-emerald-300">
                  {conditions.educationAccessAtBirth} / 100
                </span>
              </div>
              <div className="bg-slate-900/70 p-2.5 rounded-xl">
                <span className="text-slate-400 block text-[10px]">医療へのアクセス</span>
                <span className="font-bold text-emerald-300">
                  {conditions.medicalAccessAtBirth} / 100
                </span>
              </div>
            </div>

            {reg && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1 border-t border-white/10">
                <div className="bg-slate-950/60 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">学校・医療機関</span>
                  <span className="font-bold text-slate-200">{reg.schoolMedicalAccess}</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">インターネット環境</span>
                  <span className="font-bold text-slate-200">{reg.internetAccess}</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">仕事・学習の選択肢</span>
                  <span className="font-bold text-slate-200">{reg.workStudyOptions}</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">公共交通機関</span>
                  <span className="font-bold text-slate-200">{reg.publicTransport}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-white/10">
              <div className="bg-slate-900/50 p-2 rounded-lg">
                <span className="text-slate-400 block text-[10px]">個人の得意分野（環境不問）</span>
                <span className="font-bold text-sky-300">{conditions.specialty}</span>
              </div>
              <div className="bg-slate-900/50 p-2 rounded-lg">
                <span className="text-slate-400 block text-[10px]">興味・関心</span>
                <span className="font-bold text-amber-300">{conditions.interest}</span>
              </div>
              <div className="bg-slate-900/50 p-2 rounded-lg">
                <span className="text-slate-400 block text-[10px]">生まれつきの体質</span>
                <span className="font-bold text-emerald-300">{conditions.initialHealth}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={beginFlightFromIntro}
            className="mt-5 w-full py-4 rounded-2xl bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 hover:from-sky-300 hover:to-indigo-500 text-white font-black text-lg shadow-xl flex items-center justify-center gap-2 transition transform hover:scale-105"
          >
            <Sparkles className="w-5 h-5" />
            大空へ飛び立つ！
          </button>
        </div>
      </div>
    );
  }

  // ==================== 4A. MANDATORY CHOICE FAILSAFE MODAL ====================
  if (phase === 'CHOICE_FAILSAFE_MODAL' && activeChoiceEvent) {
    const options: ChoiceOption[] = activeChoiceEvent.centerChoice
      ? [
          activeChoiceEvent.leftChoice,
          activeChoiceEvent.centerChoice,
          activeChoiceEvent.rightChoice,
        ]
      : [activeChoiceEvent.leftChoice, activeChoiceEvent.rightChoice];

    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
        <div className="glass-panel max-w-2xl w-full rounded-3xl p-6 md:p-8 shadow-2xl border-2 border-amber-400">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase">
            <AlertTriangle className="w-4 h-4" />
            人生の必須選択（回避不可）
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white mt-3">
            {activeChoiceEvent.title}
          </h2>
          <p className="text-xs md:text-sm text-slate-300 mt-1">
            この人生の選択は避けて通ることができません。以下の選択肢から1つを選んで進んでください：
          </p>

          <div className="mt-5 space-y-3">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => resolveChoiceFailsafe(opt)}
                className="w-full text-left glass-card hover:bg-slate-800/90 border-2 rounded-2xl p-4 transition flex items-center justify-between group"
                style={{ borderColor: opt.color }}
              >
                <div className="pr-4 space-y-1">
                  <div className="text-base md:text-lg font-black text-white flex items-center gap-2">
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </div>
                  <div className="text-xs text-slate-300">{opt.subLabel}</div>
                  <div className="text-xs font-bold text-emerald-300">
                    ⭕ メリット: {opt.prosText}
                  </div>
                  <div className="text-xs font-bold text-rose-300">
                    ⚠️ 代償/リスク: {opt.consText}
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-sky-400 shrink-0 group-hover:translate-x-1 transition" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==================== 4B. FORCED EVENT & OBSTACLE RECOVERY MODAL ====================
  if ((phase === 'FORCED_EVENT_MODAL' || phase === 'RECOVERY_MODAL') && activeObstacle) {
    const isForced = phase === 'FORCED_EVENT_MODAL' || activeObstacle.unavoidable;
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <div
          className={`glass-panel max-w-2xl w-full rounded-3xl p-6 md:p-8 shadow-2xl border-2 ${
            isForced ? 'border-amber-400/70' : 'border-rose-400/60'
          }`}
        >
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black uppercase border ${
              isForced
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                : 'bg-rose-500/20 border-rose-400/40 text-rose-300'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            {activeObstacle.categoryLabel}
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-white mt-3">
            {activeObstacle.recoveryTitle}
          </h2>
          <p className="text-sm md:text-base text-slate-200 mt-2">
            {activeObstacle.recoveryPrompt}
          </p>
          <p className="text-xs text-amber-300 mt-1 font-bold">
            どの対処法にもメリットと代償があります。支援制度の活用やあなたの価値観で次の一歩を選んでください：
          </p>

          <div className="mt-5 space-y-3">
            {activeObstacle.recoveryOptions.map((opt, idx) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => resolveObstacleRecovery(idx)}
                className="w-full text-left glass-card hover:bg-slate-800/90 border border-sky-400/30 hover:border-sky-300 rounded-2xl p-4 transition flex items-center justify-between group"
              >
                <div className="pr-4">
                  <div className="text-base md:text-lg font-black text-white group-hover:text-sky-300 transition">
                    {idx + 1}. {opt.label}
                  </div>
                  <div className="text-xs md:text-sm text-slate-300 mt-0.5">
                    {opt.description}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    <div className="text-xs font-bold text-amber-300 bg-slate-900/80 px-2.5 py-1 rounded-lg">
                      📊 予測効果：{opt.prosConsPreview}
                    </div>
                    {opt.supportUsedLabel && (
                      <div className="text-xs font-bold text-sky-300 bg-sky-500/15 border border-sky-400/30 px-2.5 py-1 rounded-lg">
                        🏛️ 利用制度：{opt.supportUsedLabel}
                      </div>
                    )}
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-sky-400 shrink-0 group-hover:translate-x-1 transition" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==================== 5. CHALLENGE INTRO MODAL (Country & Environment Adapted) ====================
  if (phase === 'CHALLENGE_INTRO' && activeChallengeId) {
    const cDef = CHALLENGE_STAGES[activeChallengeId];
    const activeParams =
      countryParamsMap[country.id] || DEFAULT_COUNTRY_PARAMETERS[country.id];
    const mods = computeChallengeModifiers(activeChallengeId, {
      countryId: country.id,
      countryName: country.name,
      countryParams: activeParams,
      conditions,
      stats,
      tags,
      lifeDifficultyIndex,
    });

    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-indigo-950/80 backdrop-blur-md overflow-y-auto">
        <div className="glass-panel max-w-2xl w-full rounded-3xl p-6 md:p-8 text-center shadow-2xl border-2 border-amber-400 my-auto">
          <div className="text-xs font-black tracking-widest text-amber-300 uppercase">
            ✨ SPECIAL TURNING POINT STAGE ({country.flag} {country.name}) ✨
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white mt-1.5">
            {cDef.stageTitle}
          </h2>
          <p className="text-xs md:text-sm text-sky-200 mt-1 font-bold">
            {cDef.subtitle}
          </p>

          {/* Country & Household Environment Condition Box */}
          <div className="mt-4 glass-card rounded-2xl p-4 text-left space-y-2 border border-sky-400/30">
            <div className="text-xs font-extrabold text-sky-300 uppercase">
              🌐 国・出生環境・準備状況によるステージ条件
            </div>
            <div className="text-xs font-bold text-white bg-slate-900/70 p-2.5 rounded-xl">
              {mods.conditionSummary}
            </div>

            {mods.barrierNotes.length > 0 && (
              <div className="space-y-1">
                {mods.barrierNotes.map((b, i) => (
                  <div key={i} className="text-xs text-rose-300 font-semibold">
                    ⚠️ 環境課題：{b}
                  </div>
                ))}
              </div>
            )}

            {mods.supportNotes.length > 0 && (
              <div className="space-y-1">
                {mods.supportNotes.map((s, i) => (
                  <div key={i} className="text-xs text-emerald-300 font-semibold">
                    ⭕ 準備・支援ボーナス：{s}
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-400/20 p-2.5 rounded-xl font-bold">
              💡 突破のポイント：{mods.extraGoalLabel}
            </div>

            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
              <span className="text-emerald-300">
                🎯 第一目標スコア：{challengeTargetScore} pt（別ルート：{mods.alternativeRouteLabel}）
              </span>
              <span className="text-sky-300">
                ⭐ 現在の初期準備スコア：{challengeScore} pt
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={startChallengePlay}
            className="mt-5 w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 hover:from-amber-300 hover:to-pink-400 text-slate-950 font-black text-lg shadow-xl transition transform hover:scale-105"
          >
            チャレンジ開始！
          </button>
        </div>
      </div>
    );
  }

  // ==================== 6. CHALLENGE RESULT MODAL ====================
  if (phase === 'CHALLENGE_RESULT') {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <div className="glass-panel max-w-xl w-full rounded-3xl p-7 md:p-8 text-center shadow-2xl border-2 border-emerald-400">
          <div className="text-xs font-black tracking-widest text-emerald-300 uppercase">
            🎉 CHALLENGE COMPLETE 🎉
          </div>
          <div className="text-4xl font-black text-amber-300 mt-2">
            最終スコア: {challengeScore} pt
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white mt-3">
            {challengeOutcomeText}
          </h2>
          <p className="text-sm md:text-base text-slate-200 mt-2 leading-relaxed">
            {challengeSubOutcome}
          </p>

          <button
            type="button"
            onClick={closeChallengeResult}
            className="mt-7 w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-600 hover:from-emerald-300 hover:to-teal-500 text-slate-950 font-black text-lg shadow-xl transition transform hover:scale-105"
          >
            人生の空へ復帰する
          </button>
        </div>
      </div>
    );
  }

  // ==================== 7. PAUSE, COUNTRY DEBUG, SCHEDULER DEBUG & HISTORY MODAL ====================
  if (phase === 'PAUSED') {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <div className="glass-panel max-w-4xl w-full rounded-3xl p-6 md:p-8 shadow-2xl max-h-[92vh] flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-3">
            <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <History className="w-6 h-6 text-sky-400" />
              ポーズ ／ 国別環境・スケジューラーデバッグ ／ 選択履歴
            </h2>
            <div className="flex items-center gap-2">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-sky-400/40 text-xs font-bold text-sky-200"
              >
                <option value="EASY">難易度: EASY</option>
                <option value="NORMAL">難易度: NORMAL</option>
                <option value="HARD">難易度: HARD</option>
              </select>
              <button
                type="button"
                onClick={toggleSound}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-sky-400" /> : <VolumeX className="w-4 h-4" />}
                音量: {soundEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1">
            {renderSchedulerSliders()}
            {renderCountryDebugEditor()}

            {environmentChangeLogs.length > 0 && (
              <div className="glass-card p-4 rounded-2xl space-y-2 text-left border border-emerald-400/30">
                <div className="text-xs font-extrabold text-emerald-300 uppercase">
                  🌐 人生環境の難易度変化ログ
                </div>
                {environmentChangeLogs.slice().reverse().map((log) => (
                  <div key={log.id} className="text-xs bg-slate-900/70 p-2.5 rounded-xl flex items-center justify-between gap-2">
                    <div>
                      <span className="text-sky-300 font-bold mr-2">{log.age}歳:</span>
                      <span className="text-white font-semibold">{log.reason}</span>
                    </div>
                    <span className="text-amber-300 font-black tabular-nums shrink-0">
                      難易度 {log.prevDifficulty} → {log.nextDifficulty}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <div className="text-xs font-extrabold text-amber-300 uppercase text-left">
                📜 これまでの選択・イベント履歴 ({history.length}件)
              </div>
              {history.map((item) => (
                <div key={item.id} className="glass-card rounded-xl p-3 text-left">
                  <div className="flex items-center justify-between text-xs text-sky-300 font-bold">
                    <span>{item.age}歳</span>
                    <span className="uppercase">{item.type}</span>
                  </div>
                  <div className="text-sm font-black text-white mt-0.5">{item.title}</div>
                  <div className="text-xs text-slate-300 mt-0.5">{item.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/15">
            <button
              type="button"
              onClick={() => setPhase('TITLE')}
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm"
            >
              タイトルへ戻る（自動セーブ済み）
            </button>
            <button
              type="button"
              onClick={() => setPhase('PLAYING')}
              className="px-7 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-black text-base shadow-lg"
            >
              飛行を再開する
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
