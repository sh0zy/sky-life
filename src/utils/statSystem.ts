import { LifeStats, StatDelta, ChapterId, DifficultyLevel } from '../types/game';

/**
 * Safely sanitize any stat value to prevent NaN, Infinity, or negative numbers.
 * No upper bound cap (100, 500, 1,000, 10,000+ are all supported).
 */
export function sanitizeStat(val: unknown, fallback = 50): number {
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num) || Number.isNaN(num)) {
    return fallback;
  }
  return Math.max(0, Math.round(num));
}

export function sanitizeStatsObject(raw: Partial<LifeStats> | undefined | null): LifeStats {
  return {
    happiness: sanitizeStat(raw?.happiness, 60),
    health: sanitizeStat(raw?.health, 65),
    money: sanitizeStat(raw?.money, 45),
    relationships: sanitizeStat(raw?.relationships, 55),
    knowledge: sanitizeStat(raw?.knowledge, 35),
    selfActualization: sanitizeStat(raw?.selfActualization, 40),
    resilience: sanitizeStat(raw?.resilience, 50),
  };
}

/**
 * Format stat numbers with comma separators (e.g., 125, 560, 1,250, 10,480)
 */
export function formatStatNumber(val: number): string {
  const safe = sanitizeStat(val, 0);
  return safe.toLocaleString('ja-JP');
}

/**
 * Distinguish between:
 * - Cumulative Growth Stats (累積成長ステータス): Knowledge, SelfActualization, Resilience
 * - Condition / State Stats (状態・環境ステータス): Happiness, Health, Money, Relationships
 */
export const STAT_CATEGORIES: Record<keyof LifeStats, 'cumulative' | 'condition'> = {
  happiness: 'condition',
  health: 'condition',
  money: 'condition',
  relationships: 'condition',
  knowledge: 'cumulative',
  selfActualization: 'cumulative',
  resilience: 'cumulative',
};

const STAT_TIERS = [
  0, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000,
];

export interface StatBarProgress {
  percent: number;      // 5 to 100 within current tier
  tierIndex: number;    // 1, 2, 3...
  prevBound: number;
  nextBound: number;
  tierLabel: string;
}

export function getStatBarProgress(value: number): StatBarProgress {
  const safe = sanitizeStat(value, 0);

  for (let i = 0; i < STAT_TIERS.length - 1; i++) {
    const low = STAT_TIERS[i];
    const high = STAT_TIERS[i + 1];
    if (safe < high) {
      const span = Math.max(1, high - low);
      const rawPct = ((safe - low) / span) * 100;
      return {
        percent: Math.min(100, Math.max(4, Math.round(rawPct))),
        tierIndex: i + 1,
        prevBound: low,
        nextBound: high,
        tierLabel: `Lv.${i + 1}`,
      };
    }
  }

  const step = 100000;
  const low = Math.floor(safe / step) * step;
  const high = low + step;
  const rawPct = ((safe - low) / step) * 100;
  const tierIdx = STAT_TIERS.length + Math.floor(safe / step);

  return {
    percent: Math.min(100, Math.max(6, Math.round(rawPct))),
    tierIndex: tierIdx,
    prevBound: low,
    nextBound: high,
    tierLabel: `Lv.${tierIdx}`,
  };
}

const STAT_HALF_LIFE: Record<keyof LifeStats, number> = {
  happiness: 380,
  health: 340,
  money: 520,
  relationships: 380,
  knowledge: 360,
  selfActualization: 400,
  resilience: 380,
};

export interface DeltaComputeContext {
  chapter: ChapterId;
  tags: string[];
  difficulty?: DifficultyLevel;
  isMajorSuccess?: boolean;
  isObstacleImpact?: boolean;
}

export function getDifficultyDamageMultiplier(difficulty: DifficultyLevel = 'NORMAL'): number {
  if (difficulty === 'EASY') return 0.7;
  if (difficulty === 'HARD') return 1.35;
  return 1.0;
}

/**
 * Computes effective change for a single non-happiness stat.
 * - Positive gains follow the diminishing-returns curve as the stat rises, never stopping completely (>= 1).
 * - Negative deltas apply faithfully! Condition stats (Health, Money, Relationships) feel the full weight
 *   of trade-offs and crises, while Cumulative stats (Knowledge, Resilience, SelfActualization) retain core experience
 *   better but still reflect setbacks when explicitly penalized.
 */
