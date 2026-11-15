import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type Iso3 = 'JPN' | 'USA' | 'BRA' | 'IND' | 'KEN' | 'FRA';
type CountryId = 'japan' | 'usa' | 'brazil' | 'india' | 'kenya' | 'france';

const COUNTRIES: Array<{ iso3: Iso3; id: CountryId; nameJa: string }> = [
  { iso3: 'JPN', id: 'japan', nameJa: '日本' },
  { iso3: 'USA', id: 'usa', nameJa: 'アメリカ' },
  { iso3: 'BRA', id: 'brazil', nameJa: 'ブラジル' },
  { iso3: 'IND', id: 'india', nameJa: 'インド' },
  { iso3: 'KEN', id: 'kenya', nameJa: 'ケニア' },
  { iso3: 'FRA', id: 'france', nameJa: 'フランス' },
];

interface IndicatorSpec {
  key: string;
  gameDomain: string;
  nameJa: string;
  wbCode: string;
  unit: string;
  publishingAgency: string;
  sourceOrganizationFallback: string;
  valueType: 'actual' | 'estimate' | 'model_estimate';
  isProxy: boolean;
  proxyNoteJa: string | null;
  sourceUrlTemplate: (code: string) => string;
}

const INDICATOR_SPECS: IndicatorSpec[] = [
  {
    key: 'secondaryEnrollmentGross',
    gameDomain: '教育アクセス',
    nameJa: '中等教育総就学率',
    wbCode: 'SE.SEC.ENRR',
    unit: '% (gross)',
    publishingAgency: 'World Bank / UNESCO UIS',
    sourceOrganizationFallback: 'UNESCO Institute for Statistics (UIS)',
    valueType: 'actual',
    isProxy: false,
    proxyNoteJa: null,
    sourceUrlTemplate: (c) => `https://data.worldbank.org/indicator/${c}`,
  },
  {
    key: 'lowerSecondaryCompletion',
    gameDomain: '教育アクセス（修了）',
    nameJa: '前期中等教育修了率',
    wbCode: 'SE.SEC.CMPT.LO.ZS',
    unit: '% of relevant age group',
    publishingAgency: 'World Bank / UNESCO UIS',
    sourceOrganizationFallback: 'UNESCO Institute for Statistics (UIS)',
    valueType: 'actual',
    isProxy: false,
    proxyNoteJa: null,
    sourceUrlTemplate: (c) => `https://data.worldbank.org/indicator/${c}`,
  },
  {
    key: 'govEducationExpenditurePctGdp',
    gameDomain: '教育費負担（参考：公的教育支出）',
    nameJa: '政府の教育支出（対GDP比）',
    wbCode: 'SE.XPD.TOTL.GD.ZS',
    unit: '% of GDP',
    publishingAgency: 'World Bank / UNESCO UIS',
    sourceOrganizationFallback: 'UNESCO Institute for Statistics (UIS)',
    valueType: 'actual',
    isProxy: true,
    proxyNoteJa:
      '家計の教育費自己負担額そのものではなく、公的教育投資水準を示す参考指標です（6か国共通の家計直接負担統計はWorld Bank APIに単一指標がないため参考値として区別）。',
    sourceUrlTemplate: (c) => `https://data.worldbank.org/indicator/${c}`,
  },
  {
    key: 'uhcServiceCoverageIndex',
    gameDomain: '医療アクセス',
    nameJa: 'UHCサービス・カバレッジ指数（SDG 3.8.1）',
    wbCode: 'SH.UHC.SRVS.CV.XD',
    unit: 'Index (0-100)',
    publishingAgency: 'WHO (World Health Organization)',
    sourceOrganizationFallback: 'World Health Organization (WHO)',
    valueType: 'estimate',
    isProxy: false,
    proxyNoteJa: null,
    sourceUrlTemplate: () => 'https://www.who.int/data/gho/data/indicators/indicator-details/GHO/uhc-index-of-service-coverage',
  },
  {
    key: 'outOfPocketHealthPct',
    gameDomain: '医療費負担',
    nameJa: '経常医療費に占める自己負担支出割合',
    wbCode: 'SH.XPD.OOPC.CH.ZS',
    unit: '% of current health expenditure',
    publishingAgency: 'World Bank / WHO GHED',
    sourceOrganizationFallback: 'World Health Organization Global Health Expenditure Database',
    valueType: 'estimate',
    isProxy: false,
    proxyNoteJa: null,
    sourceUrlTemplate: (c) => `https://data.worldbank.org/indicator/${c}`,
  },
  {
    key: 'unemploymentRate',
    gameDomain: '雇用機会・経済不安定さ',
    nameJa: '失業率（ILOモデル推計）',
    wbCode: 'SL.UEM.TOTL.ZS',
    unit: '% of total labor force',
    publishingAgency: 'World Bank / ILOSTAT',
    sourceOrganizationFallback: 'International Labour Organization (ILOSTAT)',
    valueType: 'model_estimate',
    isProxy: false,
    proxyNoteJa: null,
    sourceUrlTemplate: (c) => `https://data.worldbank.org/indicator/${c}`,
  },
  {
    key: 'employmentToPopulationRatio',
    gameDomain: '雇用機会（就業率）',
    nameJa: '15歳以上就業率（ILOモデル推計）',
    wbCode: 'SL.EMP.TOTL.SP.ZS',
    unit: '% of population ages 15+',
    publishingAgency: 'World Bank / ILOSTAT',
    sourceOrganizationFallback: 'International Labour Organization (ILOSTAT)',
    valueType: 'model_estimate',
    isProxy: false,
    proxyNoteJa: null,
    sourceUrlTemplate: (c) => `https://data.worldbank.org/indicator/${c}`,
  },
  {
    key: 'gdpPerCapitaPpp',
    gameDomain: '所得・生活水準（参考）',
    nameJa: '一人当たりGDP（PPP・2021年実質国際ドル）',
    wbCode: 'NY.GDP.PCAP.PP.KD',
    unit: 'constant 2021 international $',
    publishingAgency: 'World Bank',
    sourceOrganizationFallback: 'World Bank International Comparison Program (ICP)',
    valueType: 'estimate',
    isProxy: true,
    proxyNoteJa:
      'マクロな経済生産水準の指標であり、各家庭の可処分所得や生活費バランスそのものではありません。',
    sourceUrlTemplate: (c) => `https://data.worldbank.org/indicator/${c}`,
  },
  {
    key: 'socialProtectionCoverage',
    gameDomain: '社会保障',
    nameJa: '社会保護・労働プログラムの人口カバー率',
    wbCode: 'per_allsp.cov_pop_tot',
    unit: '% of population',
    publishingAgency: 'World Bank ASPIRE',
    sourceOrganizationFallback: 'World Bank ASPIRE: The Atlas of Social Protection',
    valueType: 'estimate',
    isProxy: false,
    proxyNoteJa:
      '対象6か国の中で調査対象国（主に中低所得国等）にのみデータが存在し、高所得国（日本・アメリカ・フランス等）は欠損（データなし）となる場合があります。',
    sourceUrlTemplate: (c) => `https://data.worldbank.org/indicator/${c}`,
  },
  {
    key: 'inflationCpiAnnual',
    gameDomain: '経済的不安定さ（参考：物価変動）',
    nameJa: '消費者物価上昇率（年率）',
    wbCode: 'FP.CPI.TOTL.ZG',
    unit: '% (annual)',
    publishingAgency: 'World Bank / IMF',
    sourceOrganizationFallback: 'International Monetary Fund (IMF) IFS',
    valueType: 'actual',
    isProxy: true,
    proxyNoteJa: '物価変動の指標であり、雇用・景気変動などの一側面を示す参考指標です。',
    sourceUrlTemplate: (c) => `https://data.worldbank.org/indicator/${c}`,
  },
  {
    key: 'giniIndex',
    gameDomain: '地域間・所得格差（参考）',
    nameJa: 'ジニ指数（所得不平等度）',
    wbCode: 'SI.POV.GINI',
    unit: 'Index (0-100)',
    publishingAgency: 'World Bank PIP',
    sourceOrganizationFallback: 'World Bank Poverty and Inequality Platform',
    valueType: 'estimate',
    isProxy: true,
    proxyNoteJa:
      '国全体の所得分配の不平等度を示す指標であり、都市・地方間の「地域間格差」そのものではありません（参考指標として区別）。',
    sourceUrlTemplate: (c) => `https://data.worldbank.org/indicator/${c}`,
  },
  {
    key: 'tertiaryEnrollmentGross',
    gameDomain: '社会的移動機会（参考：高等教育アクセス）',
    nameJa: '高等教育総就学率',
    wbCode: 'SE.TER.ENRR',
    unit: '% (gross)',
    publishingAgency: 'World Bank / UNESCO UIS',
    sourceOrganizationFallback: 'UNESCO Institute for Statistics (UIS)',
    valueType: 'actual',
    isProxy: true,
    proxyNoteJa:
      '6か国統一の「世代間所得移動率」公式統計はWorld Bank APIに存在しないため、社会的移動機会を考察する際の参考指標として高等教育就学率を併記しています。',
    sourceUrlTemplate: (c) => `https://data.worldbank.org/indicator/${c}`,
  },
];

