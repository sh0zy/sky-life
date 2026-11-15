import { create } from 'zustand';
import {
  CountryId,
  CountryInfo,
  CountrySocialParams,
  InitialConditions,
  LifeStats,
  ChapterId,
  GamePhase,
  StatDelta,
  HistoryLogItem,
  FloatingFeedback,
  ObstacleDef,
  ChallengeId,
  ChoiceOption,
  LifeEventDef,
  DifficultyLevel,
  SchedulerWeights,
  EnvironmentChangeLog,
} from '../types/game';
import {
  COUNTRIES,
  generateInitialConditions,
} from '../data/gameData';
import { soundEngine } from '../utils/sound';
import {
  applyStatChanges,
  sanitizeStatsObject,
} from '../utils/statSystem';
import {
  DEFAULT_COUNTRY_PARAMETERS,
  loadAllCountryParams,
  saveAllCountryParams,
  sanitizeCountryParams,
  computeDynamicLifeDifficulty,
  evaluateSocialRiskProbability,
  computeChallengeModifiers,
} from '../utils/socialSimulation';
import {
  SafeFlightBounds,
  computeSafeFlightBounds,
} from '../utils/viewportFlightBounds';

const SAVE_KEY = 'skylife_save_v1';
const RECORDS_KEY = 'skylife_records_v1';

export interface PastLifeRecord {
  id: string;
  date: string;
  countryName: string;
  countryFlag: string;
  finalAge: number;
  career: string;
  titleName: string;
  titleDescription: string;
  stats: LifeStats;
  initialDifficulty?: number;
  finalDifficulty?: number;
  economy?: string;
}

interface GameState {
  phase: GamePhase;
  difficulty: DifficultyLevel;
  schedulerWeights: SchedulerWeights;
  debugPanelOpen: boolean;
  socialEnvPanelOpen: boolean;

  // Country social parameter map (customizable in Debug Panel & persisted in localStorage)
  countryParamsMap: Record<CountryId, CountrySocialParams>;

  country: CountryInfo;
  conditions: InitialConditions;
  initialLifeDifficultyIndex: number;
  lifeDifficultyIndex: number;
  envDifficultyOffset: number;
  environmentChangeLogs: EnvironmentChangeLog[];
  utilizedSupports: string[];
  overcomeHardships: string[];

  age: number;
  chapter: ChapterId;
  stats: LifeStats;
  tags: string[];
  career: string;
  usedEventIds: string[];
  usedObstacleIds: string[];
  recentEncounterIds: string[];
  completedChallenges: {
    id: ChallengeId;
    title: string;
    outcome: string;
    score: number;
  }[];
  triggeredChallengeIds: ChallengeId[];
  history: HistoryLogItem[];
  feedbacks: FloatingFeedback[];

  // Active modals / failsafe / challenge states
  activeChoiceEvent: LifeEventDef | null;
  activeObstacle: ObstacleDef | null;
  activeChallengeId: ChallengeId | null;
  challengeScore: number;
  challengeTargetScore: number;
  challengeTimeLeft: number;
  challengeOutcomeText: string;
  challengeSubOutcome: string;

  // Real-time flight control & effects
  inputVector: { x: number; y: number };
  inputSource: 'keyboard' | 'touch';
  isBoosting: boolean;
  flightBounds: SafeFlightBounds;
  mobileSensitivity: number;
  pcSensitivity: number;
  joystickDeadzone: number;
  mobileSheet: 'none' | 'status' | 'records';
  resumePhaseAfterSheet: GamePhase | null;
  cameraShake: number;
  skyDarkness: number;
  growthFlash: boolean;
  soundEnabled: boolean;
  pastRecords: PastLifeRecord[];

  // Actions
  setPhase: (phase: GamePhase) => void;
  setDifficulty: (diff: DifficultyLevel) => void;
  setSchedulerWeights: (weights: Partial<SchedulerWeights>) => void;
  toggleDebugPanel: () => void;
  toggleSocialEnvPanel: () => void;
  updateCountryParams: (countryId: CountryId, partial: Partial<CountrySocialParams>) => void;
  resetCountryParams: (countryId?: CountryId | 'all') => void;
  setInputVector: (x: number, y: number, source?: 'keyboard' | 'touch') => void;
  setBoosting: (boosting: boolean) => void;
  updateViewportSize: (width: number, height: number) => void;
  setMobileSensitivity: (val: number) => void;
  openMobileSheet: (sheet: 'status' | 'records') => void;
  closeMobileSheet: () => void;
  toggleSound: () => void;
  startNewGameSelect: () => void;
  confirmBirthCountry: (countryId: CountryId | 'random') => void;
  beginFlightFromIntro: () => void;
  advanceAge: (deltaYears: number) => void;
  applyChoice: (event: LifeEventDef, choice: ChoiceOption) => void;
  triggerChoiceFailsafe: (event: LifeEventDef) => void;
  resolveChoiceFailsafe: (choice: ChoiceOption) => void;
  applyObstacleDodge: (obstacle: ObstacleDef) => void;
  triggerObstacleHit: (obstacle: ObstacleDef) => void;
  resolveObstacleRecovery: (optionIndex: number) => void;
  enterChallengePortal: (challengeId: ChallengeId) => void;
  startChallengePlay: () => void;
  addChallengeScore: (points: number, feedbackLabel?: string, isNegative?: boolean, extraTag?: string, supportLabel?: string) => void;
  tickChallengeTimer: (dt: number) => void;
  finishChallenge: () => void;
  closeChallengeResult: () => void;
  triggerEnding: () => void;
  saveProgress: () => void;
  loadSavedGame: () => boolean;
  hasSavedGame: () => boolean;
  decayEffects: (dt: number) => void;
}

function getChapterForAge(age: number): ChapterId {
  if (age < 7) return 1;
  if (age < 18) return 2;
  if (age < 30) return 3;
  if (age < 60) return 4;
  return 5;
}

function loadPastRecords(): PastLifeRecord[] {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((rec) => ({
      ...rec,
      stats: sanitizeStatsObject(rec?.stats),
    }));
  } catch {
    return [];
  }
}

export const DEFAULT_SCHEDULER_WEIGHTS: SchedulerWeights = {
  mandatoryChoice: 40,
  forcedEvent: 20,
  avoidableObstacle: 25,
  chanceRisk: 15,
};