export function computeEffectiveStatDelta(
  statKey: keyof LifeStats,
  currentValue: number,
  rawDelta: number,
  ctx: DeltaComputeContext
): number {
  if (!rawDelta || !Number.isFinite(rawDelta)) return 0;
  const safeCurrent = sanitizeStat(currentValue, 50);

  if (rawDelta > 0) {
    const halfLife = STAT_HALF_LIFE[statKey] || 360;
    const diminishingFactor = 1 / (1 + Math.pow(safeCurrent / halfLife, 0.85));
    const breakthroughMult = ctx.isMajorSuccess ? 1.85 : 1.0;
    const scaled = Math.round(rawDelta * diminishingFactor * breakthroughMult);
    return Math.max(1, scaled);
  } else {
    // Negative delta (trade-off cost, risk failure, or obstacle impact)
    const diffMult = getDifficultyDamageMultiplier(ctx.difficulty);
    const category = STAT_CATEGORIES[statKey];

    // Condition stats (Health, Money, Relationships) fluctuate more dynamically at high values
    const vulnerabilityBase = category === 'condition' ? 420 : 750;
    const highStatVulnerability = 1 + Math.min(3.5, safeCurrent / vulnerabilityBase);

    const scaledLoss = Math.round(rawDelta * highStatVulnerability * diffMult);
    return -Math.min(safeCurrent, Math.max(1, Math.abs(scaledLoss)));
  }
}

/**
 * Special Holistic Happiness Calculation:
 * - Reflects direct happiness delta (both positive AND negative trade-offs).
 * - Reflects balance of Health, Relationships, Financial stability, and Self-Actualization.
 * - If a choice explicitly reduces Happiness (e.g. rawHappy < 0) or severely sacrifices Health/Relationships,
 *   Happiness will genuinely decrease rather than being masked into a positive gain.
 */
export function computeHolisticHappinessChange(
  prevStats: LifeStats,
  nextStatsWithoutHappiness: Omit<LifeStats, 'happiness'>,
  appliedDeltas: StatDelta,
  ctx: DeltaComputeContext
): { nextHappiness: number; effectiveHappinessDelta: number } {
  const currentHappiness = sanitizeStat(prevStats.happiness, 60);
  const rawHappy = appliedDeltas.happiness || 0;
  const diffMult = getDifficultyDamageMultiplier(ctx.difficulty);

  let baseDelta = 0;
  if (rawHappy > 0) {
    const dim = 1 / (1 + Math.pow(currentHappiness / STAT_HALF_LIFE.happiness, 0.82));
    const majorMult = ctx.isMajorSuccess ? 1.85 : 1.0;
    baseDelta = Math.max(1, Math.round(rawHappy * dim * majorMult));
  } else if (rawHappy < 0) {
    const vulnerability = 1 + Math.min(3.8, currentHappiness / 400);
    baseDelta = Math.round(rawHappy * vulnerability * diffMult);
  }

  const pillars = [
    nextStatsWithoutHappiness.health,
    nextStatsWithoutHappiness.relationships,
    nextStatsWithoutHappiness.money,
    nextStatsWithoutHappiness.selfActualization,
  ];
  const minPillar = Math.min(...pillars);
  const maxPillar = Math.max(...pillars);

  let harmonyAdjustment = 0;

  // Only apply passive harmony bonus when the player is NOT taking an explicit negative happiness hit or obstacle
  if (rawHappy >= 0 && !ctx.isObstacleImpact) {
    if (minPillar >= 80) {
      harmonyAdjustment += Math.min(20, Math.round(Math.sqrt(minPillar) * 0.5));
    } else if (minPillar >= 50) {
      harmonyAdjustment += 2;
    }
  }

  // Severe life imbalance penalty: if Health or Relationships are critically low (< 45), happiness erodes
  if (
    nextStatsWithoutHappiness.health < 45 ||
    nextStatsWithoutHappiness.relationships < 42
  ) {
    const neglectPenalty = Math.max(4, Math.round(currentHappiness * 0.05));
    harmonyAdjustment -= neglectPenalty;
  } else if (maxPillar > minPillar * 4 && minPillar < 70) {
    harmonyAdjustment -= 4;
  }

  // Trade-off strain: sacrificing Health or Relationships in a choice reduces happiness gain or causes stress
  if ((appliedDeltas.health || 0) < 0 || (appliedDeltas.relationships || 0) < 0) {
    const strain =
      Math.abs(Math.min(0, appliedDeltas.health || 0)) * 0.35 +
      Math.abs(Math.min(0, appliedDeltas.relationships || 0)) * 0.35;
    harmonyAdjustment -= Math.round(strain);
  }

  // Value Alignment Bonus (only when rawHappy >= 0 and not an obstacle)
  let valueBonus = 0;
  if (rawHappy >= 0 && !ctx.isObstacleImpact) {
    if (
      (ctx.tags.includes('family_builder') || ctx.tags.includes('warm_hearth')) &&
      (appliedDeltas.relationships || 0) > 0
    ) {
      valueBonus += 4;
    }
    if (
      (ctx.tags.includes('dream_chaser') || ctx.tags.includes('aptitude_art')) &&
      (appliedDeltas.selfActualization || 0) > 0
    ) {
      valueBonus += 4;
    }
  }

  let totalDelta = baseDelta + harmonyAdjustment + valueBonus;

  // If rawHappy was explicitly negative, never let bonuses turn it positive
  if (rawHappy < 0) {
    totalDelta = Math.min(-1, totalDelta);
  }

  // If this was an obstacle impact, ensure happiness drops noticeably
  if (ctx.isObstacleImpact && totalDelta >= 0) {
    totalDelta = -Math.max(6, Math.round(currentHappiness * 0.06 * diffMult));
  }

  const nextHappiness = sanitizeStat(Math.max(0, currentHappiness + totalDelta), 0);
  const effectiveHappinessDelta = nextHappiness - currentHappiness;

  return { nextHappiness, effectiveHappinessDelta };
}

