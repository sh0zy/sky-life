export type CountryId = 'japan' | 'usa' | 'brazil' | 'india' | 'kenya' | 'france';

export type DifficultyLevel = 'EASY' | 'NORMAL' | 'HARD';

export interface SchedulerWeights {
  mandatoryChoice: number;   // Default 40 (%)
  forcedEvent: number;       // Default 20 (%)
  avoidableObstacle: number; // Default 25 (%)
  chanceRisk: number;        // Default 15 (%)
}

/**
 * 10 Social Environment Parameters (0-100 internal simulation indices) + Difficulty Event Multiplier.
 * Based on general international tendencies (World Bank / UNDP / UNESCO / WHO macro patterns)
 * adjusted as game simulation indices (explicitly labeled as game simulation parameters).
 */
export interface CountrySocialParams {
  educationAccess: number;          // 1. 教育へのアクセス (0-100)
  educationCostBurden: number;      // 2. 教育費の負担 (0-100: higher = heavier household burden)
  medicalAccess: number;            // 3. 医療へのアクセス (0-100)
  medicalCostBurden: number;        // 4. 医療費の負担 (0-100: higher = heavier out-of-pocket risk)
  employmentOpportunity: number;    // 5. 雇用機会 (0-100)
  incomeLivingBalance: number;      // 6. 所得と生活費のバランス / 経済環境 (0-100)
  socialSecurity: number;           // 7. 社会保障 (0-100)
  economicInstability: number;      // 8. 経済的不安定さ (0-100: higher = more volatile)
  regionalDisparity: number;        // 9. 地域間格差 (0-100: higher = wider urban/rural gap)
  socialMobility: number;           // 10. 社会的な移動機会 (0-100)
  difficultyEventMultiplier: number; // 困難イベントへの影響倍率 (0.5 - 2.0, default 1.0)
}

export interface CountryInfo {
  id: CountryId;
  name: string;
  flag: string;
  region: string;
  coordinates: { x: number; y: number }; // Map percentage 0-100
  description: string;
  skyTint: string;
  culturalNote: string;
  socialContextNote: string; // Summary of social systems, strengths & structural challenges
  defaultParams: CountrySocialParams;
}

export type HouseholdEconomyTier =
  | '経済的に厳しい家庭'
  | '一般的な所得の家庭'
  | '比較的裕福な家庭'
  | '非常に裕福な家庭';

export type ResidenceAreaType = '都市部' | '郊外' | '地方・農村部';

export type FamilySupportTier =
  | '支援を受けやすい'
  | '一定の支援を受けられる'
  | '支援が限られている';

export interface RegionalOpportunities {
  schoolMedicalAccess: string;   // 学校や医療機関へのアクセス
  schoolMedicalScore: number;    // 0-100
  internetAccess: string;        // インターネット環境
  internetScore: number;         // 0-100
  workStudyOptions: string;      // 仕事や学習の選択肢
  workStudyScore: number;        // 0-100
  publicTransport: string;       // 公共交通機関へのアクセス
  transportScore: number;        // 0-100
}

export interface InitialConditions {
  economy: HouseholdEconomyTier | string;
  residenceArea: ResidenceAreaType;
  familySupport: FamilySupportTier | string;
  regionalOpportunities: RegionalOpportunities;
  educationAccessAtBirth: number; // 0-100 effective access at birth
  medicalAccessAtBirth: number;   // 0-100 effective access at birth
  specialty: '論理・テクノロジー' | '芸術・音楽・感性' | '運動・フィジカル' | '対話・共感力' | '探究・クリエイティブ';
  interest: '科学と未来' | '音楽と表現' | 'スポーツと冒険' | 'ビジネスと社会' | '自然と人々';
  initialHealth: '頑丈で元気いっぱい' | '標準的で健やか' | '少し繊細だが芯が強い';
}

export type LifeDifficultyBand =
  | '比較的機会が多い環境'
  | '一定の課題がある環境'
  | '困難が多い環境'
  | '非常に厳しい環境';

export interface EnvironmentChangeLog {
  id: string;
  age: number;
  prevDifficulty: number;
  nextDifficulty: number;
  delta: number;
  reason: string;
  createdAt: number;
}

export interface LifeStats {
  happiness: number;         // 幸福度（状態ステータス・上限なし）
  health: number;            // 健康（状態ステータス・上限なし）
  money: number;             // お金（状態・資産ステータス・上限なし）
  relationships: number;     // 人間関係（状態・絆ステータス・上限なし）
  knowledge: number;         // 知識・スキル（累積成長ステータス・上限なし）
  selfActualization: number; // 自己実現（累積成長ステータス・上限なし）
  resilience: number;        // レジリエンス（累積成長ステータス・上限なし）
}

export type ChapterId = 1 | 2 | 3 | 4 | 5;

export interface ChapterInfo {
  id: ChapterId;
  title: string;
  subtitle: string;
  ageRange: [number, number];
  description: string;
  skyTopColor: string;
  skyBottomColor: string;
  fogColor: string;
  groundColor: string;
  accentColor: string;
}

export interface StatDelta {
  happiness?: number;
  health?: number;
  money?: number;
  relationships?: number;
  knowledge?: number;
  selfActualization?: number;
  resilience?: number;
}