export const useGameStore = create<GameState>((set, get) => {
  const initialCountryParamsMap = loadAllCountryParams();
  const defaultInit = generateInitialConditions('japan', initialCountryParamsMap.japan);

  return {
    phase: 'TITLE',
    difficulty: 'NORMAL',
    schedulerWeights: { ...DEFAULT_SCHEDULER_WEIGHTS },
    debugPanelOpen: false,
    socialEnvPanelOpen: false,

    countryParamsMap: initialCountryParamsMap,

    country: COUNTRIES[0],
    conditions: defaultInit.conditions,
    initialLifeDifficultyIndex: defaultInit.initialDifficultyIndex,
    lifeDifficultyIndex: defaultInit.initialDifficultyIndex,
    envDifficultyOffset: 0,
    environmentChangeLogs: [],
    utilizedSupports: [],
    overcomeHardships: [],

    age: 0,
    chapter: 1,
    stats: sanitizeStatsObject(defaultInit.initialStats),
    tags: defaultInit.initialTags,
    career: '未定（これからの選択で開かれます）',
    usedEventIds: [],
    usedObstacleIds: [],
    recentEncounterIds: [],
    completedChallenges: [],
    triggeredChallengeIds: [],
    history: [],
    feedbacks: [],

    activeChoiceEvent: null,
    activeObstacle: null,
    activeChallengeId: null,
    challengeScore: 0,
    challengeTargetScore: 100,
    challengeTimeLeft: 0,
    challengeOutcomeText: '',
    challengeSubOutcome: '',

    inputVector: { x: 0, y: 0 },
    inputSource: 'keyboard',
    isBoosting: false,
    flightBounds: computeSafeFlightBounds(
      typeof window !== 'undefined' ? window.innerWidth : 1280,
      typeof window !== 'undefined' ? window.innerHeight : 720
    ),
    mobileSensitivity: 0.56,
    pcSensitivity: 1.0,
    joystickDeadzone: 0.1,
    mobileSheet: 'none',
    resumePhaseAfterSheet: null,
    cameraShake: 0,
    skyDarkness: 0,
    growthFlash: false,
    soundEnabled: soundEngine.isEnabled(),
    pastRecords: loadPastRecords(),

    setPhase: (phase) => {
      set({ phase, mobileSheet: 'none', resumePhaseAfterSheet: null });
      if (phase === 'TITLE' || phase === 'BIRTH_SELECT') {
        soundEngine.startBGM('title');
      } else if (phase === 'PLAYING') {
        soundEngine.startBGM('flight');
      } else if (phase === 'CHALLENGE_PLAYING') {
        soundEngine.startBGM('challenge');
      } else if (phase === 'ENDING') {
        soundEngine.startBGM('ending');
      }
    },

    setDifficulty: (difficulty) => set({ difficulty }),

    setSchedulerWeights: (partial) =>
      set((state) => ({
        schedulerWeights: { ...state.schedulerWeights, ...partial },
      })),

    toggleDebugPanel: () => set((state) => ({ debugPanelOpen: !state.debugPanelOpen })),

    toggleSocialEnvPanel: () =>
      set((state) => ({ socialEnvPanelOpen: !state.socialEnvPanelOpen })),

    updateCountryParams: (countryId, partial) => {
      const state = get();
      const updatedForCountry = sanitizeCountryParams(countryId, {
        ...state.countryParamsMap[countryId],
        ...partial,
      });
      const nextMap: Record<CountryId, CountrySocialParams> = {
        ...state.countryParamsMap,
        [countryId]: updatedForCountry,
      };
      saveAllCountryParams(nextMap);

      // Recompute current lifeDifficultyIndex if the active country was updated
      const activeParams = nextMap[state.country.id] || DEFAULT_COUNTRY_PARAMETERS[state.country.id];
      const nextDiff = computeDynamicLifeDifficulty({
        countryParams: activeParams,
        conditions: state.conditions,
        stats: state.stats,
        tags: state.tags,
        envDifficultyOffset: state.envDifficultyOffset,
      });

      set({
        countryParamsMap: nextMap,
        lifeDifficultyIndex: nextDiff.index,
      });
    },

    resetCountryParams: (countryId = 'all') => {
      const state = get();
      let nextMap: Record<CountryId, CountrySocialParams>;
      if (countryId === 'all') {
        nextMap = {
          japan: { ...DEFAULT_COUNTRY_PARAMETERS.japan },
          usa: { ...DEFAULT_COUNTRY_PARAMETERS.usa },
          brazil: { ...DEFAULT_COUNTRY_PARAMETERS.brazil },
          india: { ...DEFAULT_COUNTRY_PARAMETERS.india },
          kenya: { ...DEFAULT_COUNTRY_PARAMETERS.kenya },
          france: { ...DEFAULT_COUNTRY_PARAMETERS.france },
        };
      } else {
        nextMap = {
          ...state.countryParamsMap,
          [countryId]: { ...DEFAULT_COUNTRY_PARAMETERS[countryId] },
        };
      }
      saveAllCountryParams(nextMap);

      const activeParams = nextMap[state.country.id] || DEFAULT_COUNTRY_PARAMETERS[state.country.id];
      const nextDiff = computeDynamicLifeDifficulty({
        countryParams: activeParams,
        conditions: state.conditions,
        stats: state.stats,
        tags: state.tags,
        envDifficultyOffset: state.envDifficultyOffset,
      });

      set({
        countryParamsMap: nextMap,
        lifeDifficultyIndex: nextDiff.index,
      });
    },

    setInputVector: (x, y, source = 'keyboard') =>
      set({ inputVector: { x, y }, inputSource: source }),

    setBoosting: (boosting) => {
      const prev = get().isBoosting;
      if (boosting && !prev) {
        soundEngine.playBoost();
      }
      set({ isBoosting: boosting });
    },

    updateViewportSize: (width, height) => {
      const nextBounds = computeSafeFlightBounds(width, height);
      set({ flightBounds: nextBounds });
    },

    setMobileSensitivity: (val) => {
      const clamped = Math.min(1.0, Math.max(0.3, val));
      set({ mobileSensitivity: clamped });
    },

    openMobileSheet: (sheet) => {
      const state = get();
      const currentPhase = state.phase;
      if (currentPhase === 'PLAYING' || currentPhase === 'CHALLENGE_PLAYING') {
        set({
          mobileSheet: sheet,
          resumePhaseAfterSheet: currentPhase,
          phase: 'PAUSED',
          isBoosting: false,
          inputVector: { x: 0, y: 0 },
        });
      } else {
        set({
          mobileSheet: sheet,
          isBoosting: false,
          inputVector: { x: 0, y: 0 },
        });
      }
    },

    closeMobileSheet: () => {
      const state = get();
      const targetPhase = state.resumePhaseAfterSheet || 'PLAYING';
      set({
        mobileSheet: 'none',
        resumePhaseAfterSheet: null,
        phase: state.phase === 'PAUSED' ? targetPhase : state.phase,
        isBoosting: false,
        inputVector: { x: 0, y: 0 },
      });
    },

    toggleSound: () => {
      const next = !get().soundEnabled;
      soundEngine.setEnabled(next);
      set({ soundEnabled: next });
    },

    startNewGameSelect: () => {
      soundEngine.playChoiceSuccess();
      soundEngine.startBGM('title');
      set({ phase: 'BIRTH_SELECT' });
    },

    confirmBirthCountry: (countryId) => {
      const state = get();
      const chosenCountry =
        countryId === 'random'
          ? COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)]
          : COUNTRIES.find((c) => c.id === countryId) || COUNTRIES[0];

      const countryParams =
        state.countryParamsMap[chosenCountry.id] || DEFAULT_COUNTRY_PARAMETERS[chosenCountry.id];

      const { conditions, initialStats, initialTags, initialDifficultyIndex } =
        generateInitialConditions(chosenCountry.id, countryParams);

      const birthHistory: HistoryLogItem = {
        id: `birth_${Date.now()}`,
        age: 0,
        chapter: 1,
        type: 'birth',
        title: `${chosenCountry.name}で誕生（初期環境難易度: ${initialDifficultyIndex}）`,
        detail: `${conditions.economy} ／ ${conditions.residenceArea} ／ ${conditions.familySupport} ／ 得意：${conditions.specialty}`,
      };

      const initialEnvLog: EnvironmentChangeLog = {
        id: `env_birth_${Date.now()}`,
        age: 0,
        prevDifficulty: initialDifficultyIndex,
        nextDifficulty: initialDifficultyIndex,
        delta: 0,
        reason: `${chosenCountry.name}（${conditions.residenceArea}・${conditions.economy}）として人生をスタートしました`,
        createdAt: Date.now(),
      };

      soundEngine.playGrowthFanfare();

      set({
        phase: 'BIRTH_INTRO',
        country: chosenCountry,
        conditions,
        initialLifeDifficultyIndex: initialDifficultyIndex,
        lifeDifficultyIndex: initialDifficultyIndex,
        envDifficultyOffset: 0,
        environmentChangeLogs: [initialEnvLog],
        utilizedSupports: [],
        overcomeHardships: [],
        age: 0,
        chapter: 1,
        stats: sanitizeStatsObject(initialStats),
        tags: initialTags,
        career: '旅立ちの空（探究中）',
        usedEventIds: [],
        usedObstacleIds: [],
        recentEncounterIds: [],
        completedChallenges: [],
        triggeredChallengeIds: [],
        history: [birthHistory],
        feedbacks: [],
        activeChoiceEvent: null,
        activeObstacle: null,
        activeChallengeId: null,
        skyDarkness: 0,
        cameraShake: 0,
      });
    },

    beginFlightFromIntro: () => {
      soundEngine.playPortalEnter();
      soundEngine.startBGM('flight');
      set({ phase: 'PLAYING' });
      get().saveProgress();
    },

    advanceAge: (deltaYears) => {
      const state = get();
      if (state.phase !== 'PLAYING') return;

      const nextAge = Math.min(82, state.age + deltaYears);
      const prevFloor = Math.floor(state.age);
      const nextFloor = Math.floor(nextAge);
      const nextChapter = getChapterForAge(nextAge);

      const growthMilestones = [7, 18, 30, 60];
      let triggeredGrowth = false;
      for (const m of growthMilestones) {
        if (prevFloor < m && nextFloor >= m) {
          triggeredGrowth = true;
          break;
        }
      }

      if (triggeredGrowth) {
        soundEngine.playGrowthFanfare();
        const stageNames: Record<number, string> = {
          7: '子ども・学生時代へ成長！',
          18: '青年期へ成長！広い社会へ！',
          30: '大人・成熟期へ成長！',
          60: '黄金のシニア期へ！',
        };
        const { nextStats, appliedDeltas } = applyStatChanges(
          state.stats,
          { happiness: 15, resilience: 10 },
          {
            chapter: nextChapter,
            tags: state.tags,
            difficulty: state.difficulty,
            isMajorSuccess: true,
          }
        );
        const fb: FloatingFeedback = {
          id: `growth_${Date.now()}`,
          title: stageNames[nextFloor] || '新しい章へ突入！',
          subtitle: 'キャラクターの姿と空の景色が変化しました',
          deltas: appliedDeltas,
          color: '#38bdf8',
          createdAt: Date.now(),
        };
        set({
          age: nextAge,
          chapter: nextChapter,
          stats: nextStats,
          growthFlash: true,
          feedbacks: [...state.feedbacks.slice(-3), fb],
        });
        setTimeout(() => set({ growthFlash: false }), 1200);
        get().saveProgress();
      } else {
        set({ age: nextAge, chapter: nextChapter });
      }

      if (nextAge >= 82) {
        get().triggerEnding();
      }
    },

    applyChoice: (event, choice) => {
      const state = get();
      const countryParams =
        state.countryParamsMap[state.country.id] || DEFAULT_COUNTRY_PARAMETERS[state.country.id];

      let finalMessage = choice.resultMessage;
      let mergedDeltas: StatDelta = { ...choice.deltas };
      const newTags = [...state.tags, ...(choice.addTags || [])];
      let hasCausalBreakthrough = false;
      let isRiskFailure = false;

      // 1. Evaluate Type D Chance & Risk outcome using Effort + Skill + Support + Social Environment + Luck
      if (choice.riskConfig) {
        const rc = choice.riskConfig;
        const { probability } = evaluateSocialRiskProbability(rc, {
          stats: state.stats,
          tags: state.tags,
          conditions: state.conditions,
          countryParams,
          lifeDifficultyIndex: state.lifeDifficultyIndex,
          difficulty: state.difficulty,
        });

        const succeeded = Math.random() < probability;

        if (succeeded) {
          hasCausalBreakthrough = true;
          finalMessage = `${rc.successMessage}（成功率 約${Math.round(probability * 100)}%を突破！）`;
          mergedDeltas = { ...rc.successDeltas };
          if (rc.successAddTags) newTags.push(...rc.successAddTags);
        } else {
          isRiskFailure = true;
          finalMessage = `${rc.failureMessage}（成功率 約${Math.round(probability * 100)}%）`;
          mergedDeltas = { ...rc.failureDeltas };
          if (rc.failureAddTags) newTags.push(...rc.failureAddTags);
        }
      }

      // 2. Check conditional causal overrides from past choices
      if (choice.conditionalOverrides) {
        for (const ov of choice.conditionalOverrides) {
          if (state.tags.includes(ov.requiredTag)) {
            hasCausalBreakthrough = true;
            finalMessage = `【過去の経験が連鎖！】${ov.bonusMessage}`;
            Object.entries(ov.bonusDeltas).forEach(([k, v]) => {
              const key = k as keyof StatDelta;
              mergedDeltas[key] = (mergedDeltas[key] || 0) + (v || 0);
            });
            if (ov.addTags) {
              newTags.push(...ov.addTags);
            }
          }
        }
      }

      // 3. Adjust cost burdens slightly by country parameters (e.g., education/medical cost burden)
      if ((mergedDeltas.money || 0) < 0) {
        const mult = countryParams.difficultyEventMultiplier || 1.0;
        mergedDeltas.money = Math.round((mergedDeltas.money || 0) * mult);
      }

      if (isRiskFailure) {
        soundEngine.playObstacleHit();
      } else {
        soundEngine.playChoiceSuccess();
      }

      const uniqueTags = Array.from(new Set(newTags));
      const { nextStats, appliedDeltas } = applyStatChanges(state.stats, mergedDeltas, {
        chapter: state.chapter,
        tags: uniqueTags,
        difficulty: state.difficulty,
        isMajorSuccess: hasCausalBreakthrough,
        isObstacleImpact: isRiskFailure,
      });

      // 4. Track Utilized Support Systems & Dynamic Life Environment Difficulty Change
      const nextSupports = choice.supportUsedLabel
        ? Array.from(new Set([...state.utilizedSupports, choice.supportUsedLabel]))
        : state.utilizedSupports;

      const nextOffset = state.envDifficultyOffset + (choice.environmentDifficultyMod || 0);
      const prevDiff = state.lifeDifficultyIndex;
      const nextDiffObj = computeDynamicLifeDifficulty({
        countryParams,
        conditions: state.conditions,
        stats: nextStats,
        tags: uniqueTags,
        envDifficultyOffset: nextOffset,
      });
      const diffDelta = nextDiffObj.index - prevDiff;

      const nextEnvLogs = [...state.environmentChangeLogs];
      const extraFeedbacks: FloatingFeedback[] = [];

      if (choice.environmentChangeReason || Math.abs(diffDelta) >= 3) {
        const reasonText =
          choice.environmentChangeReason ||
          (diffDelta < 0
            ? 'スキルと経験の蓄積により、人生環境の選択肢が広がりました'
            : '資金や体調の変動により、生活環境の課題が変化しました');

        nextEnvLogs.push({
          id: `env_${Date.now()}_${Math.random()}`,
          age: Math.floor(state.age),
          prevDifficulty: prevDiff,
          nextDifficulty: nextDiffObj.index,
          delta: diffDelta,
          reason: reasonText,
          createdAt: Date.now(),
        });

        extraFeedbacks.push({
          id: `fb_env_${Date.now()}`,
          title: `🌐 社会環境変化：難易度 ${prevDiff} → ${nextDiffObj.index}`,
          subtitle: reasonText,
          deltas: {},
          color: diffDelta <= 0 ? '#34d399' : '#fbbf24',
          createdAt: Date.now(),
        });
      }

      const logItem: HistoryLogItem = {
        id: `choice_${Date.now()}_${Math.random()}`,
        age: Math.floor(state.age),
        chapter: state.chapter,
        type: 'choice',
        title: `${event.title}：「${choice.label}」を選択`,
        detail: choice.environmentChangeReason
          ? `${finalMessage} （🌐 ${choice.environmentChangeReason}）`
          : finalMessage,
        deltas: appliedDeltas,
      };

      const fb: FloatingFeedback = {
        id: `fb_${Date.now()}_${Math.random()}`,
        title: choice.label,
        subtitle: finalMessage,
        deltas: appliedDeltas,
        color: isRiskFailure ? '#f87171' : choice.color,
        createdAt: Date.now(),
      };

      set({
        stats: nextStats,
        tags: uniqueTags,
        career: choice.careerSet || state.career,
        lifeDifficultyIndex: nextDiffObj.index,
        envDifficultyOffset: nextOffset,
        environmentChangeLogs: nextEnvLogs.slice(-15),
        utilizedSupports: nextSupports,
        usedEventIds: Array.from(new Set([...state.usedEventIds, event.id])),
        recentEncounterIds: [...state.recentEncounterIds.slice(-5), event.id],
        history: [...state.history, logItem],
        feedbacks: [...state.feedbacks.slice(-2), fb, ...extraFeedbacks].slice(-4),
        cameraShake: isRiskFailure ? 0.6 : state.cameraShake,
      });

      get().saveProgress();
    },

    triggerChoiceFailsafe: (event) => {
      set({
        phase: 'CHOICE_FAILSAFE_MODAL',
        activeChoiceEvent: event,
        isBoosting: false,
      });
    },

    resolveChoiceFailsafe: (choice) => {
      const state = get();
      const ev = state.activeChoiceEvent;
      if (!ev) {
        set({ phase: 'PLAYING' });
        return;
      }
      set({ activeChoiceEvent: null, phase: 'PLAYING' });
      get().applyChoice(ev, choice);
    },

    applyObstacleDodge: (obstacle) => {
      const state = get();
      const { nextStats, appliedDeltas } = applyStatChanges(
        state.stats,
        { resilience: 14, happiness: 8 },
        {
          chapter: state.chapter,
          tags: state.tags,
          difficulty: state.difficulty,
        }
      );

      set({
        skyDarkness: 0,
        stats: nextStats,
        overcomeHardships: Array.from(new Set([...state.overcomeHardships, `${obstacle.title}（回避成功）`])),
        recentEncounterIds: [...state.recentEncounterIds.slice(-5), obstacle.id],
        feedbacks: [
          ...state.feedbacks.slice(-3),
          {
            id: `dodge_${Date.now()}`,
            title: `${obstacle.categoryLabel}を華麗に回避！`,
            subtitle: '冷静な判断でトラブルを未然に防いだ！',
            deltas: appliedDeltas,
            color: '#38bdf8',
            createdAt: Date.now(),
          },
        ],
      });
    },

    triggerObstacleHit: (obstacle) => {
      const state = get();
      soundEngine.playObstacleHit();

      const countryParams =
        state.countryParamsMap[state.country.id] || DEFAULT_COUNTRY_PARAMETERS[state.country.id];
      const mult = countryParams.difficultyEventMultiplier || 1.0;

      // Scale obstacle initial impact by country's difficultyEventMultiplier & specific burden
      const scaledImpact: StatDelta = {};
      Object.entries(obstacle.impactDeltas).forEach(([k, v]) => {
        if (typeof v === 'number') {
          let envScale = mult;
          if (obstacle.envDriver === 'medicalBurden' && k === 'money') {
            envScale *= 0.65 + (countryParams.medicalCostBurden / 100) * 0.75;
            if (state.tags.includes('health_insurance_secured') || state.tags.includes('social_security_utilized')) {
              envScale *= 0.6;
            }
          } else if (obstacle.envDriver === 'educationBarrier' && k === 'money') {
            envScale *= 0.65 + (countryParams.educationCostBurden / 100) * 0.7;
          }
          scaledImpact[k as keyof StatDelta] = Math.round(v * envScale);
        }
      });

      const { nextStats, appliedDeltas } = applyStatChanges(
        state.stats,
        scaledImpact,
        {
          chapter: state.chapter,
          tags: state.tags,
          difficulty: state.difficulty,
          isObstacleImpact: true,
        }
      );

      const logItem: HistoryLogItem = {
        id: `obs_${Date.now()}`,
        age: Math.floor(state.age),
        chapter: state.chapter,
        type: obstacle.unavoidable ? 'forced_event' : 'obstacle',
        title: `${obstacle.categoryLabel}：${obstacle.title}`,
        detail: obstacle.subtitle,
        deltas: appliedDeltas,
      };

      set({
        phase: obstacle.unavoidable ? 'FORCED_EVENT_MODAL' : 'RECOVERY_MODAL',
        activeObstacle: obstacle,
        stats: nextStats,
        usedObstacleIds: Array.from(new Set([...state.usedObstacleIds, obstacle.id])),
        recentEncounterIds: [...state.recentEncounterIds.slice(-5), obstacle.id],
        history: [...state.history, logItem],
        cameraShake: 1.0,
        skyDarkness: 0.85,
        isBoosting: false,
      });
    },

    resolveObstacleRecovery: (optionIndex) => {
      const state = get();
      const obs = state.activeObstacle;
      if (!obs) {
        set({ phase: 'PLAYING', skyDarkness: 0 });
        return;
      }

      const opt = obs.recoveryOptions[optionIndex] || obs.recoveryOptions[0];
      soundEngine.playChoiceSuccess();

      const countryParams =
        state.countryParamsMap[state.country.id] || DEFAULT_COUNTRY_PARAMETERS[state.country.id];

      const uniqueTags = Array.from(new Set([...state.tags, ...(opt.addTags || [])]));
      const { nextStats, appliedDeltas } = applyStatChanges(state.stats, opt.deltas, {
        chapter: state.chapter,
        tags: uniqueTags,
        difficulty: state.difficulty,
        isMajorSuccess: true,
      });

      const nextSupports = opt.supportUsedLabel
        ? Array.from(new Set([...state.utilizedSupports, opt.supportUsedLabel]))
        : state.utilizedSupports;

      const nextHardships = Array.from(
        new Set([...state.overcomeHardships, `${obs.title}（${opt.label}）`])
      );

      const nextOffset = state.envDifficultyOffset + (opt.environmentDifficultyMod || 0);
      const prevDiff = state.lifeDifficultyIndex;
      const nextDiffObj = computeDynamicLifeDifficulty({
        countryParams,
        conditions: state.conditions,
        stats: nextStats,
        tags: uniqueTags,
        envDifficultyOffset: nextOffset,
      });
      const diffDelta = nextDiffObj.index - prevDiff;

      const nextEnvLogs = [...state.environmentChangeLogs];
      const extraFeedbacks: FloatingFeedback[] = [];

      if (opt.environmentChangeReason || Math.abs(diffDelta) >= 3) {
        const reasonText =
          opt.environmentChangeReason ||
          '困難への対処を通じて、生活環境の課題が緩和されました';
        nextEnvLogs.push({
          id: `env_rec_${Date.now()}`,
          age: Math.floor(state.age),
          prevDifficulty: prevDiff,
          nextDifficulty: nextDiffObj.index,
          delta: diffDelta,
          reason: reasonText,
          createdAt: Date.now(),
        });
        extraFeedbacks.push({
          id: `fb_env_rec_${Date.now()}`,
          title: `🌐 社会環境変化：難易度 ${prevDiff} → ${nextDiffObj.index}`,
          subtitle: reasonText,
          deltas: {},
          color: '#34d399',
          createdAt: Date.now(),
        });
      }

      const logItem: HistoryLogItem = {
        id: `rec_${Date.now()}`,
        age: Math.floor(state.age),
        chapter: state.chapter,
        type: 'recovery',
        title: `対処・再起の選択：「${opt.label}」`,
        detail: opt.environmentChangeReason
          ? `${opt.resultMessage} （🌐 ${opt.environmentChangeReason}）`
          : opt.resultMessage,
        deltas: appliedDeltas,
      };

      const fb: FloatingFeedback = {
        id: `fb_rec_${Date.now()}`,
        title: `決断：${opt.label}`,
        subtitle: opt.resultMessage,
        deltas: appliedDeltas,
        color: '#34d399',
        createdAt: Date.now(),
      };

      set({
        phase: 'PLAYING',
        activeObstacle: null,
        stats: nextStats,
        tags: uniqueTags,
        lifeDifficultyIndex: nextDiffObj.index,
        envDifficultyOffset: nextOffset,
        environmentChangeLogs: nextEnvLogs.slice(-15),
        utilizedSupports: nextSupports,
        overcomeHardships: nextHardships,
        history: [...state.history, logItem],
        feedbacks: [...state.feedbacks.slice(-2), fb, ...extraFeedbacks].slice(-4),
        skyDarkness: 0,
      });

      get().saveProgress();
    },

    enterChallengePortal: (challengeId) => {
      const state = get();
      soundEngine.playPortalEnter();

      const countryParams =
        state.countryParamsMap[state.country.id] || DEFAULT_COUNTRY_PARAMETERS[state.country.id];

      const mods = computeChallengeModifiers(challengeId, {
        countryId: state.country.id,
        countryName: state.country.name,
        countryParams,
        conditions: state.conditions,
        stats: state.stats,
        tags: state.tags,
        lifeDifficultyIndex: state.lifeDifficultyIndex,
      });

      const durationByDiff =
        state.difficulty === 'EASY' ? 22 : state.difficulty === 'HARD' ? 17 : 19;

      set({
        phase: 'CHALLENGE_INTRO',
        activeChallengeId: challengeId,
        triggeredChallengeIds: [...state.triggeredChallengeIds, challengeId],
        challengeScore: mods.initialPrepScore,
        challengeTargetScore: mods.targetScore,
        challengeTimeLeft: durationByDiff,
        isBoosting: false,
      });
    },

    startChallengePlay: () => {
      const state = get();
      soundEngine.playChoiceSuccess();
      soundEngine.startBGM('challenge');
      const durationByDiff =
        state.difficulty === 'EASY' ? 22 : state.difficulty === 'HARD' ? 17 : 19;
      set({
        phase: 'CHALLENGE_PLAYING',
        challengeTimeLeft: durationByDiff,
      });
    },

    addChallengeScore: (points, feedbackLabel, isNegative = false, extraTag, supportLabel) => {
      const state = get();
      if (isNegative) {
        soundEngine.playObstacleHit();
      } else {
        soundEngine.playChoiceSuccess();
      }

      const nextScore = Math.max(0, state.challengeScore + points);
      const nextTags = extraTag
        ? Array.from(new Set([...state.tags, extraTag]))
        : state.tags;
      const nextSupports = supportLabel
        ? Array.from(new Set([...state.utilizedSupports, supportLabel]))
        : state.utilizedSupports;

      const fb: FloatingFeedback = {
        id: `ch_fb_${Date.now()}_${Math.random()}`,
        title: feedbackLabel || (points >= 0 ? `+${points} pt!` : `${points} pt`),
        deltas: {},
        color: isNegative ? '#f87171' : '#facc15',
        createdAt: Date.now(),
      };

      set({
        challengeScore: nextScore,
        tags: nextTags,
        utilizedSupports: nextSupports,
        cameraShake: isNegative ? 0.6 : state.cameraShake,
        feedbacks: [...state.feedbacks.slice(-3), fb],
      });
    },

    tickChallengeTimer: (dt) => {
      const state = get();
      if (state.phase !== 'CHALLENGE_PLAYING') return;
      const nextTime = state.challengeTimeLeft - dt;
      if (nextTime <= 0) {
        get().finishChallenge();
      } else {
        set({ challengeTimeLeft: nextTime });
      }
    },

    finishChallenge: () => {
      const state = get();
      const cid = state.activeChallengeId;
      if (!cid) return;

      soundEngine.playChallengeSuccess();
      const score = state.challengeScore;
      const target = state.challengeTargetScore || 100;
      const countryParams =
        state.countryParamsMap[state.country.id] || DEFAULT_COUNTRY_PARAMETERS[state.country.id];
      const mods = computeChallengeModifiers(cid, {
        countryId: state.country.id,
        countryName: state.country.name,
        countryParams,
        conditions: state.conditions,
        stats: state.stats,
        tags: state.tags,
        lifeDifficultyIndex: state.lifeDifficultyIndex,
      });

      let outcomeTitle = '';
      let subText = '';
      let rawDeltas: StatDelta = {};
      let newCareer = state.career;
      const addedTags: string[] = [];
      let envMod = 0;
      let envReason = '';

      if (cid === 'exam') {
        if (score >= target) {
          outcomeTitle = `第一志望・難関進学に大合格！（${state.country.name}）`;
          subText =
            '環境や費用のハードルを知識と準備で見事に突破し、憧れのキャンパスへの扉が開かれました！';
          rawDeltas = { knowledge: 95, selfActualization: 75, happiness: 80, resilience: 55 };
          addedTags.push('scholarship_secured');
          envMod = -6;
          envReason = '高等教育への進学を達成したことで、将来のキャリア機会が大きく広がりました';
        } else if (score >= target - 30) {
          outcomeTitle = `${mods.alternativeRouteLabel}へ進学達成！`;
          subText =
            '自分の環境に合った現実的で特色ある進学ルートを選び取り、専門知識と良き仲間を得ました！';
          rawDeltas = { knowledge: 70, relationships: 70, happiness: 65, resilience: 55 };
          addedTags.push('vocational_trained');
          envMod = -4;
          envReason = `${mods.alternativeRouteLabel}への進学により、実践的なスキルと機会を獲得しました`;
        } else {
          outcomeTitle = '進学の壁と実務・再挑戦ルート！';
          subText =
            '希望の進学条件には届きませんでしたが、働きながら学び直す不屈のレジリエンスが鍛えられました！（後のキャリア挑戦でボーナス発動）';
          rawDeltas = { resilience: 105, selfActualization: 65, knowledge: 55, happiness: -12 };
          addedTags.push('overcame_failure', 'vocational_trained');
          envMod = -3;
          envReason = '挫折から実務と学び直しを選んだことで、現場での対応力が身につきました';
        }
      } else if (cid === 'career') {
        if (score >= target) {
          outcomeTitle = `理想のキャリア・プロジェクト大成功！（${state.country.name}）`;
          subText =
            '社会の雇用環境や競争の気流を乗りこなし、自分の強みを活かせるポジションを確立しました！';
          rawDeltas = { money: 145, selfActualization: 115, knowledge: 90, happiness: 85 };
          if (newCareer.includes('探究中')) newCareer = '次世代プロジェクトリーダー';
          envMod = -6;
          envReason = '安定した専門キャリアの確立により、経済的・社会的な基盤が強化されました';
        } else if (score >= target - 30) {
          outcomeTitle = `${mods.alternativeRouteLabel}で着実に躍進！`;
          subText =
            '資格・スキルや新しい働き方を活用し、環境に左右されない確かな職能と信頼を築きました！';
          rawDeltas = { money: 95, relationships: 85, knowledge: 78, resilience: 68 };
          if (newCareer.includes('探究中')) newCareer = 'プロフェッショナル・スペシャリスト';
          envMod = -4;
          envReason = '実務スキルと信頼の獲得により、雇用の安定性が高まりました';
        } else {
          outcomeTitle = 'キャリアの再定義・独自スタイルの開拓！';
          subText =
            '既存の求人枠にとらわれず、地域やオンラインで自分らしく働く新しい道を見つけ出しました！';
          rawDeltas = { resilience: 110, selfActualization: 95, health: 70, happiness: 55 };
          if (newCareer.includes('探究中')) newCareer = 'インディペンデント・クリエイター';
          addedTags.push('overcame_failure');
        }
      } else {
        if (score >= target) {
          outcomeTitle = '起業・人生の羅針盤で大飛躍！';
          subText =
            '資金調達や社会制度、家族との調和を見事に結びつけ、あなただけの誇り高い生き方を確立しました！';
          rawDeltas = {
            happiness: 150,
            selfActualization: 135,
            relationships: 115,
            money: 110,
            resilience: 100,
          };
          envMod = -5;
          envReason = '人生中盤の転機を乗り越え、揺るぎない生活と心の基盤が完成しました';
        } else {
          outcomeTitle = '温かな調和と共生の航路を選択！';
          subText =
            '無理な拡大よりも身近な幸せと支え合いを選び、心穏やかで味わい深い人生の景色を作りました！';
          rawDeltas = {
            happiness: 115,
            resilience: 115,
            relationships: 105,
            health: 85,
            selfActualization: 95,
          };
        }
      }

      const nextTags = Array.from(new Set([...state.tags, ...addedTags]));
      const { nextStats, appliedDeltas } = applyStatChanges(state.stats, rawDeltas, {
        chapter: state.chapter,
        tags: nextTags,
        difficulty: state.difficulty,
        isMajorSuccess: true,
      });

      const nextOffset = state.envDifficultyOffset + envMod;
      const prevDiff = state.lifeDifficultyIndex;
      const nextDiffObj = computeDynamicLifeDifficulty({
        countryParams,
        conditions: state.conditions,
        stats: nextStats,
        tags: nextTags,
        envDifficultyOffset: nextOffset,
      });

      const nextEnvLogs = [...state.environmentChangeLogs];
      if (envReason) {
        nextEnvLogs.push({
          id: `env_chal_${Date.now()}`,
          age: Math.floor(state.age),
          prevDifficulty: prevDiff,
          nextDifficulty: nextDiffObj.index,
          delta: nextDiffObj.index - prevDiff,
          reason: envReason,
          createdAt: Date.now(),
        });
      }

      const stageNameMap: Record<ChallengeId, string> = {
        exam: '受験・進学チャレンジ',
        career: '就職・キャリアチャレンジ',
        crossroads: '起業・人生の分かれ道チャレンジ',
      };

      const logItem: HistoryLogItem = {
        id: `chal_${Date.now()}`,
        age: Math.floor(state.age),
        chapter: state.chapter,
        type: 'challenge',
        title: `${stageNameMap[cid]}：${outcomeTitle}`,
        detail: `${subText} (スコア: ${score}pt / 目標: ${target}pt)`,
        deltas: appliedDeltas,
      };

      set({
        phase: 'CHALLENGE_RESULT',
        stats: nextStats,
        tags: nextTags,
        career: newCareer,
        lifeDifficultyIndex: nextDiffObj.index,
        envDifficultyOffset: nextOffset,
        environmentChangeLogs: nextEnvLogs.slice(-15),
        overcomeHardships: Array.from(
          new Set([...state.overcomeHardships, `${stageNameMap[cid]}（${outcomeTitle}）`])
        ),
        challengeOutcomeText: outcomeTitle,
        challengeSubOutcome: subText,
        completedChallenges: [
          ...state.completedChallenges,
          { id: cid, title: stageNameMap[cid], outcome: outcomeTitle, score },
        ],
        history: [...state.history, logItem],
      });
    },

    closeChallengeResult: () => {
      soundEngine.startBGM('flight');
      set({
        phase: 'PLAYING',
        activeChallengeId: null,
      });
      get().saveProgress();
    },

    triggerEnding: () => {
      const state = get();
      soundEngine.startBGM('ending');
      soundEngine.playChallengeSuccess();

      const safeStats = sanitizeStatsObject(state.stats);
      const titleObj = evaluateLifeTitle(
        safeStats,
        state.tags,
        state.initialLifeDifficultyIndex,
        state.lifeDifficultyIndex
      );

      const newRecord: PastLifeRecord = {
        id: `rec_${Date.now()}`,
        date: new Date().toLocaleDateString('ja-JP'),
        countryName: state.country.name,
        countryFlag: state.country.flag,
        finalAge: Math.max(80, Math.floor(state.age)),
        career: state.career,
        titleName: titleObj.title,
        titleDescription: titleObj.description,
        stats: safeStats,
        initialDifficulty: state.initialLifeDifficultyIndex,
        finalDifficulty: state.lifeDifficultyIndex,
        economy: state.conditions.economy,
      };

      const updatedRecords = [newRecord, ...state.pastRecords].slice(0, 12);
      try {
        localStorage.setItem(RECORDS_KEY, JSON.stringify(updatedRecords));
        localStorage.removeItem(SAVE_KEY);
      } catch {
        // ignore
      }

      set({
        phase: 'ENDING',
        age: Math.max(80, Math.floor(state.age)),
        stats: safeStats,
        pastRecords: updatedRecords,
        isBoosting: false,
      });
    },

    saveProgress: () => {
      const state = get();
      if (state.phase === 'TITLE' || state.phase === 'ENDING') return;
      try {
        const payload = {
          version: 3,
          difficulty: state.difficulty,
          schedulerWeights: state.schedulerWeights,
          country: state.country,
          conditions: state.conditions,
          initialLifeDifficultyIndex: state.initialLifeDifficultyIndex,
          lifeDifficultyIndex: state.lifeDifficultyIndex,
          envDifficultyOffset: state.envDifficultyOffset,
          environmentChangeLogs: state.environmentChangeLogs,
          utilizedSupports: state.utilizedSupports,
          overcomeHardships: state.overcomeHardships,
          age: state.age,
          chapter: state.chapter,
          stats: sanitizeStatsObject(state.stats),
          tags: state.tags,
          career: state.career,
          usedEventIds: state.usedEventIds,
          usedObstacleIds: state.usedObstacleIds,
          recentEncounterIds: state.recentEncounterIds,
          completedChallenges: state.completedChallenges,
          triggeredChallengeIds: state.triggeredChallengeIds,
          history: state.history,
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      } catch {
        // ignore storage quota errors
      }
    },

    hasSavedGame: () => {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        return Boolean(data && typeof data.age === 'number');
      } catch {
        return false;
      }
    },

    loadSavedGame: () => {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (!data || typeof data.age !== 'number') return false;

        soundEngine.playPortalEnter();
        soundEngine.startBGM('flight');

        const state = get();
        const savedCountryId: CountryId = data.country?.id || 'japan';
        const matchedCountry =
          COUNTRIES.find((c) => c.id === savedCountryId) || COUNTRIES[0];
        const countryParams =
          state.countryParamsMap[matchedCountry.id] ||
          DEFAULT_COUNTRY_PARAMETERS[matchedCountry.id];

        const fallbackInit = generateInitialConditions(matchedCountry.id, countryParams);
        const mergedConditions: InitialConditions = {
          ...fallbackInit.conditions,
          ...(data.conditions || {}),
          regionalOpportunities: {
            ...fallbackInit.conditions.regionalOpportunities,
            ...(data.conditions?.regionalOpportunities || {}),
          },
        };

        const loadedStats = sanitizeStatsObject(data.stats);
        const loadedTags = Array.isArray(data.tags) ? data.tags : [];
        const loadedOffset =
          typeof data.envDifficultyOffset === 'number' ? data.envDifficultyOffset : 0;

        const recomputedDiff = computeDynamicLifeDifficulty({
          countryParams,
          conditions: mergedConditions,
          stats: loadedStats,
          tags: loadedTags,
          envDifficultyOffset: loadedOffset,
        });

        set({
          phase: 'PLAYING',
          difficulty: data.difficulty || 'NORMAL',
          schedulerWeights: data.schedulerWeights || { ...DEFAULT_SCHEDULER_WEIGHTS },
          country: matchedCountry,
          conditions: mergedConditions,
          initialLifeDifficultyIndex:
            typeof data.initialLifeDifficultyIndex === 'number'
              ? data.initialLifeDifficultyIndex
              : recomputedDiff.index,
          lifeDifficultyIndex: recomputedDiff.index,
          envDifficultyOffset: loadedOffset,
          environmentChangeLogs: Array.isArray(data.environmentChangeLogs)
            ? data.environmentChangeLogs
            : [],
          utilizedSupports: Array.isArray(data.utilizedSupports) ? data.utilizedSupports : [],
          overcomeHardships: Array.isArray(data.overcomeHardships) ? data.overcomeHardships : [],
          age: Math.max(0, Math.min(82, Number(data.age) || 0)),
          chapter: data.chapter || getChapterForAge(Number(data.age) || 0),
          stats: loadedStats,
          tags: loadedTags,
          career: data.career || '旅人',
          usedEventIds: Array.isArray(data.usedEventIds) ? data.usedEventIds : [],
          usedObstacleIds: Array.isArray(data.usedObstacleIds) ? data.usedObstacleIds : [],
          recentEncounterIds: Array.isArray(data.recentEncounterIds) ? data.recentEncounterIds : [],
          completedChallenges: Array.isArray(data.completedChallenges)
            ? data.completedChallenges
            : [],
          triggeredChallengeIds: Array.isArray(data.triggeredChallengeIds)
            ? data.triggeredChallengeIds
            : [],
          history: Array.isArray(data.history) ? data.history : [],
          activeChoiceEvent: null,
          activeObstacle: null,
          activeChallengeId: null,
          skyDarkness: 0,
        });
        return true;
      } catch {
        localStorage.removeItem(SAVE_KEY);
        return false;
      }
    },

    decayEffects: (dt) => {
      const state = get();
      if (state.cameraShake > 0) {
        set({ cameraShake: Math.max(0, state.cameraShake - dt * 2.5) });
      }
      if (state.feedbacks.length > 0) {
        const now = Date.now();
        const maxDuration = state.flightBounds.isMobile ? 1500 : 3000;
        const filtered = state.feedbacks.filter((f) => now - f.createdAt < maxDuration);
        if (filtered.length !== state.feedbacks.length) {
          set({ feedbacks: filtered });
        }
      }
    },
  };
});