async function fetchJsonWithRetry(url: string, retries = 4): Promise<unknown> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SKY-LIFE-Stats-Updater/1.0' },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
      const delayMs = 600 * attempt;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

async function fetchWhoUhc(): Promise<Record<Iso3, Array<{ year: number; value: number }>>> {
  const filter = encodeURIComponent(
    "SpatialDim in ('JPN','USA','BRA','IND','KEN','FRA') and TimeDim ge 2010"
  );
  const url = `https://ghoapi.azureedge.net/api/UHC_INDEX_REPORTED?$filter=${filter}`;
  const json = (await fetchJsonWithRetry(url)) as {
    value?: Array<{ SpatialDim?: string; TimeDim?: number; NumericValue?: number }>;
  };
  const out: Record<Iso3, Array<{ year: number; value: number }>> = {
    JPN: [],
    USA: [],
    BRA: [],
    IND: [],
    KEN: [],
    FRA: [],
  };
  for (const row of json.value || []) {
    const dim = row.SpatialDim as Iso3 | undefined;
    if (dim && out[dim] && typeof row.NumericValue === 'number' && typeof row.TimeDim === 'number') {
      out[dim].push({ year: row.TimeDim, value: row.NumericValue });
    }
  }
  for (const c of Object.keys(out) as Iso3[]) {
    out[c].sort((a, b) => b.year - a.year);
  }
  return out;
}

