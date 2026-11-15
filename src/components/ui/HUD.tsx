import React, { useState } from 'react';
import { useGameStore, DEFAULT_SCHEDULER_WEIGHTS } from '../../store/useGameStore';
import { CHAPTERS, COUNTRIES } from '../../data/gameData';
import {
  formatStatNumber,
  getStatBarProgress,
} from '../../utils/statSystem';
import {
  getLifeDifficultyBandInfo,
  DEFAULT_COUNTRY_PARAMETERS,
} from '../../utils/socialSimulation';
import {
  Pause,
  Play,
  Volume2,
  VolumeX,
  Heart,
  Smile,
  Coins,
  Users,
  BookOpen,
  Sparkles,
  Shield,
  Sliders,
  Globe,
  Building2,
  BarChart3,
  ScrollText,
  X,
} from 'lucide-react';
import { StatDelta, CountryId, CountrySocialParams, ChoiceOption } from '../../types/game';

export const STAT_META = [
  { key: 'happiness', label: '幸福度', icon: Smile, color: 'bg-amber-400', text: 'text-amber-300' },
  { key: 'health', label: '健康', icon: Heart, color: 'bg-emerald-400', text: 'text-emerald-300' },
  { key: 'money', label: 'お金', icon: Coins, color: 'bg-yellow-400', text: 'text-yellow-300' },
  { key: 'relationships', label: '人間関係', icon: Users, color: 'bg-rose-400', text: 'text-rose-300' },
  { key: 'knowledge', label: '知識・スキル', icon: BookOpen, color: 'bg-sky-400', text: 'text-sky-300' },
  { key: 'selfActualization', label: '自己実現', icon: Sparkles, color: 'bg-purple-400', text: 'text-purple-300' },
  { key: 'resilience', label: 'レジリエンス', icon: Shield, color: 'bg-teal-400', text: 'text-teal-300' },
] as const;

const DELTA_LABELS: Record<keyof StatDelta, string> = {
  happiness: '幸福度',
  health: '健康',
  money: 'お金',
  relationships: '人間関係',
  knowledge: '知識・スキル',
  selfActualization: '自己実現',
  resilience: 'レジリエンス',
};

