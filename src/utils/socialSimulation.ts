import {
  CountryId,
  CountrySocialParams,
  HouseholdEconomyTier,
  ResidenceAreaType,
  FamilySupportTier,
  RegionalOpportunities,
  InitialConditions,
  LifeStats,
  LifeDifficultyBand,
  RiskConfig,
  ChallengeId,
  ChallengeContextModifiers,
  DifficultyLevel,
} from '../types/game';
import { sanitizeStat } from './statSystem';

export const COUNTRY_PARAMS_STORAGE_KEY = 'skylife_country_params_v1';

/**
 * Single Source of Truth for Country Social Environment Parameters (0-100 internal indices).
 * Note: Inspired by macro public indicators (World Bank, UNDP, UNESCO, WHO) and adjusted
 * as game simulation parameters. They represent structural tendencies, not fixed values for every citizen.
 */
export const DEFAULT_COUNTRY_PARAMETERS: Record<CountryId, CountrySocialParams> = {
  japan: {
    educationAccess: 88,
    educationCostBurden: 56,
    medicalAccess: 92,
    medicalCostBurden: 24,
    employmentOpportunity: 76,
    incomeLivingBalance: 70,
    socialSecurity: 84,
    economicInstability: 32,
    regionalDisparity: 44,
    socialMobility: 62,
    difficultyEventMultiplier: 1.0,
  },
  usa: {
    educationAccess: 84,
    educationCostBurden: 82,
    medicalAccess: 78,
    medicalCostBurden: 86,
    employmentOpportunity: 84,
    incomeLivingBalance: 72,
    socialSecurity: 52,
    economicInstability: 48,
    regionalDisparity: 58,
    socialMobility: 68,
    difficultyEventMultiplier: 1.0,
  },
  brazil: {
    educationAccess: 68,
    educationCostBurden: 58,
    medicalAccess: 66,
    medicalCostBurden: 52,
    employmentOpportunity: 58,
    incomeLivingBalance: 50,
    socialSecurity: 56,
    economicInstability: 68,
    regionalDisparity: 76,
    socialMobility: 52,
    difficultyEventMultiplier: 1.0,
  },
  india: {
    educationAccess: 64,
    educationCostBurden: 62,
    medicalAccess: 60,
    medicalCostBurden: 66,
    employmentOpportunity: 66,
    incomeLivingBalance: 52,
    socialSecurity: 46,
    economicInstability: 58,
    regionalDisparity: 78,
    socialMobility: 60,
    difficultyEventMultiplier: 1.0,
  },
  kenya: {
    educationAccess: 56,
    educationCostBurden: 68,
    medicalAccess: 52,
    medicalCostBurden: 64,
    employmentOpportunity: 52,
    incomeLivingBalance: 44,
    socialSecurity: 40,
    economicInstability: 66,
    regionalDisparity: 74,
    socialMobility: 54,
    difficultyEventMultiplier: 1.0,
  },
  france: {
    educationAccess: 86,
    educationCostBurden: 26,
    medicalAccess: 90,
    medicalCostBurden: 22,
    employmentOpportunity: 68,
    incomeLivingBalance: 72,
    socialSecurity: 90,
    economicInstability: 38,
    regionalDisparity: 42,
    socialMobility: 64,
    difficultyEventMultiplier: 1.0,
  },
};