async function main() {
  const retrievedAt = new Date().toISOString();
  const isoList = COUNTRIES.map((c) => c.iso3).join(';');

  console.log('Fetching WHO GHO UHC_INDEX_REPORTED...');
  let whoUhc: Record<Iso3, Array<{ year: number; value: number }>> | null = null;
  try {
    whoUhc = await fetchWhoUhc();
    console.log('WHO GHO fetch succeeded.');
  } catch (err) {
    console.warn('WHO GHO direct fetch failed, falling back to World Bank mirror if available:', err);
  }

  const indicatorsOutput: Record<string, unknown> = {};

  for (const spec of INDICATOR_SPECS) {
    console.log(`Fetching World Bank indicator ${spec.wbCode} (${spec.nameJa})...`);
    const metaUrl = `https://api.worldbank.org/v2/indicator/${spec.wbCode}?format=json`;
    const dataUrl = `https://api.worldbank.org/v2/country/${isoList}/indicator/${spec.wbCode}?format=json&per_page=1000&date=2010:2024`;

    let officialIndicatorNameEn = spec.wbCode;
    let sourceOrg = spec.sourceOrganizationFallback;

    try {
      const metaJson = (await fetchJsonWithRetry(metaUrl)) as unknown[];
      if (Array.isArray(metaJson) && Array.isArray(metaJson[1]) && metaJson[1][0]) {
        const m = metaJson[1][0] as { name?: string; sourceOrganization?: string };
        if (m.name) officialIndicatorNameEn = m.name;
        if (m.sourceOrganization) sourceOrg = m.sourceOrganization.trim();
      }
    } catch (e) {
      console.warn(`Metadata fetch warning for ${spec.wbCode}:`, e);
    }

    const byIso: Record<Iso3, Array<{ year: number; value: number }>> = {
      JPN: [],
      USA: [],
      BRA: [],
      IND: [],
      KEN: [],
      FRA: [],
    };

    if (spec.wbCode === 'SH.UHC.SRVS.CV.XD' && whoUhc) {
      for (const c of COUNTRIES) {
        byIso[c.iso3] = whoUhc[c.iso3];
      }
    } else {
      const dataJson = (await fetchJsonWithRetry(dataUrl)) as unknown[];
      const rows = Array.isArray(dataJson) && Array.isArray(dataJson[1]) ? dataJson[1] : [];
      for (const raw of rows as Array<{
        countryiso3code?: string;
        date?: string;
        value?: number | null;
      }>) {
        const iso = raw.countryiso3code as Iso3 | undefined;
        const yr = raw.date ? Number(raw.date) : NaN;
        if (iso && byIso[iso] && Number.isFinite(yr) && typeof raw.value === 'number') {
          byIso[iso].push({ year: yr, value: raw.value });
        }
      }
      for (const c of COUNTRIES) {
        byIso[c.iso3].sort((a, b) => b.year - a.year);
      }
    }

    // Determine common year across all 6 countries
    const yearCounts: Record<number, number> = {};
    for (const c of COUNTRIES) {
      const seenYears = new Set<number>();
      for (const pt of byIso[c.iso3]) {
        if (!seenYears.has(pt.year)) {
          seenYears.add(pt.year);
          yearCounts[pt.year] = (yearCounts[pt.year] || 0) + 1;
        }
      }
    }
    const commonYears = Object.keys(yearCounts)
      .map(Number)
      .filter((y) => yearCounts[y] === COUNTRIES.length)
      .sort((a, b) => b - a);

    const selectedCommonYear = commonYears.length > 0 ? commonYears[0] : null;
    const yearPolicy =
      selectedCommonYear !== null ? 'common_year' : 'latest_available_per_country';

    const countryValues: Record<string, unknown> = {};
    for (const c of COUNTRIES) {
      const series = byIso[c.iso3];
      let chosen: { year: number; value: number } | null = null;
      if (selectedCommonYear !== null) {
        chosen = series.find((p) => p.year === selectedCommonYear) || null;
      } else {
        chosen = series[0] || null;
      }

      countryValues[c.id] = {
        countryIso3: c.iso3,
        countryId: c.id,
        countryNameJa: c.nameJa,
        indicatorNameJa: spec.nameJa,
        indicatorNameEn: officialIndicatorNameEn,
        indicatorCode:
          spec.wbCode === 'SH.UHC.SRVS.CV.XD' && whoUhc ? 'UHC_INDEX_REPORTED (SDG 3.8.1)' : spec.wbCode,
        value: chosen ? chosen.value : null,
        unit: spec.unit,
        year: chosen ? chosen.year : null,
        publishingAgency: spec.publishingAgency,
        sourceOrganization: sourceOrg,
        sourceUrl: spec.sourceUrlTemplate(spec.wbCode),
        retrievedAt,
        valueType: chosen ? spec.valueType : 'missing',
        missing: chosen === null,
      };
    }

    indicatorsOutput[spec.key] = {
      key: spec.key,
      gameDomain: spec.gameDomain,
      indicatorNameJa: spec.nameJa,
      indicatorNameEn: officialIndicatorNameEn,
      indicatorCode:
        spec.wbCode === 'SH.UHC.SRVS.CV.XD' && whoUhc ? 'UHC_INDEX_REPORTED (SDG 3.8.1)' : spec.wbCode,
      unit: spec.unit,
      publishingAgency: spec.publishingAgency,
      sourceOrganization: sourceOrg,
      sourceUrl: spec.sourceUrlTemplate(spec.wbCode),
      valueType: spec.valueType,
      isProxy: spec.isProxy,
      proxyNoteJa: spec.proxyNoteJa,
      yearPolicy,
      commonYear: selectedCommonYear,
      retrievedAt,
      countries: countryValues,
    };
  }

  const output = {
    schemaVersion: 1,
    retrievedAt,
    targetCountries: COUNTRIES,
    indicators: indicatorsOutput,
  };

  const outPath = resolve(__dirname, '../src/data/officialCountryStatistics.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf-8');
  console.log(`Saved official statistics to ${outPath}`);
}

main().catch((err) => {
  console.error('Fatal error updating country statistics:', err);
  process.exit(1);
});
