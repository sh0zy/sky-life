import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Database,
  Calculator,
  AlertTriangle,
  Lock,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { CountryId } from '../../types/game';
import { COUNTRIES } from '../../data/gameData';
import {
  OFFICIAL_COUNTRY_STATISTICS,
  OFFICIAL_INDICATOR_LIST,
  VALUE_TYPE_LABELS,
  STATISTICS_LICENSES,
  formatOfficialValue,
} from '../../data/statisticsSources';
import { convertOfficialStatsToGameParams } from '../../utils/statisticsConverter';

interface CountryStatsModalProps {
  initialCountryId: CountryId;
  onClose: () => void;
}

export const CountryStatsModal: React.FC<CountryStatsModalProps> = ({
  initialCountryId,
  onClose,
}) => {
  const [selectedCountryId, setSelectedCountryId] =
    useState<CountryId>(initialCountryId);
  const [activeTab, setActiveTab] = useState<'official' | 'derived'>('official');

  const countryInfo =
    COUNTRIES.find((c) => c.id === selectedCountryId) || COUNTRIES[0];
  const { explanations } = convertOfficialStatsToGameParams(selectedCountryId);
  const retrievedDateLabel = OFFICIAL_COUNTRY_STATISTICS.retrievedAt.slice(0, 10);

  return (
    <div
      data-testid="country-stats-modal"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md select-none"
    >
      <div className="glass-panel max-w-4xl w-full rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-2xl border border-sky-400/40 max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-white/15 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/25 border border-sky-400/40 flex items-center justify-center text-sky-300 shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-black text-white leading-tight">
                国別データ・出典（公式国際統計）
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-300 mt-0.5">
                公式統計の原数値（読み取り専用）と、ゲーム内換算値を明確に分離して公開しています（データ取得日: {retrievedDateLabel}）
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="close-country-stats-modal"
            onClick={onClose}
            aria-label="国別データ画面を閉じる"
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-white/10 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Country Selector */}
        <div className="flex flex-wrap items-center gap-1.5 py-2.5 border-b border-white/10 shrink-0">
          {COUNTRIES.map((c) => {
            const iso =
              OFFICIAL_COUNTRY_STATISTICS.targetCountries.find(
                (t) => t.id === c.id
              )?.iso3 || '';
            const isSelected = c.id === selectedCountryId;
            return (
              <button
                key={c.id}
                type="button"
                data-testid={`stats-country-tab-${c.id}`}
                onClick={() => setSelectedCountryId(c.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition border ${
                  isSelected
                    ? 'bg-sky-500/30 border-sky-400 text-white shadow'
                    : 'bg-slate-900/70 border-white/10 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{c.flag}</span>
                <span>{c.name}</span>
                <span className="text-[10px] text-slate-400 font-bold">{iso}</span>
              </button>
            );
          })}
        </div>

        {/* Mode Switch Tabs: A. Official Statistics vs B. Game-Calculated Parameters */}
        <div className="grid grid-cols-2 gap-2 py-2 shrink-0">
          <button
            type="button"
            data-testid="stats-tab-official"
            onClick={() => setActiveTab('official')}
            className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 border transition ${
              activeTab === 'official'
                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>A. 公式統計データ（原数値）</span>
          </button>
          <button
            type="button"
            data-testid="stats-tab-derived"
            onClick={() => setActiveTab('derived')}
            className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 border transition ${
              activeTab === 'derived'
                ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 shrink-0" />
            <span>B. ゲーム内換算値・計算式</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 my-1">
          {activeTab === 'official' ? (
            <>
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5 text-[11px] text-emerald-100 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black">
                    {countryInfo.flag} {countryInfo.name} の公式統計（読み取り専用・改変なし）
                  </span>
                  <p className="text-[10px] text-emerald-200/85 mt-0.5">
                    World Bank / WHO / UNESCO UIS / ILOSTAT が公表する原数値と単位をそのまま保持しています。取得できない項目は「データなし」と明記し、推測値で補完していません。
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {OFFICIAL_INDICATOR_LIST.map((ind) => {
                  const entry = ind.countries[selectedCountryId];
                  const isMissing = !entry || entry.missing || entry.value === null;
                  const formatted = entry ? formatOfficialValue(entry) : 'データなし';

                  return (
                    <div
                      key={ind.key}
                      data-testid={`official-stat-${ind.key}`}
                      className="bg-slate-900/80 border border-white/10 rounded-xl p-3 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <span className="text-[10px] font-extrabold text-sky-300 bg-sky-500/15 px-2 py-0.5 rounded-full">
                            {ind.gameDomain}
                          </span>
                          <div className="flex items-center gap-1">
                            {ind.isProxy && (
                              <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                                参考・代替指標
                              </span>
                            )}
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                isMissing
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-white/10 text-slate-300'
                              }`}
                            >
                              {entry ? VALUE_TYPE_LABELS[entry.valueType] : 'データなし'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-1.5">
                          <div className="text-xs sm:text-sm font-black text-white leading-snug">
                            {ind.indicatorNameJa}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            コード: {ind.indicatorCode}
                          </div>
                        </div>

                        <div className="mt-2 flex items-baseline justify-between gap-2 bg-slate-950/70 rounded-lg px-2.5 py-1.5 border border-white/5">
                          <div>
                            <div className="text-[9px] text-slate-400">公式数値</div>
                            <div
                              className={`text-base sm:text-lg font-black tabular-nums ${
                                isMissing ? 'text-rose-300' : 'text-emerald-300'
                              }`}
                            >
                              {formatted}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] text-slate-400">
                              対象年 / 単位
                            </div>
                            <div className="text-[11px] font-bold text-white">
                              {entry?.year ? `${entry.year}年` : '—'}
                              <span className="text-[9px] text-slate-400 ml-1">
                                ({ind.unit})
                              </span>
                            </div>
                            <div className="text-[9px] text-slate-400">
                              {ind.yearPolicy === 'common_year'
                                ? '6か国共通年'
                                : '国別最新利用可能年'}
                            </div>
                          </div>
                        </div>

                        {ind.proxyNoteJa && (
                          <div className="mt-1.5 text-[10px] text-amber-200/90 bg-amber-500/10 border border-amber-400/20 rounded-lg px-2 py-1 leading-snug flex items-start gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-amber-300" />
                            <span>{ind.proxyNoteJa}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-1.5 border-t border-white/10 flex items-center justify-between gap-2 text-[10px] text-slate-300">
                        <div className="truncate">
                          出典: <span className="font-bold text-white">{ind.publishingAgency}</span>
                        </div>
                        <a
                          href={entry?.sourceUrl || ind.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-200 font-bold shrink-0 underline"
                        >
                          <span>公式ページ</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-2.5 text-[11px] text-amber-100 flex items-start gap-2">
                <Calculator className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black">
                    {countryInfo.flag} {countryInfo.name} のゲーム内換算値（0〜100・独自設計）
                  </span>
                  <p className="text-[10px] text-amber-200/85 mt-0.5">
                    以下は公式統計の原数値ではなく、ゲームの難易度やイベント発生傾向を調整するために変換式で算出した「ゲーム内換算値」です。極端な難易度にならないよう上下限を設けており、家庭環境やプレイヤーの選択も大きく影響します。
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {explanations.map((exp) => (
                  <div
                    key={exp.paramKey}
                    data-testid={`derived-param-${exp.paramKey}`}
                    className="bg-slate-900/80 border border-white/10 rounded-xl p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-black text-white">
                          {exp.labelJa}
                        </span>
                        {exp.isProvisionalDueToMissing && (
                          <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                            暫定換算（直接統計なし/欠損）
                          </span>
                        )}
                      </div>
                      <span className="text-sm sm:text-base font-black text-amber-300 tabular-nums">
                        {exp.derivedValue} / 100
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-400 to-amber-400"
                        style={{ width: `${exp.derivedValue}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-300 leading-snug">
                      <span className="text-sky-300 font-bold">変換式: </span>
                      {exp.formulaDescriptionJa}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      参照指標コード: {exp.sourceIndicators.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* License & Attribution Footer */}
          <div className="bg-slate-950/80 border border-white/10 rounded-xl p-3 space-y-1.5">
            <div className="text-[11px] font-black text-slate-200 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-sky-300" />
              <span>データ出典・ライセンス表記</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
              {STATISTICS_LICENSES.map((lic) => (
                <a
                  key={lic.agency}
                  href={lic.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between bg-slate-900/70 hover:bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-white/5 text-slate-300 hover:text-white transition"
                >
                  <span className="font-bold">{lic.agency}</span>
                  <span className="text-sky-300 flex items-center gap-1">
                    {lic.license}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