export const HUD: React.FC = () => {
  const phase = useGameStore((s) => s.phase);
  const difficulty = useGameStore((s) => s.difficulty);
  const age = useGameStore((s) => s.age);
  const chapter = useGameStore((s) => s.chapter);
  const country = useGameStore((s) => s.country);
  const conditions = useGameStore((s) => s.conditions);
  const initialLifeDifficultyIndex = useGameStore((s) => s.initialLifeDifficultyIndex);
  const lifeDifficultyIndex = useGameStore((s) => s.lifeDifficultyIndex);
  const environmentChangeLogs = useGameStore((s) => s.environmentChangeLogs);
  const utilizedSupports = useGameStore((s) => s.utilizedSupports);
  const overcomeHardships = useGameStore((s) => s.overcomeHardships);
  const countryParamsMap = useGameStore((s) => s.countryParamsMap);
  const stats = useGameStore((s) => s.stats);
  const tags = useGameStore((s) => s.tags);
  const career = useGameStore((s) => s.career);
  const history = useGameStore((s) => s.history);
  const completedChallenges = useGameStore((s) => s.completedChallenges);
  const feedbacks = useGameStore((s) => s.feedbacks);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const challengeScore = useGameStore((s) => s.challengeScore);
  const challengeTargetScore = useGameStore((s) => s.challengeTargetScore);
  const challengeTimeLeft = useGameStore((s) => s.challengeTimeLeft);
  const debugPanelOpen = useGameStore((s) => s.debugPanelOpen);
  const socialEnvPanelOpen = useGameStore((s) => s.socialEnvPanelOpen);
  const schedulerWeights = useGameStore((s) => s.schedulerWeights);
  const flightBounds = useGameStore((s) => s.flightBounds);
  const mobileSheet = useGameStore((s) => s.mobileSheet);
  const activeChoicePreview = useGameStore((s) => s.activeChoicePreview);

  const toggleSound = useGameStore((s) => s.toggleSound);
  const setPhase = useGameStore((s) => s.setPhase);
  const toggleDebugPanel = useGameStore((s) => s.toggleDebugPanel);
  const toggleSocialEnvPanel = useGameStore((s) => s.toggleSocialEnvPanel);
  const setSchedulerWeights = useGameStore((s) => s.setSchedulerWeights);
  const setDifficulty = useGameStore((s) => s.setDifficulty);
  const updateCountryParams = useGameStore((s) => s.updateCountryParams);
  const resetCountryParams = useGameStore((s) => s.resetCountryParams);
  const openMobileSheet = useGameStore((s) => s.openMobileSheet);
  const closeMobileSheet = useGameStore((s) => s.closeMobileSheet);

  const [debugTab, setDebugTab] = useState<'scheduler' | 'country'>('scheduler');
  const [selectedDebugCountry, setSelectedDebugCountry] = useState<CountryId | null>(null);

  const chapterInfo = CHAPTERS[chapter];
  const progressPercent = Math.min(100, (age / 82) * 100);
  const bandInfo = getLifeDifficultyBandInfo(lifeDifficultyIndex);
  const activeCountryParams =
    countryParamsMap[country.id] || DEFAULT_COUNTRY_PARAMETERS[country.id];
  const latestEnvLog =
    environmentChangeLogs.length > 0
      ? environmentChangeLogs[environmentChangeLogs.length - 1]
      : null;

  // ==================== 1. LIFE STATUS MODAL ("人生ステータス" 画面: 7 Stats + Growth Records) ====================
  if (phase === 'PAUSED' && mobileSheet !== 'none') {
    return (
      <div
        data-testid="life-status-modal"
        style={{
          paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
        }}
        className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 backdrop-blur-md select-none"
      >
        <div className="glass-panel max-w-lg w-full rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-2xl border border-sky-400/40 max-h-[92dvh] flex flex-col">
          {/* Header with Title & Close Icon Button */}
          <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/25 border border-sky-400/40 flex items-center justify-center text-sky-300">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-white leading-tight">
                  人生ステータス・成長の記録
                </h2>
                <div className="text-[10px] text-slate-300 font-bold">
                  {country.flag} {country.name}生まれ ・ {Math.floor(age)}歳（{chapterInfo.title} / 進捗 {Math.round(progressPercent)}%）
                </div>
              </div>
            </div>
            <button
              type="button"
              data-testid="close-status-modal-top"
              onClick={closeMobileSheet}
              aria-label="人生ステータス画面を閉じる"
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body containing all 7 Stats + Social Environment + Growth & Choice Records */}
          <div className="flex-1 overflow-y-auto my-2.5 space-y-3 pr-1">
            {/* Section A: All 7 Uncapped Life Stats (Happiness, Health, Money, Relationships, Knowledge, Self-Actualization, Resilience) */}
            <div className="glass-card rounded-2xl p-3 space-y-2 border border-sky-400/25">
              <div className="flex items-center justify-between text-[11px] font-extrabold text-sky-300 uppercase">
                <span>📊 現在のステータス（上限なし成長）</span>
                <span className="text-[10px] text-amber-300 font-bold truncate max-w-[140px]">
                  {career}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STAT_META.map((item) => {
                  const Icon = item.icon;
                  const val = stats[item.key];
                  const barInfo = getStatBarProgress(val);
                  return (
                    <div
                      key={item.key}
                      className="bg-slate-900/75 p-2 rounded-xl border border-white/10 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-bold text-slate-200">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${item.text}`} />
                          <span>{item.label}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-amber-300">
                            {barInfo.tierLabel}
                          </span>
                          <span
                            data-testid={`modal-stat-${item.key}`}
                            className={`text-xs sm:text-sm font-black tabular-nums ${item.text}`}
                          >
                            {formatStatNumber(val)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800/90 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} transition-all duration-300`}
                          style={{ width: `${barInfo.percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section B: Current Social Environment & Birth Conditions */}
            <div className="glass-card rounded-2xl p-3 space-y-2 border border-emerald-400/25">
              <div className="flex items-center justify-between text-[11px] font-extrabold text-emerald-300">
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" />
                  社会環境・出生条件
                </span>
                <span className="text-xs font-black" style={{ color: bandInfo.color }}>
                  環境難易度: {lifeDifficultyIndex}/100（初期 {initialLifeDifficultyIndex}）
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="bg-slate-900/70 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[9px]">家庭の経済状況</span>
                  <span className="font-bold text-amber-300">{conditions.economy}</span>
                </div>
                <div className="bg-slate-900/70 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[9px]">居住地域</span>
                  <span className="font-bold text-sky-300">
                    {conditions.residenceArea}
                    {tags.includes('urban_relocated') ? '（都市転居済）' : ''}
                  </span>
                </div>
                <div className="bg-slate-900/70 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[9px]">家庭からの支援</span>
                  <span className="font-bold text-white">{conditions.familySupport}</span>
                </div>
                <div className="bg-slate-900/70 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[9px]">個人の得意分野</span>
                  <span className="font-bold text-emerald-300">{conditions.specialty}</span>
                </div>
              </div>
            </div>

            {/* Section C: Growth Records ("成長の記録") & Choice History */}
            <div className="glass-card rounded-2xl p-3 space-y-2 border border-amber-400/25">
              <div className="text-[11px] font-extrabold text-amber-300 flex items-center gap-1">
                <ScrollText className="w-3.5 h-3.5" />
                成長の記録・選択履歴 ({history.length}件)
              </div>

              {(utilizedSupports.length > 0 ||
                completedChallenges.length > 0 ||
                overcomeHardships.length > 0) && (
                <div className="space-y-1.5 pb-2 border-b border-white/10">
                  {utilizedSupports.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {utilizedSupports.map((sup, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-sky-500/20 text-sky-200 px-2 py-0.5 rounded-full font-bold"
                        >
                          🏛️ {sup}
                        </span>
                      ))}
                    </div>
                  )}
                  {completedChallenges.map((c, i) => (
                    <div
                      key={i}
                      className="text-[10px] bg-slate-900/80 px-2 py-1 rounded-lg text-emerald-300 font-bold"
                    >
                      🏆 {c.title}：{c.outcome}（{c.score}pt）
                    </div>
                  ))}
                  {overcomeHardships.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {overcomeHardships.map((h, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-teal-500/20 text-teal-200 px-2 py-0.5 rounded-full font-bold"
                        >
                          🛡️ {h}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                {history
                  .slice()
                  .reverse()
                  .map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-900/75 rounded-xl p-2.5 text-left space-y-0.5 border border-white/5"
                    >
                      <div className="flex items-center justify-between text-[10px] text-sky-300 font-bold">
                        <span>{item.age}歳</span>
                        <span className="uppercase text-[9px] px-1.5 py-0.2 rounded bg-white/10">
                          {item.type}
                        </span>
                      </div>
                      <div className="text-xs font-black text-white leading-snug">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-slate-300 leading-snug">{item.detail}</div>
                      {item.deltas && Object.keys(item.deltas).length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {Object.entries(item.deltas).map(([k, v]) => {
                            if (!v) return null;
                            const label = DELTA_LABELS[k as keyof StatDelta] || k;
                            const isPos = v > 0;
                            return (
                              <span
                                key={k}
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  isPos
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-rose-500/20 text-rose-300'
                                }`}
                              >
                                {label} {isPos ? `+${formatStatNumber(v)}` : formatStatNumber(v)}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Explicit Close & Resume Button */}
          <button
            type="button"
            data-testid="close-status-modal-bottom"
            onClick={closeMobileSheet}
            className="w-full py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-600 hover:from-sky-300 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            閉じてプレイを再開する
          </button>
        </div>
      </div>
    );
  }

  if (phase !== 'PLAYING' && phase !== 'CHALLENGE_PLAYING') return null;

  // Helper to render the 1-to-1 Top Choice Route Cards (guaranteed zero overlap via CSS Grid)
  const renderTopChoiceRouteCards = (mode: 'portrait' | 'landscape' | 'pc') => {
    if (phase !== 'PLAYING' || !activeChoicePreview) return null;

    const ev = activeChoicePreview.event;
    const options: ChoiceOption[] = ev.centerChoice
      ? [ev.leftChoice, ev.centerChoice, ev.rightChoice]
      : [ev.leftChoice, ev.rightChoice];
    const isThree = options.length === 3;
    const routeBadges = isThree
      ? ['① 左', '② 中央', '③ 右']
      : ['① 左', '② 右'];

    if (mode === 'landscape') {
      return (
        <div
          data-testid="choice-route-cards-container"
          className="flex-1 max-w-[530px] mx-1 pointer-events-none select-none"
        >
          <div className="bg-slate-950/92 border border-sky-400/60 rounded-lg px-2.5 py-0.5 mb-1 text-center shadow-lg">
            <span className="text-[9px] font-black text-amber-300 mr-1.5">
              {ev.kind === 'chance_risk' ? '🎲 チャンスとリスク' : '⚖️ 必須選択'}
            </span>
            <span className="text-[11px] font-black text-white leading-tight">
              {ev.title}
            </span>
          </div>
          <div
            className={`grid ${
              isThree ? 'grid-cols-3 gap-1.5' : 'grid-cols-2 gap-2'
            } w-full`}
          >
            {options.map((opt, idx) => {
              const isTargeted = activeChoicePreview.targetedIndex === idx;
              return (
                <div
                  key={opt.id}
                  data-testid={`choice-route-card-${opt.id}`}
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: opt.color,
                  }}
                  className={`min-w-0 rounded-xl px-2 py-1 border-2 text-left shadow-xl transition-all overflow-hidden ${
                    isTargeted ? 'ring-2 ring-amber-300' : 'opacity-92'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className="text-[9px] font-black text-slate-950 px-1.5 py-0.2 rounded leading-tight shrink-0"
                      style={{ backgroundColor: opt.color }}
                    >
                      {routeBadges[idx]}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs leading-none">{opt.icon}</span>
                      {isTargeted && (
                        <span className="text-[9px] font-black bg-amber-400 text-slate-950 px-1 rounded">
                          進路中
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] font-black text-white leading-snug break-words whitespace-normal mt-0.5">
                    {opt.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (mode === 'portrait') {
      return (
        <div
          data-testid="choice-route-cards-container"
          className="w-full mt-1.5 pointer-events-none select-none"
        >
          <div className="bg-slate-950/94 border border-sky-400/60 rounded-xl px-2.5 py-1 mb-1 text-center shadow-lg">
            <span className="text-[9px] font-black text-amber-300 mr-1.5">
              {ev.kind === 'chance_risk' ? '🎲 チャンスとリスク' : '⚖️ 必須選択'}
            </span>
            <span className="text-[11px] sm:text-xs font-black text-white leading-tight break-words">
              {ev.title}
            </span>
          </div>
          <div
            className={`grid ${
              isThree ? 'grid-cols-3 gap-1.5' : 'grid-cols-2 gap-2'
            } w-full`}
          >
            {options.map((opt, idx) => {
              const isTargeted = activeChoicePreview.targetedIndex === idx;
              return (
                <div
                  key={opt.id}
                  data-testid={`choice-route-card-${opt.id}`}
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: opt.color,
                  }}
                  className={`min-w-0 rounded-xl p-1.5 sm:p-2 border-2 text-left shadow-xl transition-all overflow-hidden flex flex-col justify-start ${
                    isTargeted ? 'ring-2 ring-amber-300' : 'opacity-92'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className="text-[9px] sm:text-[10px] font-black text-slate-950 px-1.5 py-0.2 rounded leading-tight shrink-0"
                      style={{ backgroundColor: opt.color }}
                    >
                      {routeBadges[idx]}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <span className="text-sm leading-none">{opt.icon}</span>
                      {isTargeted && (
                        <span className="text-[9px] font-black bg-amber-400 text-slate-950 px-1 rounded">
                          🎯
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] sm:text-xs font-black text-white leading-snug break-words whitespace-normal mt-1">
                    {opt.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // PC mode
    return (
      <div
        data-testid="choice-route-cards-container"
        className={`w-full ${isThree ? 'max-w-4xl' : 'max-w-2xl'} mx-auto pointer-events-none select-none`}
      >
        <div className="bg-slate-950/92 border-2 border-sky-400/70 rounded-2xl px-5 py-1.5 mb-2 text-center shadow-2xl">
          <div className="text-[11px] font-black tracking-wider text-amber-300 uppercase">
            {ev.kind === 'chance_risk'
              ? '🎲 D. チャンスとリスク（回避不可）'
              : '⚖️ A. 必須選択ゲート（回避不可）'}
          </div>
          <div className="text-base md:text-xl font-black text-white leading-tight mt-0.5">
            {ev.title}
          </div>
        </div>
        <div
          className={`grid ${
            isThree ? 'grid-cols-3 gap-3' : 'grid-cols-2 gap-4'
          } w-full`}
        >
          {options.map((opt, idx) => {
            const isTargeted = activeChoicePreview.targetedIndex === idx;
            return (
              <div
                key={opt.id}
                data-testid={`choice-route-card-${opt.id}`}
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  borderColor: opt.color,
                }}
                className={`min-w-0 rounded-2xl p-3 border-2 text-left shadow-2xl transition-all overflow-hidden ${
                  isTargeted ? 'ring-3 ring-amber-300 scale-[1.01]' : 'opacity-92'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-xs font-black text-slate-950 px-2.5 py-0.5 rounded-full leading-tight shrink-0"
                    style={{ backgroundColor: opt.color }}
                  >
                    {routeBadges[idx]}ルート
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isTargeted && (
                      <span className="text-[11px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                        🎯 現在の進路
                      </span>
                    )}
                    <span className="text-xl leading-none">{opt.icon}</span>
                  </div>
                </div>
                <div className="text-sm md:text-base font-black text-white leading-snug break-words whitespace-normal mt-1.5">
                  {opt.label}
                </div>
                {opt.subLabel && (
                  <div className="text-xs text-slate-300 leading-snug break-words whitespace-normal mt-0.5">
                    {opt.subLabel}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ==================== 2. SMARTPHONE NORMAL PLAY HUD (ZERO HAPPINESS/STAT PANELS ON SCREEN) ====================
  if (flightBounds.isMobile) {
    // Combine all active stat deltas across recent feedbacks into a single compact map so multiple notifications are merged cleanly
    const combinedDeltas: StatDelta = {};
    for (const fb of feedbacks) {
      for (const [k, v] of Object.entries(fb.deltas)) {
        if (typeof v === 'number' && v !== 0) {
          const key = k as keyof StatDelta;
          combinedDeltas[key] = (combinedDeltas[key] || 0) + v;
        }
      }
    }
    const deltaEntries = Object.entries(combinedDeltas).filter(
      ([, v]) => typeof v === 'number' && v !== 0
    );
    const latestFeedback = feedbacks.length > 0 ? feedbacks[feedbacks.length - 1] : null;

    return (
      <div
        data-testid="mobile-flight-hud"
        style={{
          paddingTop: 'max(0.4rem, env(safe-area-inset-top))',
          paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
          paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
        }}
        className="fixed inset-x-0 top-0 z-10 pointer-events-none select-none"
      >
        {/* Top Row: Left = Current Age & Life Progress | Center (Landscape) = Choice Cards | Right = Status + Pause */}
        <div className="w-full flex items-start justify-between gap-1.5">
          {/* Top-Left: Age + Life Progress ONLY (No Happiness or other stats!) */}
          <div className="flex flex-col items-start gap-1 max-w-[68%] shrink-0">
            <div
              data-testid="mobile-age-progress"
              className="glass-panel rounded-xl px-2.5 py-1.5 flex items-center gap-2 shadow-lg pointer-events-auto"
            >
              <span className="text-base leading-none">{country.flag}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xs sm:text-sm font-black text-white tabular-nums">
                  {Math.floor(age)}歳
                </span>
                <span className="text-[10px] font-bold text-amber-300 hidden xs:inline">
                  {chapterInfo.title}
                </span>
              </div>
              <div className="h-3.5 w-px bg-white/15" />
              <div className="flex items-center gap-1.5">
                <div className="w-10 sm:w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-amber-400 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-300 tabular-nums">
                  {Math.round(progressPercent)}%
                </span>
              </div>
            </div>

            {/* Compact Challenge Stage Score/Timer Strip (only during Challenge Stage) */}
            {phase === 'CHALLENGE_PLAYING' && (
              <div className="glass-panel border border-amber-400/70 rounded-lg px-2.5 py-0.5 flex items-center gap-2 text-[10px] font-black shadow">
                <span className="text-amber-300">目標 {challengeTargetScore}pt</span>
                <span className="text-white">
                  現在 <span className="text-amber-300">{formatStatNumber(challengeScore)}</span>pt
                </span>
                <span className="text-sky-300">
                  {Math.max(0, Math.ceil(challengeTimeLeft))}秒
                </span>
              </div>
            )}

            {/* Top-Left Safe-Zone Choice Result & Stat Delta Toast (Compact, 2.0s auto-dismiss, hidden if a new choice gate is active so they never overlap) */}
            {!activeChoicePreview && (deltaEntries.length > 0 || latestFeedback) && (
              <div
                key={latestFeedback?.id || 'delta-toast'}
                data-testid="mobile-stat-toast"
                className="animate-mobile-toast bg-slate-950/90 border border-white/20 px-2.5 py-1.5 rounded-xl shadow-lg pointer-events-none flex flex-col gap-1 max-w-[250px]"
              >
                {latestFeedback && (
                  <div className="text-[10px] leading-snug font-black text-white line-clamp-2">
                    {latestFeedback.subtitle || latestFeedback.title}
                  </div>
                )}
                {deltaEntries.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    {deltaEntries.map(([k, v]) => {
                      const num = v as number;
                      const label = DELTA_LABELS[k as keyof StatDelta] || k;
                      const isPos = num > 0;
                      return (
                        <span
                          key={k}
                          className={`text-[10px] leading-none font-extrabold px-1.5 py-0.5 rounded tabular-nums ${
                            isPos
                              ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/30'
                              : 'bg-rose-500/25 text-rose-300 border border-rose-400/30'
                          }`}
                        >
                          {label} {isPos ? `+${formatStatNumber(num)}` : `-${formatStatNumber(Math.abs(num))}`}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Center in Landscape: Non-overlapping 1-to-1 Choice Route Cards */}
          {flightBounds.isMobileLandscape && renderTopChoiceRouteCards('landscape')}

          {/* Top-Right: Single Small Status Check Icon Button + Pause Icon Button */}
          <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
            <button
              type="button"
              data-testid="mobile-status-btn"
              onClick={() => openMobileSheet('status')}
              aria-label="人生ステータスを確認"
              title="人生ステータス・成長の記録"
              className="glass-panel w-9 h-9 rounded-xl flex items-center justify-center text-sky-300 hover:bg-slate-800/80 shadow-lg active:scale-95 transition"
            >
              <BarChart3 className="w-4 h-4" />
            </button>

            <button
              type="button"
              data-testid="mobile-pause-btn"
              onClick={() => setPhase('PAUSED')}
              aria-label="ポーズ"
              title="ポーズ"
              className="glass-panel w-9 h-9 rounded-xl flex items-center justify-center text-amber-300 hover:bg-slate-800/80 shadow-lg active:scale-95 transition"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Below Top Row in Portrait: Non-overlapping 1-to-1 Choice Route Cards */}
        {flightBounds.isMobilePortrait && renderTopChoiceRouteCards('portrait')}
      </div>
    );
  }

  // ==================== 3. PC DESKTOP HUD LAYOUT (ALWAYS DISPLAYS HAPPINESS & ALL 7 STATS) ====================
  const targetCountryForDebug: CountryId = selectedDebugCountry || country.id;
  const debugCountryParams =
    countryParamsMap[targetCountryForDebug] ||
    DEFAULT_COUNTRY_PARAMETERS[targetCountryForDebug];

  // Compute active stat deltas for PC live stat transition indicators (e.g., "250 → 265 (+15)")
  const pcCombinedDeltas: StatDelta = {};
  for (const fb of feedbacks) {
    for (const [k, v] of Object.entries(fb.deltas)) {
      if (typeof v === 'number' && v !== 0) {
        const key = k as keyof StatDelta;
        pcCombinedDeltas[key] = (pcCombinedDeltas[key] || 0) + v;
      }
    }
  }
  const happinessDelta = pcCombinedDeltas.happiness || 0;
  const prevHappiness = Math.max(0, Math.round(stats.happiness - happinessDelta));

  return (
    <div
      data-testid="pc-flight-hud"
      className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 md:p-5"
    >
      {/* Top Bar: Age, Country, Environment Difficulty, Chapter Progress, Sound & Pause */}
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        {/* Left: Country, Age, Environment Difficulty & Chapter Progress */}
        <div className="glass-panel rounded-2xl px-3.5 py-2 flex flex-wrap items-center gap-3.5 shadow-xl pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{country.flag}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-sky-300">{country.name}生まれ</span>
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-sky-500/25 border border-sky-400/40 text-sky-200">
                  {difficulty}
                </span>
              </div>
              <div className="text-2xl md:text-3xl font-black text-white leading-none mt-0.5">
                {Math.floor(age)}
                <span className="text-sm font-bold text-slate-300 ml-1">歳</span>
              </div>
            </div>
          </div>

          <div className="h-9 w-px bg-white/15 hidden sm:block" />

          {/* Dynamic Life Environment Difficulty Badge (Clickable to open Social Environment Panel) */}
          <button
            type="button"
            onClick={toggleSocialEnvPanel}
            className="text-left bg-slate-900/75 hover:bg-slate-800/90 px-2.5 py-1.5 rounded-xl border border-white/10 transition"
            title="クリックで現在の社会環境・出生条件パネルを表示"
          >
            <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
              <Building2 className="w-3 h-3 text-sky-300" />
              <span>人生環境難易度:</span>
              <span className="font-black text-white">{lifeDifficultyIndex}/100</span>
            </div>
            <div
              className="text-[11px] font-black mt-0.5"
              style={{ color: bandInfo.color }}
            >
              {bandInfo.band}
            </div>
          </button>

          <div className="h-9 w-px bg-white/15 hidden md:block" />

          <div className="min-w-[140px] md:min-w-[200px]">
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span className="text-amber-300">{chapterInfo.title}</span>
              <span className="text-slate-300">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-sky-400 via-indigo-400 to-amber-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5 truncate">
              {conditions.residenceArea}
              {tags.includes('urban_relocated') ? '→都市転居済' : ''} ／ {conditions.economy}
            </div>
          </div>
        </div>

        {/* Center Challenge Banner if in Challenge Stage */}
        {phase === 'CHALLENGE_PLAYING' && (
          <div className="glass-panel border-2 border-amber-400 rounded-2xl px-5 py-2 text-center shadow-2xl animate-pulse">
            <div className="text-xs font-black text-amber-300 uppercase tracking-wider">
              🔥 特別チャレンジ進行中 ({country.flag} {country.name} / 目標 {challengeTargetScore}pt)
            </div>
            <div className="flex items-center justify-center gap-6 mt-1">
              <div className="text-base md:text-lg font-black text-white">
                スコア:{' '}
                <span className="text-amber-300 text-2xl">
                  {formatStatNumber(challengeScore)}
                </span>{' '}
                pt
              </div>
              <div className="text-base md:text-lg font-black text-white">
                残り:{' '}
                <span className="text-sky-300 text-2xl">
                  {Math.max(0, Math.ceil(challengeTimeLeft))}
                </span>{' '}
                秒
              </div>
            </div>
          </div>
        )}

        {/* Right: Social Environment Panel Button, Life Records, Debug Drawer Button, Sound & Pause */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={toggleSocialEnvPanel}
            className={`glass-panel px-3 py-2.5 rounded-xl transition flex items-center gap-1.5 font-bold text-xs shadow-lg ${
              socialEnvPanelOpen
                ? 'border-emerald-400 bg-emerald-500/30 text-white'
                : 'hover:bg-slate-800/80 text-emerald-300'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">社会環境</span>
          </button>

          <button
            type="button"
            onClick={() => openMobileSheet('status')}
            className="glass-panel px-3 py-2.5 rounded-xl hover:bg-slate-800/80 transition flex items-center gap-1.5 font-bold text-xs text-amber-300 shadow-lg"
          >
            <ScrollText className="w-4 h-4" />
            <span className="hidden sm:inline">人生の記録</span>
          </button>

          <button
            type="button"
            onClick={toggleDebugPanel}
            className={`glass-panel px-3 py-2.5 rounded-xl transition flex items-center gap-1.5 font-bold text-xs shadow-lg ${
              debugPanelOpen
                ? 'border-sky-400 bg-sky-500/30 text-white'
                : 'hover:bg-slate-800/80 text-sky-300'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span className="hidden sm:inline">比率・国別デバッグ</span>
          </button>

          <button
            type="button"
            onClick={toggleSound}
            aria-label="音量切り替え"
            className="glass-panel p-2.5 rounded-xl hover:bg-slate-800/80 transition text-white shadow-lg"
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-sky-300" />
            ) : (
              <VolumeX className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {phase === 'PLAYING' && (
            <button
              type="button"
              onClick={() => setPhase('PAUSED')}
              className="glass-panel px-3.5 py-2.5 rounded-xl hover:bg-slate-800/80 transition flex items-center gap-1.5 font-bold text-xs md:text-sm text-white shadow-lg"
            >
              <Pause className="w-4 h-4 text-amber-300" />
              <span>ポーズ</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area: Left Life Stats (Always Visible on PC), Center Popups, Right Social Env / Debug Drawer */}
      <div className="flex items-start justify-between flex-1 mt-2.5 gap-2 min-h-0">
        {/* Left: Always-Visible PC Happiness & 7 Uncapped Life Stats Panel */}
        <div
          data-testid="pc-stats-panel"
          className="glass-panel rounded-2xl p-2.5 md:p-3 w-56 md:w-68 shadow-xl space-y-1.5 pointer-events-auto max-h-[calc(100dvh-185px)] overflow-y-auto"
        >
          <div className="flex items-center justify-between text-[11px] font-extrabold text-sky-300 tracking-wider uppercase border-b border-white/10 pb-1">
            <span>LIFE STATUS（常時表示）</span>
            <span className="text-[10px] text-slate-400 font-semibold">上限なし成長</span>
          </div>

          {/* Featured Happiness Summary Card */}
          <div
            data-testid="pc-happiness-banner"
            className={`rounded-xl px-2.5 py-1.5 border transition-all duration-300 ${
              happinessDelta !== 0
                ? happinessDelta > 0
                  ? 'bg-amber-500/20 border-amber-300/70 shadow-md'
                  : 'bg-rose-500/20 border-rose-400/70 shadow-md'
                : 'bg-slate-900/80 border-amber-400/35'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                <Smile className="w-4 h-4 shrink-0 text-amber-300" />
                <span>幸福度</span>
              </span>
              <div className="flex items-center gap-1.5 tabular-nums">
                {happinessDelta !== 0 ? (
                  <>
                    <span className="text-[11px] font-bold text-slate-300">
                      {formatStatNumber(prevHappiness)} →
                    </span>
                    <span className="text-base md:text-lg font-black text-amber-300">
                      {formatStatNumber(stats.happiness)}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                        happinessDelta > 0
                          ? 'bg-emerald-500/30 text-emerald-200'
                          : 'bg-rose-500/30 text-rose-200'
                      }`}
                    >
                      {happinessDelta > 0
                        ? `+${formatStatNumber(happinessDelta)}`
                        : `-${formatStatNumber(Math.abs(happinessDelta))}`}
                    </span>
                  </>
                ) : (
                  <span className="text-base md:text-lg font-black text-amber-300">
                    {formatStatNumber(stats.happiness)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* All 7 Uncapped Life Status Rows */}
          {STAT_META.map((item) => {
            const Icon = item.icon;
            const val = stats[item.key];
            const delta = pcCombinedDeltas[item.key] || 0;
            const prevVal = Math.max(0, Math.round(val - delta));
            const barInfo = getStatBarProgress(val);
            return (
              <div
                key={item.key}
                data-testid={`pc-stat-row-${item.key}`}
                className={`space-y-0.5 rounded-lg px-1.5 py-0.5 transition-colors duration-300 ${
                  delta !== 0
                    ? delta > 0
                      ? 'bg-emerald-500/15 ring-1 ring-emerald-400/40'
                      : 'bg-rose-500/15 ring-1 ring-rose-400/40'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between text-xs gap-1">
                  <span className="flex items-center gap-1.5 font-bold text-slate-200 truncate">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${item.text}`} />
                    <span className="truncate">{item.label}：</span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0 tabular-nums">
                    {barInfo.tierIndex > 1 && delta === 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-amber-300">
                        {barInfo.tierLabel}
                      </span>
                    )}
                    {delta !== 0 ? (
                      <>
                        <span className="text-[10px] font-semibold text-slate-300">
                          {formatStatNumber(prevVal)} →
                        </span>
                        <span className={`font-black ${item.text}`}>
                          {formatStatNumber(val)}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-1 py-0.2 rounded ${
                            delta > 0
                              ? 'bg-emerald-500/30 text-emerald-200'
                              : 'bg-rose-500/30 text-rose-200'
                          }`}
                        >
                          {delta > 0
                            ? `+${formatStatNumber(delta)}`
                            : `-${formatStatNumber(Math.abs(delta))}`}
                        </span>
                      </>
                    ) : (
                      <span className={`font-black ${item.text}`}>
                        {formatStatNumber(val)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-800/90 rounded-full overflow-hidden flex items-center">
                  <div
                    className={`h-full ${item.color} transition-all duration-300`}
                    style={{ width: `${barInfo.percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Center Active Choice Route Cards & Floating Choice Result Popups */}
        <div className="flex-1 flex flex-col items-center justify-start pt-1 px-2 space-y-2 pointer-events-none">
          {renderTopChoiceRouteCards('pc')}
          {!activeChoicePreview &&
            feedbacks.map((fb) => (
            <div
              key={fb.id}
              className="animate-float-up glass-panel px-5 py-2.5 rounded-2xl border-2 text-center shadow-2xl max-w-md"
              style={{ borderColor: fb.color }}
            >
              <div className="text-sm md:text-base font-black text-white">{fb.title}</div>
              {fb.subtitle && (
                <div className="text-xs text-sky-200 mt-0.5 font-medium">
                  {fb.subtitle}
                </div>
              )}
              {Object.keys(fb.deltas).length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1.5">
                  {Object.entries(fb.deltas).map(([k, v]) => {
                    if (!v) return null;
                    const label = DELTA_LABELS[k as keyof StatDelta] || k;
                    const isPos = v > 0;
                    return (
                      <span
                        key={k}
                        className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full tabular-nums ${
                          isPos
                            ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40'
                            : 'bg-rose-500/25 text-rose-300 border border-rose-400/40'
                        }`}
                      >
                        {label} {isPos ? `+${formatStatNumber(v)}` : `-${formatStatNumber(Math.abs(v))}`}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right Side Drawers: Social Environment Panel & Live Debug Panel */}
        <div className="flex flex-col gap-2.5 items-end">
          {/* 1. In-Game Social Environment Panel */}
          {socialEnvPanelOpen && (
            <div className="glass-panel rounded-2xl p-3.5 w-68 md:w-80 shadow-2xl space-y-2 pointer-events-auto border border-emerald-400/40 max-h-[68vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/15 pb-1.5">
                <span className="text-xs font-black text-emerald-300 uppercase flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                  現在の社会環境・出生条件
                </span>
                <span className="text-xs font-bold text-white">
                  {country.flag} {country.name}
                </span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold">人生環境の難易度:</span>
                  <span className="font-black text-white tabular-nums">
                    {lifeDifficultyIndex} / 100（初期 {initialLifeDifficultyIndex}）
                  </span>
                </div>
                <div
                  className="text-xs font-black mt-0.5"
                  style={{ color: bandInfo.color }}
                >
                  {bandInfo.band}
                </div>
                {latestEnvLog && (
                  <div className="text-[11px] text-sky-200 mt-1 pt-1 border-t border-white/10">
                    📌 直近の変化理由：{latestEnvLog.reason}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="bg-slate-900/60 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">家庭の経済状況</span>
                  <span className="font-bold text-amber-300">{conditions.economy}</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">居住地域</span>
                  <span className="font-bold text-sky-300">
                    {conditions.residenceArea}
                    {tags.includes('urban_relocated') ? '（都市移動済）' : ''}
                  </span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-lg col-span-2">
                  <span className="text-slate-400 block text-[10px]">家庭からの支援</span>
                  <span className="font-bold text-white">{conditions.familySupport}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1 text-[10px] text-center">
                <div className="bg-slate-900/70 p-1.5 rounded">
                  <span className="text-slate-400 block">教育アクセス</span>
                  <span className="font-black text-sky-300">{activeCountryParams.educationAccess}</span>
                </div>
                <div className="bg-slate-900/70 p-1.5 rounded">
                  <span className="text-slate-400 block">医療アクセス</span>
                  <span className="font-black text-emerald-300">{activeCountryParams.medicalAccess}</span>
                </div>
                <div className="bg-slate-900/70 p-1.5 rounded">
                  <span className="text-slate-400 block">雇用機会</span>
                  <span className="font-black text-amber-300">{activeCountryParams.employmentOpportunity}</span>
                </div>
                <div className="bg-slate-900/70 p-1.5 rounded">
                  <span className="text-slate-400 block">社会保障</span>
                  <span className="font-black text-teal-300">{activeCountryParams.socialSecurity}</span>
                </div>
                <div className="bg-slate-900/70 p-1.5 rounded">
                  <span className="text-slate-400 block">地域間格差</span>
                  <span className="font-black text-purple-300">{activeCountryParams.regionalDisparity}</span>
                </div>
                <div className="bg-slate-900/70 p-1.5 rounded">
                  <span className="text-slate-400 block">移動機会</span>
                  <span className="font-black text-indigo-300">{activeCountryParams.socialMobility}</span>
                </div>
              </div>

              {utilizedSupports.length > 0 && (
                <div className="bg-sky-950/50 border border-sky-400/30 p-2 rounded-xl">
                  <div className="text-[10px] font-extrabold text-sky-300">
                    🏛️ 利用した支援制度 ({utilizedSupports.length})
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {utilizedSupports.map((sup, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-sky-500/20 text-sky-200 px-2 py-0.5 rounded-full font-bold"
                      >
                        {sup}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Live Scheduler & Country Parameter Debug Drawer */}
          {debugPanelOpen && (
            <div className="glass-panel rounded-2xl p-3.5 w-72 md:w-80 shadow-2xl space-y-2.5 pointer-events-auto border border-sky-400/40 max-h-[72vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/15 pb-1.5">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setDebugTab('scheduler')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition ${
                      debugTab === 'scheduler'
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    イベント比率
                  </button>
                  <button
                    type="button"
                    onClick={() => setDebugTab('country')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition ${
                      debugTab === 'country'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    国別パラメータ
                  </button>
                </div>

                {debugTab === 'scheduler' ? (
                  <button
                    type="button"
                    onClick={() => setSchedulerWeights(DEFAULT_SCHEDULER_WEIGHTS)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold"
                  >
                    初期値に戻す
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => resetCountryParams(targetCountryForDebug)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold"
                  >
                    初期値に戻す
                  </button>
                )}
              </div>

              {debugTab === 'scheduler' ? (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-bold">アクション難易度:</span>
                    <div className="flex gap-1">
                      {(['EASY', 'NORMAL', 'HARD'] as const).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDifficulty(d)}
                          className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            difficulty === d
                              ? 'bg-sky-500 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(() => {
                    const total =
                      schedulerWeights.mandatoryChoice +
                      schedulerWeights.forcedEvent +
                      schedulerWeights.avoidableObstacle +
                      schedulerWeights.chanceRisk;
                    const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
                    return [
                      {
                        key: 'mandatoryChoice' as const,
                        label: 'A. 必須選択',
                        val: schedulerWeights.mandatoryChoice,
                        color: 'accent-sky-400',
                      },
                      {
                        key: 'forcedEvent' as const,
                        label: 'B. 強制発生',
                        val: schedulerWeights.forcedEvent,
                        color: 'accent-amber-400',
                      },
                      {
                        key: 'avoidableObstacle' as const,
                        label: 'C. 回避障害物',
                        val: schedulerWeights.avoidableObstacle,
                        color: 'accent-rose-400',
                      },
                      {
                        key: 'chanceRisk' as const,
                        label: 'D. チャンス&リスク',
                        val: schedulerWeights.chanceRisk,
                        color: 'accent-purple-400',
                      },
                    ].map((item) => (
                      <div key={item.key} className="space-y-0.5">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-200">{item.label}</span>
                          <span className="text-sky-300 tabular-nums">
                            {item.val} ({pct(item.val)}%)
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
                          className={`w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer ${item.color}`}
                        />
                      </div>
                    ));
                  })()}
                </>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-6 gap-1">
                    {COUNTRIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedDebugCountry(c.id)}
                        className={`p-1 rounded text-xs font-bold border ${
                          targetCountryForDebug === c.id
                            ? 'bg-amber-400/30 border-amber-300 text-white'
                            : 'bg-slate-900 border-white/10 text-slate-400'
                        }`}
                        title={c.name}
                      >
                        {c.flag}
                      </button>
                    ))}
                  </div>

                  {(
                    [
                      { key: 'educationAccess', label: '教育アクセス', min: 0, max: 100, step: 1 },
                      { key: 'medicalAccess', label: '医療アクセス', min: 0, max: 100, step: 1 },
                      { key: 'employmentOpportunity', label: '雇用機会', min: 0, max: 100, step: 1 },
                      { key: 'incomeLivingBalance', label: '経済環境', min: 0, max: 100, step: 1 },
                      { key: 'socialSecurity', label: '社会保障', min: 0, max: 100, step: 1 },
                      { key: 'regionalDisparity', label: '地域間格差', min: 0, max: 100, step: 1 },
                      {
                        key: 'difficultyEventMultiplier',
                        label: '困難イベント影響倍率',
                        min: 0.5,
                        max: 2.0,
                        step: 0.05,
                      },
                    ] as {
                      key: keyof CountrySocialParams;
                      label: string;
                      min: number;
                      max: number;
                      step: number;
                    }[]
                  ).map((item) => {
                    const val = debugCountryParams[item.key];
                    return (
                      <div key={item.key} className="space-y-0.5">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-200">{item.label}</span>
                          <span className="text-amber-300 tabular-nums">
                            {item.key === 'difficultyEventMultiplier'
                              ? `${val.toFixed(2)}x`
                              : val}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={item.min}
                          max={item.max}
                          step={item.step}
                          value={val}
                          onChange={(e) =>
                            updateCountryParams(targetCountryForDebug, {
                              [item.key]: Number(e.target.value),
                            })
                          }
                          className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-amber-400"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!socialEnvPanelOpen && !debugPanelOpen && (
            <div className="hidden md:block w-52" />
          )}
        </div>
      </div>
    </div>
  );
};