export function clampParam(val: unknown, fallback: number, min = 0, max = 100): number {
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num) || Number.isNaN(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

export function sanitizeCountryParams(
  countryId: CountryId,
  raw?: Partial<CountrySocialParams> | null
): CountrySocialParams {
  const def = DEFAULT_COUNTRY_PARAMETERS[countryId] || DEFAULT_COUNTRY_PARAMETERS.japan;
  if (!raw) return { ...def };
  return {
    educationAccess: Math.round(clampParam(raw.educationAccess, def.educationAccess, 0, 100)),
    educationCostBurden: Math.round(clampParam(raw.educationCostBurden, def.educationCostBurden, 0, 100)),
    medicalAccess: Math.round(clampParam(raw.medicalAccess, def.medicalAccess, 0, 100)),
    medicalCostBurden: Math.round(clampParam(raw.medicalCostBurden, def.medicalCostBurden, 0, 100)),
    employmentOpportunity: Math.round(
      clampParam(raw.employmentOpportunity, def.employmentOpportunity, 0, 100)
    ),
    incomeLivingBalance: Math.round(
      clampParam(raw.incomeLivingBalance, def.incomeLivingBalance, 0, 100)
    ),
    socialSecurity: Math.round(clampParam(raw.socialSecurity, def.socialSecurity, 0, 100)),
    economicInstability: Math.round(
      clampParam(raw.economicInstability, def.economicInstability, 0, 100)
    ),
    regionalDisparity: Math.round(clampParam(raw.regionalDisparity, def.regionalDisparity, 0, 100)),
    socialMobility: Math.round(clampParam(raw.socialMobility, def.socialMobility, 0, 100)),
    difficultyEventMultiplier: Number(
      clampParam(raw.difficultyEventMultiplier, def.difficultyEventMultiplier, 0.5, 2.0).toFixed(2)
    ),
  };
}

export function loadAllCountryParams(): Record<CountryId, CountrySocialParams> {
  const result: Record<CountryId, CountrySocialParams> = {
    japan: { ...DEFAULT_COUNTRY_PARAMETERS.japan },
    usa: { ...DEFAULT_COUNTRY_PARAMETERS.usa },
    brazil: { ...DEFAULT_COUNTRY_PARAMETERS.brazil },
    india: { ...DEFAULT_COUNTRY_PARAMETERS.india },
    kenya: { ...DEFAULT_COUNTRY_PARAMETERS.kenya },
    france: { ...DEFAULT_COUNTRY_PARAMETERS.france },
  };
  try {
    const raw = localStorage.getItem(COUNTRY_PARAMS_STORAGE_KEY);
    if (!raw) return result;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return result;
    (Object.keys(result) as CountryId[]).forEach((cid) => {
      if (parsed[cid]) {
        result[cid] = sanitizeCountryParams(cid, parsed[cid]);
      }
    });
    return result;
  } catch {
    return result;
  }
}

export function saveAllCountryParams(paramsMap: Record<CountryId, CountrySocialParams>): void {
  try {
    localStorage.setItem(COUNTRY_PARAMS_STORAGE_KEY, JSON.stringify(paramsMap));
  } catch {
    // ignore storage errors
  }
}

function weightedRandomPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((acc, w) => acc + Math.max(0.01, w), 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0.01, weights[i]);
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Generates household & regional birth conditions linked to the country's social parameters,
 * while ensuring that ANY household environment can be born in ANY country, and personal
 * talents/intelligence/effort are NEVER determined by country or economic status.
 */
export function generateCountryBirthConditions(
  countryId: CountryId,
  countryParams?: CountrySocialParams
): {
  conditions: InitialConditions;
  initialStats: LifeStats;
  initialTags: string[];
  initialDifficultyIndex: number;
} {
  const p = countryParams || DEFAULT_COUNTRY_PARAMETERS[countryId] || DEFAULT_COUNTRY_PARAMETERS.japan;

  // 1. Household Economy (linked to incomeLivingBalance & economicInstability, but all 4 tiers possible in every country)
  const econIndex = p.incomeLivingBalance * 0.65 + (100 - p.economicInstability) * 0.35; // ~40 to ~80
  const economyTiers: HouseholdEconomyTier[] = [
    '経済的に厳しい家庭',
    '一般的な所得の家庭',
    '比較的裕福な家庭',
    '非常に裕福な家庭',
  ];
  const economyWeights = [
    Math.max(12, 55 - econIndex * 0.48), // 16% - 35%
    Math.max(28, 38 + (econIndex - 50) * 0.15), // 32% - 45%
    Math.max(14, 12 + econIndex * 0.25), // 22% - 32%
    Math.max(6, 5 + econIndex * 0.12), // 10% - 15%
  ];
  const economy = weightedRandomPick(economyTiers, economyWeights);

  // 2. Residence Area (linked to regionalDisparity & urbanization tendency)
  const residenceTiers: ResidenceAreaType[] = ['都市部', '郊外', '地方・農村部'];
  const urbanBias = (p.employmentOpportunity + p.educationAccess) * 0.5;
  const residenceWeights = [
    Math.max(22, urbanBias * 0.48),
    Math.max(24, 36),
    Math.max(18, (100 - urbanBias) * 0.55 + p.regionalDisparity * 0.15),
  ];
  const residenceArea = weightedRandomPick(residenceTiers, residenceWeights);

  // 3. Family Support (linked to socialSecurity & household stability, all 3 tiers possible everywhere)
  const supportTiers: FamilySupportTier[] = [
    '支援を受けやすい',
    '一定の支援を受けられる',
    '支援が限られている',
  ];
  const econSupportBonus =
    economy === '非常に裕福な家庭'
      ? 22
      : economy === '比較的裕福な家庭'
      ? 12
      : economy === '一般的な所得の家庭'
      ? 0
      : -14;
  const supportWeights = [
    Math.max(15, 28 + econSupportBonus + p.socialSecurity * 0.15),
    Math.max(32, 44),
    Math.max(12, 28 - econSupportBonus * 0.8 + (100 - p.socialSecurity) * 0.15),
  ];
  const familySupport = weightedRandomPick(supportTiers, supportWeights);

  // 4. Regional Opportunities (affected by country access & residenceArea & regionalDisparity)
  const ruralPenalty =
    residenceArea === '地方・農村部'
      ? Math.round(p.regionalDisparity * 0.28)
      : residenceArea === '郊外'
      ? Math.round(p.regionalDisparity * 0.1)
      : -6;

  const econAccessMod =
    economy === '非常に裕福な家庭'
      ? 12
      : economy === '比較的裕福な家庭'
      ? 6
      : economy === '経済的に厳しい家庭'
      ? -Math.round(p.educationCostBurden * 0.14)
      : 0;

  const eduAccessAtBirth = Math.min(
    98,
    Math.max(18, Math.round(p.educationAccess - ruralPenalty + econAccessMod))
  );
  const medAccessAtBirth = Math.min(
    98,
    Math.max(
      18,
      Math.round(
        p.medicalAccess -
          ruralPenalty -
          (economy === '経済的に厳しい家庭' ? Math.round(p.medicalCostBurden * 0.15) : 0)
      )
    )
  );

  const schoolMedicalScore = Math.round((eduAccessAtBirth + medAccessAtBirth) / 2);
  const internetScore = Math.min(
    98,
    Math.max(22, Math.round((p.educationAccess + p.employmentOpportunity) * 0.52 - ruralPenalty))
  );
  const workStudyScore = Math.min(
    98,
    Math.max(20, Math.round((p.employmentOpportunity + p.socialMobility) * 0.52 - ruralPenalty))
  );
  const transportScore = Math.min(
    98,
    Math.max(18, Math.round(p.educationAccess * 0.88 - ruralPenalty * 1.15))
  );

  const regionalOpportunities: RegionalOpportunities = {
    schoolMedicalAccess:
      schoolMedicalScore >= 75
        ? '学校・医療ともに充実'
        : schoolMedicalScore >= 50
        ? '標準的な通学・医療環境'
        : '学校や病院まで距離がある',
    schoolMedicalScore,
    internetAccess:
      internetScore >= 75
        ? '高速・常時接続環境'
        : internetScore >= 50
        ? '標準的な通信環境'
        : '限定的・共有アクセス中心',
    internetScore,
    workStudyOptions:
      workStudyScore >= 72
        ? '多様な学習・仕事の選択肢'
        : workStudyScore >= 48
        ? '一定の選択肢あり'
        : '地域内の選択肢が限られる',
    workStudyScore,
    publicTransport:
      transportScore >= 72
        ? '交通網が発達している'
        : transportScore >= 48
        ? '一定のバス・鉄道網あり'
        : '長距離の通学・移動が必要',
    transportScore,
  };

  // 5. Personal Individuality (Strictly independent of country & economic status!)
  const specialties: InitialConditions['specialty'][] = [
    '論理・テクノロジー',
    '芸術・音楽・感性',
    '運動・フィジカル',
    '対話・共感力',
    '探究・クリエイティブ',
  ];
  const interests: InitialConditions['interest'][] = [
    '科学と未来',
    '音楽と表現',
    'スポーツと冒険',
    'ビジネスと社会',
    '自然と人々',
  ];
  const healths: InitialConditions['initialHealth'][] = [
    '頑丈で元気いっぱい',
    '標準的で健やか',
    '少し繊細だが芯が強い',
  ];
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const conditions: InitialConditions = {
    economy,
    residenceArea,
    familySupport,
    regionalOpportunities,
    educationAccessAtBirth: eduAccessAtBirth,
    medicalAccessAtBirth: medAccessAtBirth,
    specialty: pick(specialties),
    interest: pick(interests),
    initialHealth: pick(healths),
  };

  // 6. Initial Stats (Talent, intelligence, and curiosity are equal across countries;
  //    only initial financial buffer reflects household economy, while harsh environments foster resilience)
  const stats: LifeStats = {
    happiness: 62,
    health: 66,
    money: 45,
    relationships: 58,
    knowledge: 38,
    selfActualization: 42,
    resilience: 52,
  };

  const tags: string[] = [`country_${countryId}`];

  if (economy === '非常に裕福な家庭') {
    stats.money += 32;
    tags.push('affluent_household');
  } else if (economy === '比較的裕福な家庭') {
    stats.money += 16;
    tags.push('comfortable_household');
  } else if (economy === '一般的な所得の家庭') {
    stats.money += 2;
  } else {
    // 経済的に厳しい家庭
    stats.money -= 12;
    stats.resilience += 16;
    tags.push('grit_origin', 'low_income_household');
  }

  if (residenceArea === '都市部') {
    tags.push('urban_origin');
  } else if (residenceArea === '地方・農村部') {
    stats.relationships += 8;
    stats.resilience += 8;
    tags.push('rural_origin');
  }

  if (familySupport === '支援を受けやすい') {
    stats.relationships += 12;
    stats.happiness += 6;
    tags.push('strong_family_support');
  } else if (familySupport === '一定の支援を受けられる') {
    stats.relationships += 6;
  } else {
    stats.resilience += 14;
    tags.push('limited_family_support');
  }

  // Personal specialty bonuses (equal across all countries & economies)
  if (conditions.specialty === '論理・テクノロジー') {
    stats.knowledge += 12;
    tags.push('aptitude_tech');
  } else if (conditions.specialty === '芸術・音楽・感性') {
    stats.selfActualization += 12;
    tags.push('aptitude_art');
  } else if (conditions.specialty === '運動・フィジカル') {
    stats.health += 12;
    tags.push('aptitude_sport');
  } else if (conditions.specialty === '対話・共感力') {
    stats.relationships += 12;
    tags.push('aptitude_social');
  } else {
    stats.knowledge += 6;
    stats.selfActualization += 8;
    tags.push('aptitude_creative');
  }

  if (conditions.initialHealth === '頑丈で元気いっぱい') {
    stats.health += 12;
  } else if (conditions.initialHealth === '少し繊細だが芯が強い') {
    stats.health -= 5;
    stats.resilience += 12;
    stats.selfActualization += 6;
  }

  const diffObj = computeDynamicLifeDifficulty({
    countryParams: p,
    conditions,
    stats,
    tags,
    envDifficultyOffset: 0,
  });

  return {
    conditions,
    initialStats: stats,
    initialTags: tags,
    initialDifficultyIndex: diffObj.index,
  };
}

export function getLifeDifficultyBandInfo(index: number): {
  band: LifeDifficultyBand;
  color: string;
  badgeClass: string;
  shortDesc: string;
} {
  const clamped = Math.min(100, Math.max(0, Math.round(index)));
  if (clamped <= 25) {
    return {
      band: '比較的機会が多い環境',
      color: '#34d399',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
      shortDesc: '教育・医療・雇用の選択肢にアクセスしやすく、挑戦の土台が整っています',
    };
  }
  if (clamped <= 50) {
    return {
      band: '一定の課題がある環境',
      color: '#38bdf8',
      badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-400/50',
      shortDesc: '機会と費用・競争のバランスがあり、準備や制度活用が鍵を握ります',
    };
  }
  if (clamped <= 75) {
    return {
      band: '困難が多い環境',
      color: '#fbbf24',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
      shortDesc: '学費・医療・地域格差などの壁がありますが、支援制度やスキル習得で突破可能です',
    };
  }
  return {
    band: '非常に厳しい環境',
    color: '#f87171',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-400/50',
    shortDesc: '構造的な障壁が大きい環境ですが、奨学金・職業訓練・転居・仲間の支援で道を切り拓けます',
  };
}

/**
 * Dynamically calculates the structural Life Environment Difficulty Index (0-100).
 * Combines:
 * - Country social environment parameters + difficultyEventMultiplier
 * - Household economic status, residence area, family support
 * - Current money, health, knowledge/skills
 * - Past choices, utilized support systems, and structural mobility tags
 */
export function computeDynamicLifeDifficulty(input: {
  countryParams: CountrySocialParams;
  conditions: InitialConditions;
  stats: LifeStats;
  tags: string[];
  envDifficultyOffset?: number;
}): {
  index: number;
  band: LifeDifficultyBand;
  color: string;
  badgeClass: string;
  shortDesc: string;
} {
  const { countryParams: p, conditions, stats, tags, envDifficultyOffset = 0 } = input;

  // 1. Structural Macro Barrier from Country Parameters (0-100 scale)
  const accessStrain =
    (100 - p.educationAccess) * 0.16 +
    (100 - p.medicalAccess) * 0.14 +
    (100 - p.employmentOpportunity) * 0.16 +
    (100 - p.socialSecurity) * 0.14 +
    (100 - p.socialMobility) * 0.10;

  const costAndInstabilityStrain =
    p.educationCostBurden * 0.09 +
    p.medicalCostBurden * 0.08 +
    p.economicInstability * 0.08 +
    (100 - p.incomeLivingBalance) * 0.05;

  let score = (accessStrain + costAndInstabilityStrain) * (0.75 + p.difficultyEventMultiplier * 0.25);

  // 2. Household Economic Status
  if (conditions.economy === '経済的に厳しい家庭' || conditions.economy === '逆境からのスタート') {
    score += 18 + (p.educationCostBurden + p.medicalCostBurden) * 0.06;
  } else if (conditions.economy === '一般的な所得の家庭' || conditions.economy === '標準的な家庭') {
    score += 4;
  } else if (conditions.economy === '比較的裕福な家庭' || conditions.economy === 'ゆとりある家庭') {
    score -= 9;
  } else if (conditions.economy === '非常に裕福な家庭') {
    score -= 17;
  }

  // 3. Residence Area & Regional Disparity
  if (conditions.residenceArea === '地方・農村部' && !tags.includes('urban_relocated')) {
    score += 6 + p.regionalDisparity * 0.14;
  } else if (conditions.residenceArea === '郊外') {
    score += p.regionalDisparity * 0.04;
  } else if (conditions.residenceArea === '都市部' || tags.includes('urban_relocated')) {
    score -= 4;
  }

  // 4. Family Support
  if (conditions.familySupport === '支援が限られている' || conditions.familySupport === '独立心の強い環境') {
    score += 9;
  } else if (conditions.familySupport === '支援を受けやすい' || conditions.familySupport === '温かい大家族の支援') {
    score -= 7;
  }

  // 5. Dynamic Player Stats (Current Funds, Health, Knowledge/Skills)
  const money = sanitizeStat(stats.money, 45);
  const health = sanitizeStat(stats.health, 65);
  const knowledge = sanitizeStat(stats.knowledge, 35);

  if (money < 25) score += 8;
  else if (money >= 180) score -= 7;
  else if (money >= 95) score -= 4;

  if (health < 35) score += 7;
  else if (health >= 120) score -= 3;

  if (knowledge >= 220) score -= 7;
  else if (knowledge >= 110) score -= 4;

  // 6. Past Life Choices & Utilized Support Systems
  if (tags.includes('scholarship_secured')) score -= 7;
  if (tags.includes('vocational_trained')) score -= 6;
  if (tags.includes('urban_relocated')) score -= 6;
  if (tags.includes('social_security_utilized')) score -= 5;
  if (tags.includes('health_insurance_secured')) score -= 5;
  if (tags.includes('digital_leapfrog_skill')) score -= 6;
  if (tags.includes('overcame_failure')) score -= 3;

  score += envDifficultyOffset;

  const finalIndex = Math.min(100, Math.max(5, Math.round(score)));
  const bandInfo = getLifeDifficultyBandInfo(finalIndex);

  return {
    index: finalIndex,
    ...bandInfo,
  };
}

/**
 * Evaluates Type D Chance & Risk probability by combining:
 * 1. Personal effort & preparation tags
 * 2. Knowledge / skills / resilience stats
 * 3. Family & social support
 * 4. Available structural opportunities in country/region
 * 5. Game difficulty setting
 * Never 100% guaranteed, and never impossible due to harsh birth conditions.
 */
export function evaluateSocialRiskProbability(
  rc: RiskConfig,
  context: {
    stats: LifeStats;
    tags: string[];
    conditions: InitialConditions;
    countryParams: CountrySocialParams;
    lifeDifficultyIndex: number;
    difficulty: DifficultyLevel;
  }
): { probability: number; breakdownText: string } {
  let prob = rc.baseSuccessRate;

  // 1. Game Difficulty setting
  if (context.difficulty === 'EASY') prob += 0.12;
  if (context.difficulty === 'HARD') prob -= 0.10;

  // 2. Knowledge & Skill preparation
  if (rc.recommendedStat && rc.recommendedThreshold) {
    const statVal = context.stats[rc.recommendedStat];
    if (statVal >= rc.recommendedThreshold * 1.3) {
      prob += 0.22;
    } else if (statVal >= rc.recommendedThreshold) {
      prob += 0.16;
    } else if (statVal >= rc.recommendedThreshold * 0.75) {
      prob += 0.06;
    } else {
      prob -= 0.06;
    }
  }

  // 3. Effort & Past Choice Preparation Tags
  if (rc.bonusTags && rc.bonusTags.length > 0) {
    const matched = rc.bonusTags.filter((t) => context.tags.includes(t)).length;
    prob += matched * 0.13;
  }
  // Support / training tags always help overcome structural barriers
  if (
    context.tags.includes('scholarship_secured') ||
    context.tags.includes('vocational_trained') ||
    context.tags.includes('digital_leapfrog_skill')
  ) {
    prob += 0.08;
  }

  // 4. Social & Family Environment Opportunity Factor (Bounded so harsh environments are still winnable!)
  const p = context.countryParams;
  let envIndex = (p.socialMobility + p.employmentOpportunity + p.educationAccess) / 3;
  if (rc.envFactor === 'education') envIndex = p.educationAccess;
  else if (rc.envFactor === 'employment') envIndex = p.employmentOpportunity;
  else if (rc.envFactor === 'medical') envIndex = p.medicalAccess;
  else if (rc.envFactor === 'entrepreneurship') {
    envIndex = (p.socialMobility + p.employmentOpportunity + (100 - p.economicInstability * 0.4)) / 2.6;
  }

  // Env modifier ranges from -0.10 to +0.10 (meaningful, never insurmountable)
  const envMod = ((envIndex - 65) / 100) * 0.22;
  prob += Math.max(-0.10, Math.min(0.10, envMod));

  // Family support & social safety net cushion
  if (context.conditions.familySupport === '支援を受けやすい') prob += 0.04;
  if (context.tags.includes('social_security_utilized')) prob += 0.04;

  // Clamp between 26% and 89%:
  // - Even in the harshest environment without preparation, at least 26% chance
  // - With effort, skills, and support systems, even harsh birth environments reach 75%-89%
  // - Even in the most privileged environment with max stats, never 100% (max 89%)
  const finalProb = Math.max(0.26, Math.min(0.89, prob));

  return {
    probability: finalProb,
    breakdownText: `成功確率 約${Math.round(finalProb * 100)}%（スキル・準備・社会環境・運の総合判定）`,
  };
}

/**
 * Computes Country & Birth Environment specific rules, initial bonuses, and alternative routes
 * for the 3D Turning Point Challenge Stages (Exam, Career, Crossroads/Entrepreneurship).
 */
export function computeChallengeModifiers(
  challengeId: ChallengeId,
  state: {
    countryId: CountryId;
    countryName: string;
    countryParams: CountrySocialParams;
    conditions: InitialConditions;
    stats: LifeStats;
    tags: string[];
    lifeDifficultyIndex: number;
  }
): ChallengeContextModifiers {
  const { countryParams: p, conditions, stats, tags } = state;
  const barrierNotes: string[] = [];
  const supportNotes: string[] = [];

  const isLowIncome =
    conditions.economy === '経済的に厳しい家庭' || conditions.economy === '逆境からのスタート';
  const isAffluent =
    conditions.economy === '比較的裕福な家庭' ||
    conditions.economy === '非常に裕福な家庭' ||
    conditions.economy === 'ゆとりある家庭';
  const isRural =
    conditions.residenceArea === '地方・農村部' && !tags.includes('urban_relocated');

  if (challengeId === 'exam') {
    // Base knowledge preparation
    let prep = Math.min(62, Math.round(Math.sqrt(sanitizeStat(stats.knowledge, 38)) * 3.6));

    if (isAffluent && p.educationAccess >= 75) {
      prep += 12;
      supportNotes.push('豊かな家庭支援と充実した学習教材により初期準備 +12pt');
    } else if (isLowIncome || p.educationCostBurden >= 65) {
      prep -= 6;
      barrierNotes.push('教育費負担や教材アクセスの壁により、ステージ内の「奨学金・学費突破ゲート」の獲得が重要になります');
    }

    if (isRural && p.regionalDisparity >= 60) {
      prep -= 4;
      barrierNotes.push('地方の通学・学習環境のハンデ（オンライン学習・奨学金ゲートで逆転可能！）');
    }

    if (tags.includes('scholarship_secured')) {
      prep += 16;
      supportNotes.push('事前獲得した「奨学金・教育支援」により進学障壁が軽減（初期 +16pt）');
    }
    if (tags.includes('academic_focus') || tags.includes('early_learner')) {
      prep += 10;
      supportNotes.push('これまでの地道な学習習慣ボーナス（初期 +10pt）');
    }

    const targetScore = p.educationCostBurden >= 70 && !tags.includes('scholarship_secured') && !isAffluent ? 105 : 95;

    return {
      targetScore,
      initialPrepScore: Math.max(12, Math.min(78, prep)),
      conditionSummary: isAffluent
        ? `${state.countryName}・充実した教育環境（複数の進学ルートが選択可能）`
        : `${state.countryName}・${conditions.economy}（奨学金オーブや公立・専門進学ルートも開放）`,
      barrierNotes,
      supportNotes,
      alternativeRouteLabel:
        p.educationCostBurden <= 35
          ? '公立大学・専門バカロレア進学ルート'
          : '奨学金特待生・公立夜間・職業専門進学ルート',
      extraGoalLabel:
        isLowIncome || p.educationCostBurden >= 60
          ? 'ステージ内の「🎓 奨学金・学費支援ゲート (+40pt)」を通過すると学費の壁を一気に突破できます！'
          : '「✨ 集中・応用知識ゲート」を通過してハイスコアを目指そう！',
    };
  }

  if (challengeId === 'career') {
    const combined =
      sanitizeStat(stats.knowledge, 38) +
      sanitizeStat(stats.selfActualization, 42) +
      sanitizeStat(stats.resilience, 50) * 0.5;
    let prep = Math.min(65, Math.round(Math.sqrt(combined) * 2.7));

    if (p.employmentOpportunity < 62 || isRural) {
      prep -= 6;
      barrierNotes.push('地域の求人倍率・雇用機会の壁（ステージ内の「都市転居・ITスキル・職業訓練ゲート」で突破可能！）');
    } else {
      prep += 6;
      supportNotes.push('活発な雇用市場により求人の選択肢が豊富（初期 +6pt）');
    }

    if (tags.includes('vocational_trained') || tags.includes('digital_leapfrog_skill') || tags.includes('learned_coding')) {
      prep += 15;
      supportNotes.push('習得した専門資格・デジタル技術が求人で高く評価（初期 +15pt）');
    }
    if (tags.includes('overcame_failure')) {
      prep += 16;
      supportNotes.push('挫折から立ち上がったレジリエンス経験ボーナス（初期 +16pt）');
    }
    if (tags.includes('urban_relocated')) {
      prep += 10;
      supportNotes.push('都市部への移動による求人アクセス向上（初期 +10pt）');
    }

    const targetScore = p.employmentOpportunity < 60 && !tags.includes('vocational_trained') ? 110 : 100;

    return {
      targetScore,
      initialPrepScore: Math.max(15, Math.min(82, prep)),
      conditionSummary: `${state.countryName}の雇用環境（雇用機会指標: ${p.employmentOpportunity} / 100）`,
      barrierNotes,
      supportNotes,
      alternativeRouteLabel: '職業訓練・リモート技術職・地域起業キャリア',
      extraGoalLabel:
        'ステージ内の「🛠️ 資格・スキル開放ゲート」や「🏙️ 転居・新市場ゲート」でキャリアの道が大きく広がります！',
    };
  }

  // crossroads (Entrepreneurship / Midlife Crossroads Challenge)
  let prep = Math.min(68, Math.round(Math.sqrt(sanitizeStat(stats.resilience, 50)) * 3.6));
  if (p.socialSecurity >= 75) {
    prep += 12;
    supportNotes.push('充実した社会保障・セーフティネットにより再挑戦の安心感が高い（初期 +12pt）');
  } else if (p.economicInstability >= 60) {
    barrierNotes.push('経済変動が大きいため、資金調達とリスク管理の選択が重要になります');
  }
  if (tags.includes('overcame_failure')) {
    prep += 15;
    supportNotes.push('過去の困難を乗り越えた経験が大きな支えになります（初期 +15pt）');
  }
  if (tags.includes('social_security_utilized') || tags.includes('community_pillar')) {
    prep += 10;
    supportNotes.push('社会の支援制度と地域の絆が挑戦を後押しします（初期 +10pt）');
  }

  return {
    targetScore: 100,
    initialPrepScore: Math.max(18, Math.min(82, prep)),
    conditionSummary: `${state.countryName}の社会環境（社会保障: ${p.socialSecurity} / 社会的移動機会: ${p.socialMobility}）`,
    barrierNotes,
    supportNotes,
    alternativeRouteLabel: '地域コミュニティ共創・ワークライフ調和ルート',
    extraGoalLabel: '「🚀 起業・イノベーション」「🤝 社会保障と家族の調和」「🌱 地域貢献」から自分の価値観の航路を選ぼう！',
  };
}