export interface RiskConfig {
  baseSuccessRate: number; // 0.0 to 1.0 (e.g. 0.55)
  recommendedStat?: keyof LifeStats;
  recommendedThreshold?: number;
  bonusTags?: string[];
  envFactor?: 'education' | 'employment' | 'socialMobility' | 'medical' | 'entrepreneurship';
  successMessage: string;
  successDeltas: StatDelta;
  successAddTags?: string[];
  failureMessage: string;
  failureDeltas: StatDelta;
  failureAddTags?: string[];
}

export interface ChoiceOption {
  id: string;
  label: string;
  subLabel: string;
  color: string;
  icon: string;
  prosText: string;  // Clear preview of main benefits
  consText: string;  // Clear preview of main trade-offs/costs
  riskBadge?: string; // Preview of risk if applicable
  resultMessage: string;
  deltas: StatDelta;
  addTags?: string[];
  careerSet?: string;
  supportUsedLabel?: string;       // Records utilized support system (e.g. "奨学金制度", "公的職業訓練")
  environmentChangeReason?: string; // Explains why structural life difficulty changed when picking this option
  environmentDifficultyMod?: number; // Direct modifier to structural barrier (e.g. -8 when getting scholarship)
  riskConfig?: RiskConfig; // Used in Type D (Chance & Risk events)
  conditionalOverrides?: {
    requiredTag: string;
    bonusMessage: string;
    bonusDeltas: StatDelta;
    addTags?: string[];
  }[];
}

export type ChoiceEventKind = 'mandatory' | 'chance_risk';

export interface LifeEventDef {
  id: string;
  kind: ChoiceEventKind; // 'mandatory' (Type A) or 'chance_risk' (Type D)
  chapter: ChapterId;
  minAge: number;
  maxAge: number;
  title: string;
  category: string;
  countries?: CountryId[];  // If specified, only spawns for these countries (Country-specific event)
  requiredTag?: string;     // Appears preferentially if tag is present
  preferHighBarrier?: 'educationCost' | 'medicalCost' | 'regionalGap' | 'employmentGap'; // Spawns preferentially when player faces structural barrier
  triggerLowStat?: { stat: keyof LifeStats; below: number };
  leftChoice: ChoiceOption;
  centerChoice?: ChoiceOption; // Support 2 or 3 gates spanning the full sky width
  rightChoice: ChoiceOption;
}

export type ObstacleCategory = 'failure' | 'money' | 'relationship' | 'health' | 'society';

export type ObstaclePatternType =
  | 'single_moving'
  | 'horizontal_pair'
  | 'vertical_split'
  | 'diagonal_barrage'
  | 'slalom_triple';

export interface ObstacleDef {
  id: string;
  category: ObstacleCategory;
  categoryLabel: string;
  title: string;
  subtitle: string;
  chapter: ChapterId;
  unavoidable: boolean; // True = Type B Forced Event; False = Type C Avoidable Obstacle
  countries?: CountryId[];
  envDriver?: 'educationBarrier' | 'medicalBurden' | 'employmentGap' | 'economicInstability' | 'regionalGap';
  triggerTag?: string;
  visualType: 'dark_cloud' | 'rock_wall' | 'cracked_monolith' | 'thunder_storm' | 'crisis_wave';
  color: string;
  impactDeltas: StatDelta;
  recoveryTitle: string;
  recoveryPrompt: string;
  recoveryOptions: {
    id: string;
    label: string;
    description: string;
    prosConsPreview: string;
    resultMessage: string;
    deltas: StatDelta;
    addTags?: string[];
    supportUsedLabel?: string;
    environmentChangeReason?: string;
    environmentDifficultyMod?: number;
  }[];
}

export type ChallengeId = 'exam' | 'career' | 'crossroads';

export interface ChallengeContextModifiers {
  targetScore: number;
  initialPrepScore: number;
  conditionSummary: string;
  barrierNotes: string[];
  supportNotes: string[];
  alternativeRouteLabel: string;
  extraGoalLabel: string;
}

export interface ChallengeStageDef {
  id: ChallengeId;
  portalTitle: string;
  stageTitle: string;
  subtitle: string;
  triggerAge: number;
  chapter: ChapterId;
  durationSec: number;
  rules: string[];
  successConditionText: string;
}

export interface HistoryLogItem {
  id: string;
  age: number;
  chapter: ChapterId;
  type: 'birth' | 'choice' | 'forced_event' | 'obstacle' | 'recovery' | 'challenge' | 'milestone' | 'environment';
  title: string;
  detail: string;
  deltas?: StatDelta;
}

export interface FloatingFeedback {
  id: string;
  title: string;
  subtitle?: string;
  deltas: StatDelta;
  color: string;
  createdAt: number;
}

export type GamePhase =
  | 'TITLE'
  | 'BIRTH_SELECT'
  | 'BIRTH_INTRO'
  | 'PLAYING'
  | 'PAUSED'
  | 'CHOICE_FAILSAFE_MODAL'
  | 'FORCED_EVENT_MODAL'
  | 'RECOVERY_MODAL'
  | 'CHALLENGE_INTRO'
  | 'CHALLENGE_PLAYING'
  | 'CHALLENGE_RESULT'
  | 'ENDING';