export function applyStatChanges(
  currentStats: LifeStats,
  rawDeltas: StatDelta,
  ctx: DeltaComputeContext
): { nextStats: LifeStats; appliedDeltas: StatDelta } {
  const safeCurrent = sanitizeStatsObject(currentStats);

  const dHealth = computeEffectiveStatDelta('health', safeCurrent.health, rawDeltas.health || 0, ctx);
  const dMoney = computeEffectiveStatDelta('money', safeCurrent.money, rawDeltas.money || 0, ctx);
  const dRel = computeEffectiveStatDelta(
    'relationships',
    safeCurrent.relationships,
    rawDeltas.relationships || 0,
    ctx
  );
  const dKnow = computeEffectiveStatDelta(
    'knowledge',
    safeCurrent.knowledge,
    rawDeltas.knowledge || 0,
    ctx
  );
  const dSelf = computeEffectiveStatDelta(
    'selfActualization',
    safeCurrent.selfActualization,
    rawDeltas.selfActualization || 0,
    ctx
  );
  const dRes = computeEffectiveStatDelta(
    'resilience',
    safeCurrent.resilience,
    rawDeltas.resilience || 0,
    ctx
  );

  const partialNext = {
    health: sanitizeStat(safeCurrent.health + dHealth, 0),
    money: sanitizeStat(safeCurrent.money + dMoney, 0),
    relationships: sanitizeStat(safeCurrent.relationships + dRel, 0),
    knowledge: sanitizeStat(safeCurrent.knowledge + dKnow, 0),
    selfActualization: sanitizeStat(safeCurrent.selfActualization + dSelf, 0),
    resilience: sanitizeStat(safeCurrent.resilience + dRes, 0),
  };

  const prelimDeltas: StatDelta = {
    happiness: rawDeltas.happiness,
    health: dHealth,
    money: dMoney,
    relationships: dRel,
    knowledge: dKnow,
    selfActualization: dSelf,
    resilience: dRes,
  };

  const { nextHappiness, effectiveHappinessDelta } = computeHolisticHappinessChange(
    safeCurrent,
    partialNext,
    prelimDeltas,
    ctx
  );

  const nextStats: LifeStats = {
    happiness: nextHappiness,
    ...partialNext,
  };

  const appliedDeltas: StatDelta = {};
  if (effectiveHappinessDelta !== 0) appliedDeltas.happiness = effectiveHappinessDelta;
  if (dHealth !== 0) appliedDeltas.health = dHealth;
  if (dMoney !== 0) appliedDeltas.money = dMoney;
  if (dRel !== 0) appliedDeltas.relationships = dRel;
  if (dKnow !== 0) appliedDeltas.knowledge = dKnow;
  if (dSelf !== 0) appliedDeltas.selfActualization = dSelf;
  if (dRes !== 0) appliedDeltas.resilience = dRes;

  return { nextStats, appliedDeltas };
}
