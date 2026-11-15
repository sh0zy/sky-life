import { CountryId, CountrySocialParams } from '../types/game';
import {
  getOfficialIndicatorForCountry,
  OfficialCountryValue,
} from '../data/statisticsSources';

export interface DerivedParameterExplanation {
  paramKey: keyof Omit<CountrySocialParams, 'difficultyEventMultiplier'>;
  labelJa: string;
  derivedValue: number;
  formulaDescriptionJa: string;
  sourceIndicators: string[];
  isProvisionalDueToMissing: boolean;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function normalizeLinear(
  value: number,
  domainMin: number,
  domainMax: number,
  outMin: number,
  outMax: number,
  invert = false
): number {
  const t = clamp((value - domainMin) / (domainMax - domainMin), 0, 1);
  const directed = invert ? 1 - t : t;
  return Math.round(outMin + directed * (outMax - outMin));
}

function getNumericValue(indicatorKey: string, countryId: CountryId): number | null {
  const entry: OfficialCountryValue | null = getOfficialIndicatorForCountry(
    indicatorKey,
    countryId
  );
  if (!entry || entry.missing || typeof entry.value !== 'number') return null;
  return entry.value;
}

/**
 * Computes game-simulation CountrySocialParams (0-100 "ゲーム内換算値") strictly from
 * official international statistics in officialCountryStatistics.json.
 * Never mutates or misrepresents the underlying raw official statistics.
 */
export function convertOfficialStatsToGameParams(countryId: CountryId): {
  params: CountrySocialParams;
  explanations: DerivedParameterExplanation[];
} {
  const secEnroll = getNumericValue('secondaryEnrollmentGross', countryId);
  const lowerComp = getNumericValue('lowerSecondaryCompletion', countryId);
  const govEduGdp = getNumericValue('govEducationExpenditurePctGdp', countryId);
  const uhc = getNumericValue('uhcServiceCoverageIndex', countryId);
  const oopHealth = getNumericValue('outOfPocketHealthPct', countryId);
  const unemp = getNumericValue('unemploymentRate', countryId);
  const empRatio = getNumericValue('employmentToPopulationRatio', countryId);
  const gdpPpp = getNumericValue('gdpPerCapitaPpp', countryId);
  const socProt = getNumericValue('socialProtectionCoverage', countryId);
  const inflation = getNumericValue('inflationCpiAnnual', countryId);
  const gini = getNumericValue('giniIndex', countryId);
  const tertEnroll = getNumericValue('tertiaryEnrollmentGross', countryId);

  // 1. 教育アクセス (SE.SEC.ENRR + optional SE.SEC.CMPT.LO.ZS)
  const eduEnrollScore =
    secEnroll !== null ? normalizeLinear(secEnroll, 65, 105, 45, 90) : 65;
  const eduCompScore =
    lowerComp !== null ? normalizeLinear(lowerComp, 70, 102, 50, 90) : null;
  const educationAccess =
    eduCompScore !== null
      ? Math.round(eduEnrollScore * 0.7 + eduCompScore * 0.3)
      : eduEnrollScore;

  // 2. 教育費負担 (参考：公的教育支出 SE.XPD.TOTL.GD.ZS の逆数 + 高等教育規模の暫定補正)
  // ※家計直接支出の統一データがないため、公的支出が高いほど負担軽減傾向とする暫定換算
  const publicEduOffset =
    govEduGdp !== null ? normalizeLinear(govEduGdp, 2.5, 6.5, 25, 70, true) : 50;
  const tertContext =
    tertEnroll !== null ? normalizeLinear(tertEnroll, 10, 90, 42, 68) : 52;
  const educationCostBurden = Math.round(publicEduOffset * 0.65 + tertContext * 0.35);

  // 3. 医療アクセス (WHO UHC_INDEX_REPORTED)
  const medicalAccess =
    uhc !== null ? normalizeLinear(uhc, 45, 92, 42, 92) : 65;

  // 4. 医療費負担 (SH.XPD.OOPC.CH.ZS)
  const medicalCostBurden =
    oopHealth !== null ? normalizeLinear(oopHealth, 5, 50, 20, 78) : 45;

  // 5. 雇用機会 (SL.UEM.TOTL.ZS 逆方向 65% + SL.EMP.TOTL.SP.ZS 35%)
  const unempScore =
    unemp !== null ? normalizeLinear(unemp, 2.0, 10.0, 48, 86, true) : 65;
  const empRatioScore =
    empRatio !== null ? normalizeLinear(empRatio, 48, 66, 52, 82) : 65;
  const employmentOpportunity = Math.round(unempScore * 0.65 + empRatioScore * 0.35);

  // 6. 所得・生活水準 (NY.GDP.PCAP.PP.KD の対数正規化; 参考指標)
  const incomeLivingBalance =
    gdpPpp !== null
      ? normalizeLinear(Math.log10(Math.max(1000, gdpPpp)), 3.65, 4.92, 40, 86)
      : 60;

  // 7. 社会保障 (per_allsp.cov_pop_tot 利用可能国は実測反映、欠損国はUHCと医療自己負担低下からの暫定換算)
  const socProtMissing = socProt === null;
  let socialSecurity: number;
  if (socProt !== null) {
    const aspireScore = normalizeLinear(socProt, 15, 85, 36, 78);
    const uhcSupport = uhc !== null ? normalizeLinear(uhc, 45, 92, 38, 84) : 60;
    socialSecurity = Math.round(aspireScore * 0.6 + uhcSupport * 0.4);
  } else {
    const uhcPart = uhc !== null ? normalizeLinear(uhc, 45, 92, 45, 90) : 70;
    const oopInverse =
      oopHealth !== null ? normalizeLinear(oopHealth, 5, 45, 45, 90, true) : 70;
    socialSecurity = Math.round(uhcPart * 0.5 + oopInverse * 0.5);
  }

  // 8. 経済的不安定さ (FP.CPI.TOTL.ZG 55% + SL.UEM.TOTL.ZS 45%)
  const infScore =
    inflation !== null ? normalizeLinear(inflation, 1.5, 7.0, 28, 72) : 45;
  const unempRiskScore =
    unemp !== null ? normalizeLinear(unemp, 2.0, 10.0, 26, 68) : 45;
  const economicInstability = Math.round(infScore * 0.55 + unempRiskScore * 0.45);

  // 9. 地域間・所得格差 (参考：SI.POV.GINI)
  const regionalDisparity =
    gini !== null ? normalizeLinear(gini, 22, 54, 34, 78) : 52;

  // 10. 社会的移動機会 (参考：SE.TER.ENRR 50% + educationAccess 30% + (100 - regionalDisparity) 20%)
  const tertScore =
    tertEnroll !== null ? normalizeLinear(tertEnroll, 10, 90, 40, 82) : 58;
  const socialMobility = Math.round(
    tertScore * 0.5 + educationAccess * 0.3 + (100 - regionalDisparity) * 0.2
  );

  const params: CountrySocialParams = {
    educationAccess,
    educationCostBurden,
    medicalAccess,
    medicalCostBurden,
    employmentOpportunity,
    incomeLivingBalance,
    socialSecurity,
    economicInstability,
    regionalDisparity,
    socialMobility,
    difficultyEventMultiplier: 1.0,
  };

  const explanations: DerivedParameterExplanation[] = [
    {
      paramKey: 'educationAccess',
      labelJa: '教育アクセス（ゲーム内換算値）',
      derivedValue: educationAccess,
      formulaDescriptionJa:
        'SE.SEC.ENRR（65〜105%→45〜90）を主軸とし、SE.SEC.CMPT.LO.ZS（70〜102%→50〜90）が利用可能な場合は7:3で加重平均',
      sourceIndicators: ['SE.SEC.ENRR', 'SE.SEC.CMPT.LO.ZS'],
      isProvisionalDueToMissing: false,
    },
    {
      paramKey: 'educationCostBurden',
      labelJa: '教育費負担（ゲーム内換算値・暫定）',
      derivedValue: educationCostBurden,
      formulaDescriptionJa:
        '家計直接負担の統一データ欠損のため、SE.XPD.TOTL.GD.ZS（対GDP公的教育支出、逆方向65%）とSE.TER.ENRR（35%）から暫定換算',
      sourceIndicators: ['SE.XPD.TOTL.GD.ZS', 'SE.TER.ENRR'],
      isProvisionalDueToMissing: true,
    },
    {
      paramKey: 'medicalAccess',
      labelJa: '医療アクセス（ゲーム内換算値）',
      derivedValue: medicalAccess,
      formulaDescriptionJa:
        'WHO UHCサービス・カバレッジ指数（45〜92）をゲーム内42〜92へ線形正規化',
      sourceIndicators: ['UHC_INDEX_REPORTED (SDG 3.8.1)'],
      isProvisionalDueToMissing: false,
    },
    {
      paramKey: 'medicalCostBurden',
      labelJa: '医療費負担（ゲーム内換算値）',
      derivedValue: medicalCostBurden,
      formulaDescriptionJa:
        'SH.XPD.OOPC.CH.ZS（医療費自己負担割合 5〜50%）を20〜78へ線形正規化',
      sourceIndicators: ['SH.XPD.OOPC.CH.ZS'],
      isProvisionalDueToMissing: false,
    },
    {
      paramKey: 'employmentOpportunity',
      labelJa: '雇用機会（ゲーム内換算値）',
      derivedValue: employmentOpportunity,
      formulaDescriptionJa:
        'SL.UEM.TOTL.ZS（失業率 2〜10%を逆方向65%）とSL.EMP.TOTL.SP.ZS（就業率 48〜66%を35%）で加重平均',
      sourceIndicators: ['SL.UEM.TOTL.ZS', 'SL.EMP.TOTL.SP.ZS'],
      isProvisionalDueToMissing: false,
    },
    {
      paramKey: 'incomeLivingBalance',
      labelJa: '所得・経済水準（ゲーム内換算値・参考）',
      derivedValue: incomeLivingBalance,
      formulaDescriptionJa:
        'NY.GDP.PCAP.PP.KD（一人当たりGDP PPP）の常用対数 log10（3.65〜4.92）を40〜86へ正規化',
      sourceIndicators: ['NY.GDP.PCAP.PP.KD'],
      isProvisionalDueToMissing: false,
    },
    {
      paramKey: 'socialSecurity',
      labelJa: socProtMissing
        ? '社会保障（ゲーム内換算値・暫定）'
        : '社会保障（ゲーム内換算値）',
      derivedValue: socialSecurity,
      formulaDescriptionJa: socProtMissing
        ? 'ASPIRE社会保護カバー率が未収録（データなし）のため、WHO UHC指数（50%）と医療自己負担低下度（50%）から暫定換算'
        : 'per_allsp.cov_pop_tot（15〜85%→36〜78を60%）とWHO UHC指数（40%）で加重平均',
      sourceIndicators: socProtMissing
        ? ['UHC_INDEX_REPORTED (SDG 3.8.1)', 'SH.XPD.OOPC.CH.ZS']
        : ['per_allsp.cov_pop_tot', 'UHC_INDEX_REPORTED (SDG 3.8.1)'],
      isProvisionalDueToMissing: socProtMissing,
    },
    {
      paramKey: 'economicInstability',
      labelJa: '経済的不安定さ（ゲーム内換算値）',
      derivedValue: economicInstability,
      formulaDescriptionJa:
        'FP.CPI.TOTL.ZG（物価上昇率 1.5〜7.0%を55%）とSL.UEM.TOTL.ZS（失業率 2〜10%を45%）で加重平均',
      sourceIndicators: ['FP.CPI.TOTL.ZG', 'SL.UEM.TOTL.ZS'],
      isProvisionalDueToMissing: false,
    },
    {
      paramKey: 'regionalDisparity',
      labelJa: '格差・環境差（ゲーム内換算値・参考）',
      derivedValue: regionalDisparity,
      formulaDescriptionJa:
        '参考指標 SI.POV.GINI（ジニ指数 22〜54）を34〜78へ線形正規化（※都市農村格差そのものではなく所得不平等度）',
      sourceIndicators: ['SI.POV.GINI'],
      isProvisionalDueToMissing: false,
    },
    {
      paramKey: 'socialMobility',
      labelJa: '社会的移動機会（ゲーム内換算値・参考）',
      derivedValue: socialMobility,
      formulaDescriptionJa:
        '統一世代間移動統計がないため、SE.TER.ENRR（50%）・教育アクセス（30%）・格差の低さ（20%）から参考算出',
      sourceIndicators: ['SE.TER.ENRR', 'SE.SEC.ENRR', 'SI.POV.GINI'],
      isProvisionalDueToMissing: true,
    },
  ];

  return { params, explanations };
}

export function buildAllOfficialDerivedCountryParams(): Record<
  CountryId,
  CountrySocialParams
> {
  return {
    japan: convertOfficialStatsToGameParams('japan').params,
    usa: convertOfficialStatsToGameParams('usa').params,
    brazil: convertOfficialStatsToGameParams('brazil').params,
    india: convertOfficialStatsToGameParams('india').params,
    kenya: convertOfficialStatsToGameParams('kenya').params,
    france: convertOfficialStatsToGameParams('france').params,
  };
}
