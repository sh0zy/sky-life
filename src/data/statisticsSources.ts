import officialStatsJson from './officialCountryStatistics.json';
import { CountryId } from '../types/game';

export type ValueType = 'actual' | 'estimate' | 'model_estimate' | 'missing';
export type YearPolicy = 'common_year' | 'latest_available_per_country';

export interface OfficialCountryValue {
  countryIso3: 'JPN' | 'USA' | 'BRA' | 'IND' | 'KEN' | 'FRA';
  countryId: CountryId;
  countryNameJa: string;
  indicatorNameJa: string;
  indicatorNameEn: string;
  indicatorCode: string;
  value: number | null;
  unit: string;
  year: number | null;
  publishingAgency: string;
  sourceOrganization: string;
  sourceUrl: string;
  retrievedAt: string;
  valueType: ValueType;
  missing: boolean;
}

export interface OfficialIndicatorRecord {
  key: string;
  gameDomain: string;
  indicatorNameJa: string;
  indicatorNameEn: string;
  indicatorCode: string;
  unit: string;
  publishingAgency: string;
  sourceOrganization: string;
  sourceUrl: string;
  valueType: ValueType;
  isProxy: boolean;
  proxyNoteJa: string | null;
  yearPolicy: YearPolicy;
  commonYear: number | null;
  retrievedAt: string;
  countries: Record<CountryId, OfficialCountryValue>;
}

export interface OfficialStatisticsDataset {
  schemaVersion: number;
  retrievedAt: string;
  targetCountries: Array<{
    iso3: 'JPN' | 'USA' | 'BRA' | 'IND' | 'KEN' | 'FRA';
    id: CountryId;
    nameJa: string;
  }>;
  indicators: Record<string, OfficialIndicatorRecord>;
}

export const OFFICIAL_COUNTRY_STATISTICS: OfficialStatisticsDataset =
  officialStatsJson as OfficialStatisticsDataset;

export const OFFICIAL_INDICATOR_LIST: OfficialIndicatorRecord[] = Object.values(
  OFFICIAL_COUNTRY_STATISTICS.indicators
);

export function getOfficialIndicatorForCountry(
  indicatorKey: string,
  countryId: CountryId
): OfficialCountryValue | null {
  const ind = OFFICIAL_COUNTRY_STATISTICS.indicators[indicatorKey];
  if (!ind) return null;
  return ind.countries[countryId] || null;
}

export function formatOfficialValue(entry: OfficialCountryValue): string {
  if (entry.missing || entry.value === null) {
    return 'データなし';
  }
  const val = entry.value;
  if (entry.unit.includes('international $')) {
    return `$${Math.round(val).toLocaleString('en-US')}`;
  }
  if (entry.unit.startsWith('%')) {
    return `${val.toFixed(1)}%`;
  }
  if (Number.isInteger(val)) {
    return `${val}`;
  }
  return `${val.toFixed(1)}`;
}

export const VALUE_TYPE_LABELS: Record<ValueType, string> = {
  actual: '実測値',
  estimate: '推計値',
  model_estimate: 'モデル推計',
  missing: 'データなし（欠損）',
};

export const STATISTICS_LICENSES = [
  {
    agency: 'World Bank Open Data',
    license: 'CC BY 4.0',
    url: 'https://data.worldbank.org/summary-terms-of-use',
  },
  {
    agency: 'WHO Global Health Observatory (GHO)',
    license: 'CC BY-NC-SA 3.0 IGO / WHO Terms',
    url: 'https://www.who.int/about/policies/publishing/data-policy',
  },
  {
    agency: 'UNESCO Institute for Statistics (UIS)',
    license: 'CC BY-SA 3.0 IGO (via World Bank)',
    url: 'https://uis.unesco.org/',
  },
  {
    agency: 'ILOSTAT',
    license: 'ILO Open Data Terms (via World Bank)',
    url: 'https://ilostat.ilo.org/',
  },
];