/**
 * Evaluates a diverse, non-judgmental life title that honors all forms of happiness:
 * - Does not exclusively praise overcoming harsh birth environments
 * - Does not devalue lives born in affluent households
 * - Celebrates relationships, generosity, creativity, harmony, resilience, and curiosity equally
 */
export function evaluateLifeTitle(
  rawStats: LifeStats,
  tags: string[],
  initialDifficulty = 45,
  finalDifficulty = 40
): { title: string; subtitle: string; description: string } {
  const stats = sanitizeStatsObject(rawStats);

  const maxTrait = Math.max(
    stats.selfActualization,
    stats.relationships,
    stats.knowledge,
    stats.resilience,
    stats.money
  );

  if (tags.includes('legacy_supporter') && tags.includes('affluent_household')) {
    return {
      title: '恵まれた翼を未来へ分かち合った人',
      subtitle: '与えられた豊かな環境を感謝とともに社会と次世代へ還元した人生',
      description:
        '恵まれたスタートラインを当たり前と思わず、そのリソースと学びを周囲の幸福や次世代の支援へと惜しみなく注ぎました。優しさと責任感に満ちた気高い軌跡です。',
    };
  }
  if (initialDifficulty >= 58 && finalDifficulty <= initialDifficulty - 12 && stats.resilience >= 140) {
    return {
      title: '向かい風を希望に変えた開拓者',
      subtitle: '厳しい環境の中で知恵と支援と情熱を結び、新しい空を切り拓いた人生',
      description:
        '生まれる環境は選べなくとも、学びや支援制度、仲間との連帯を通じて自らの手で未来の選択肢を広げました。その歩みは多くの人に勇気を与える光です。',
    };
  }
  if (tags.includes('world_traveler') || tags.includes('free_spirit')) {
    return {
      title: '世界を旅した自由人',
      subtitle: '国境も常識も越えて、自分の翼で空を愛した人生',
      description:
        'あなたは既存の枠にとらわれず、広い世界の風を全身に受けて飛び続けました。その自由な軌跡は多くの人の心に爽やかな風を残しました。',
    };
  }
  if (
    tags.includes('dream_chaser') ||
    (stats.selfActualization >= 180 && stats.selfActualization >= maxTrait * 0.85)
  ) {
    return {
      title: '夢を追い続けた挑戦者',
      subtitle: '何度向かい風が吹いても、心の情熱を絶やさなかった人生',
      description:
        '安定よりも心が震える挑戦を選び、自分だけの空を切り拓きました。その情熱の輝きは、決して色褪せることのない勲章です。',
    };
  }
  if (
    (tags.includes('family_builder') || tags.includes('warm_hearth')) &&
    stats.relationships >= 150
  ) {
    return {
      title: '家族と愛を大切にした人生',
      subtitle: '温かな笑顔と絆を守り抜き、幸せの灯火をともした人生',
      description:
        'どんなに高い空を飛ぶことよりも、隣にいる大切な人と笑い合う時間を何より大切にしました。あなたの周りにはいつも温かい光があふれていました。',
    };
  }
  if (tags.includes('legacy_supporter') || tags.includes('community_pillar')) {
    return {
      title: '誰かの未来を支えた人',
      subtitle: '自分の経験と優しさを、次の世代の翼へと手渡した人生',
      description:
        '自分の成功だけでなく、周囲や若い世代を応援し支えることに喜びを見出しました。あなたが蒔いた希望の種は、次の時代の空で咲き続けます。',
    };
  }
  if (stats.resilience >= 170 && stats.resilience >= maxTrait * 0.8) {
    return {
      title: '嵐を越えて輝いた不屈の翼',
      subtitle: 'どんな困難の壁も、新しい航路への追い風に変えた人生',
      description:
        '人生の壁や挫折にぶつかっても、そのたびにしなやかに立ち上がり、より強く優しい翼を手に入れました。やり直しの連続こそが人生の美しさだと証明しました。',
    };
  }
  if (stats.knowledge >= 200 && stats.knowledge >= maxTrait * 0.85) {
    return {
      title: '知の天空を極めた探究者',
      subtitle: '尽きることのない好奇心で、世界の真理と技術を照らした人生',
      description:
        '生涯を通じて学び続け、積み上げた知識とスキルで時代を切り拓きました。あなたの知恵は未来を照らす確かな道標となりました。',
    };
  }
  return {
    title: '仲間と共に成長した調和の人生',
    subtitle: '移り変わる空の景色を味わい、自分らしい歩幅で飛び抜いた人生',
    description:
      '学び、働き、悩み、そして笑い合いながら、一歩ずつ確かな軌跡を描きました。バランスと調和に満ちた、かけがえのない唯一無二の旅路でした。',
  };
}
