import React, { useState } from 'react';
import { useGameStore, evaluateLifeTitle } from '../../store/useGameStore';
import { formatStatNumber, getStatBarProgress } from '../../utils/statSystem';
import { getLifeDifficultyBandInfo } from '../../utils/socialSimulation';
import { StatDelta } from '../../types/game';

const DELTA_LABELS: Record<keyof StatDelta, string> = {
  happiness: '幸福度',
  health: '健康',
  money: 'お金',
  relationships: '人間関係',
  knowledge: '知識・スキル',
  selfActualization: '自己実現',
  resilience: 'レジリエンス',
};
import {
  RotateCcw,
  Download,
  History,
  Award,
  Sparkles,
  CheckCircle2,
  Globe,
  ShieldCheck,
  HeartHandshake,
} from 'lucide-react';

export const EndingScreen: React.FC = () => {
  const phase = useGameStore((s) => s.phase);
  const country = useGameStore((s) => s.country);
  const conditions = useGameStore((s) => s.conditions);
  const initialLifeDifficultyIndex = useGameStore((s) => s.initialLifeDifficultyIndex);
  const lifeDifficultyIndex = useGameStore((s) => s.lifeDifficultyIndex);
  const utilizedSupports = useGameStore((s) => s.utilizedSupports);
  const overcomeHardships = useGameStore((s) => s.overcomeHardships);
  const environmentChangeLogs = useGameStore((s) => s.environmentChangeLogs);
  const age = useGameStore((s) => s.age);
  const career = useGameStore((s) => s.career);
  const stats = useGameStore((s) => s.stats);
  const tags = useGameStore((s) => s.tags);
  const history = useGameStore((s) => s.history);
  const completedChallenges = useGameStore((s) => s.completedChallenges);
  const startNewGameSelect = useGameStore((s) => s.startNewGameSelect);

  const [showFullLog, setShowFullLog] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  if (phase !== 'ENDING') return null;

  const titleObj = evaluateLifeTitle(
    stats,
    tags,
    initialLifeDifficultyIndex,
    lifeDifficultyIndex
  );
  const initialBand = getLifeDifficultyBandInfo(initialLifeDifficultyIndex);
  const finalBand = getLifeDifficultyBandInfo(lifeDifficultyIndex);

  const choiceItems = history.filter((h) => h.type === 'choice');
  const recoveryItems = history.filter((h) => h.type === 'recovery');

  // Generate a commemorative PNG summary card using HTML5 Canvas
  const handleDownloadResultImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 675;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 1200, 675);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#7c2d12');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 675);

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
    ctx.lineWidth = 4;
    ctx.strokeRect(32, 32, 1136, 611);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('SKY LIFE — 空飛ぶ人生ゲーム 人生の記録証', 70, 82);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText(`称号：『${titleObj.title}』`, 70, 148);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '22px sans-serif';
    ctx.fillText(titleObj.subtitle, 70, 190);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(
      `誕生国：${country.flag} ${country.name}（${conditions.residenceArea}・${conditions.economy}） ｜ 到達：${Math.floor(age)}歳`,
      70,
      245
    );
    ctx.fillStyle = '#a5f3fc';
    ctx.font = 'bold 21px sans-serif';
    ctx.fillText(
      `初期環境難易度：${initialLifeDifficultyIndex}（${initialBand.band}） ➔ 最終環境：${lifeDifficultyIndex}（${finalBand.band}） ｜ 主な活動：${career}`,
      70,
      284
    );

    const statEntries = [
      ['幸福度', stats.happiness],
      ['健康', stats.health],
      ['お金', stats.money],
      ['人間関係', stats.relationships],
      ['知識・スキル', stats.knowledge],
      ['自己実現', stats.selfActualization],
      ['レジリエンス', stats.resilience],
    ];

    statEntries.forEach(([label, val], idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const bx = 70 + col * 265;
      const by = 325 + row * 105;

      ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
      ctx.fillRect(bx, by, 240, 82);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, 240, 82);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(String(label), bx + 18, by + 30);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText(formatStatNumber(Number(val)), bx + 18, by + 68);
    });

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('「生まれる環境は選べないが、その空をどう飛ぶかは選択できる。」', 70, 602);

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `sky-life-record-${Date.now()}.png`;
    a.click();

    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-3 md:p-6 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel max-w-5xl w-full rounded-3xl p-6 md:p-9 shadow-2xl border-2 border-amber-400/50 my-auto max-h-[94vh] overflow-y-auto">
        {/* Top Badge & Life Title */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/20 border border-amber-300/40 text-amber-300 text-xs font-black tracking-widest uppercase">
            <Sparkles className="w-4 h-4" />
            JOURNEY COMPLETE — 出生環境と歩んだ人生の振り返り
          </div>

          <div className="mt-3 text-sm font-bold text-sky-300">
            あなただけの人生を表す称号
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-amber-300 mt-1 text-glow">
            『{titleObj.title}』
          </h1>
          <p className="text-sm md:text-base font-bold text-white mt-1">
            {titleObj.subtitle}
          </p>
          <p className="text-xs md:text-sm text-slate-300 max-w-2xl mx-auto mt-2 leading-relaxed">
            {titleObj.description}
          </p>
        </div>

        {/* Section 12 Required: Birth Environment vs Final Life Environment Summary */}
        <div className="mt-6 glass-card rounded-2xl p-5 border border-sky-400/30 text-left space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-2.5">
            <div className="text-xs font-extrabold text-sky-300 uppercase flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              出生環境とその後の人生環境の軌跡
            </div>
            <div className="text-xs font-bold text-amber-300">
              最終的な幸福度：{formatStatNumber(stats.happiness)}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-900/75 p-3 rounded-xl border border-white/10">
              <div className="text-slate-400 font-bold text-[11px]">生まれた国・到達年齢</div>
              <div className="text-base font-black text-white mt-1">
                {country.flag} {country.name}（{Math.floor(age)}歳）
              </div>
              <div className="text-[11px] text-sky-300 mt-0.5">
                主なキャリア：{career}
              </div>
            </div>

            <div className="bg-slate-900/75 p-3 rounded-xl border border-white/10">
              <div className="text-slate-400 font-bold text-[11px]">出生時の家庭環境</div>
              <div className="text-sm font-black text-amber-300 mt-1">
                {conditions.economy}
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                {conditions.residenceArea} ／ {conditions.familySupport}
              </div>
            </div>

            <div className="bg-slate-900/75 p-3 rounded-xl border border-white/10">
              <div className="text-slate-400 font-bold text-[11px]">初期の人生環境難易度</div>
              <div
                className="text-lg font-black mt-1 tabular-nums"
                style={{ color: initialBand.color }}
              >
                {initialLifeDifficultyIndex} / 100
              </div>
              <div className="text-[11px] text-slate-200 font-bold mt-0.5">
                {initialBand.band}
              </div>
            </div>

            <div className="bg-slate-900/75 p-3 rounded-xl border border-white/10">
              <div className="text-slate-400 font-bold text-[11px]">最終的な人生環境</div>
              <div
                className="text-lg font-black mt-1 tabular-nums"
                style={{ color: finalBand.color }}
              >
                {lifeDifficultyIndex} / 100
              </div>
              <div className="text-[11px] text-slate-200 font-bold mt-0.5">
                {finalBand.band}
                {tags.includes('urban_relocated') ? '（都市移動・開拓済）' : ''}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-white/5">
            💡 どのような国や家庭環境から始まった人生であっても、あなたが選び取った絆・挑戦・穏やかな日常のすべてに固有の価値と輝きがあります。
          </div>
        </div>

        {/* Final 7 Life Status Bars */}
        <div className="mt-5 glass-card rounded-2xl p-4">
          <div className="text-xs font-extrabold text-sky-300 uppercase tracking-wider mb-3">
            📊 最終ステータス（上限なし成長スコア）
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 text-center">
            {[
              { label: '幸福度', val: stats.happiness, color: 'text-amber-300', bar: 'bg-amber-400' },
              { label: '健康', val: stats.health, color: 'text-emerald-300', bar: 'bg-emerald-400' },
              { label: 'お金', val: stats.money, color: 'text-yellow-300', bar: 'bg-yellow-400' },
              { label: '人間関係', val: stats.relationships, color: 'text-rose-300', bar: 'bg-rose-400' },
              { label: '知識・スキル', val: stats.knowledge, color: 'text-sky-300', bar: 'bg-sky-400' },
              { label: '自己実現', val: stats.selfActualization, color: 'text-purple-300', bar: 'bg-purple-400' },
              { label: 'レジリエンス', val: stats.resilience, color: 'text-teal-300', bar: 'bg-teal-400' },
            ].map((s) => {
              const barInfo = getStatBarProgress(s.val);
              return (
                <div
                  key={s.label}
                  className="bg-slate-900/75 rounded-xl p-2.5 border border-white/10 flex flex-col justify-between"
                >
                  <div className="text-[11px] text-slate-300 font-bold truncate">{s.label}</div>
                  <div className={`text-xl md:text-2xl font-black mt-0.5 tabular-nums ${s.color}`}>
                    {formatStatNumber(s.val)}
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                    <div className={`h-full ${s.bar}`} style={{ width: `${barInfo.percent}%` }} />
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{barInfo.tierLabel}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 12 Required: Overcome Hardships, Utilized Supports, and Major Turning Points */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {/* 1. 乗り越えた困難 */}
          <div className="glass-card rounded-2xl p-4 text-left">
            <div className="text-xs font-extrabold text-rose-300 uppercase mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              乗り越えた困難 ({overcomeHardships.length + recoveryItems.length})
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {overcomeHardships.map((h, i) => (
                <div key={i} className="text-xs bg-slate-900/65 p-2 rounded-lg text-slate-200 font-semibold">
                  ・{h}
                </div>
              ))}
              {overcomeHardships.length === 0 && recoveryItems.length === 0 && (
                <div className="text-xs text-slate-400">
                  大きな衝突を回避しながら穏やかに飛行しました
                </div>
              )}
            </div>
          </div>

          {/* 2. 利用した支援制度 */}
          <div className="glass-card rounded-2xl p-4 text-left">
            <div className="text-xs font-extrabold text-sky-300 uppercase mb-2 flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4" />
              利用した支援制度・仕組み ({utilizedSupports.length})
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {utilizedSupports.length > 0 ? (
                utilizedSupports.map((sup, i) => (
                  <div
                    key={i}
                    className="text-xs bg-sky-950/60 border border-sky-400/20 p-2 rounded-lg text-sky-200 font-bold"
                  >
                    🏛️ {sup}
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400">
                  特別な支援制度を利用せず自力と身近な環境で歩みました
                </div>
              )}
              {environmentChangeLogs.slice(1).map((log) => (
                <div key={log.id} className="text-[11px] bg-slate-900/60 p-1.5 rounded text-emerald-300">
                  🌐 {log.age}歳: {log.reason}
                </div>
              ))}
            </div>
          </div>

          {/* 3. 人生の大きな転機 */}
          <div className="glass-card rounded-2xl p-4 text-left">
            <div className="text-xs font-extrabold text-amber-300 uppercase mb-2 flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              人生の大きな転機・選択
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {completedChallenges.map((ch, idx) => (
                <div key={idx} className="text-xs bg-slate-900/65 p-2 rounded-lg">
                  <span className="text-amber-300 font-bold">【{ch.title}】</span>{' '}
                  <span className="text-white font-semibold">{ch.outcome}</span>
                </div>
              ))}
              {choiceItems.slice(-4).map((c) => (
                <div key={c.id} className="text-xs bg-slate-900/60 p-2 rounded-lg">
                  <span className="text-sky-300 font-bold mr-1">{c.age}歳:</span>
                  <span className="text-white">{c.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Full History Toggle */}
        {showFullLog && (
          <div className="mt-4 glass-card rounded-2xl p-4 max-h-64 overflow-y-auto space-y-2 text-left">
            <div className="text-xs font-bold text-sky-300 mb-1">全選択・イベント履歴</div>
            {history.map((h) => (
              <div key={h.id} className="text-xs border-b border-white/10 pb-2 space-y-1">
                <div>
                  <span className="font-bold text-amber-300">{h.age}歳</span> —{' '}
                  <span className="font-bold text-white">{h.title}</span>：{h.detail}
                </div>
                {h.deltas && Object.keys(h.deltas).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(h.deltas).map(([k, v]) => {
                      if (!v) return null;
                      const label = DELTA_LABELS[k as keyof StatDelta] || k;
                      const isPos = v > 0;
                      return (
                        <span
                          key={k}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums ${
                            isPos
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
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
        )}

        {/* Signature Closing Message */}
        <div className="mt-6 text-center">
          <p className="text-xl md:text-2xl font-black text-white tracking-wide">
            「あなたの人生に、同じ空は二度とない。」
          </p>
        </div>

        {savedBanner && (
          <div className="mt-3 flex items-center justify-center gap-2 text-emerald-300 text-sm font-bold">
            <CheckCircle2 className="w-4 h-4" />
            人生の記録証（PNG画像）を保存しました！
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={startNewGameSelect}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 hover:from-sky-300 hover:to-indigo-500 text-white font-black text-base shadow-xl flex items-center gap-2 transition transform hover:scale-105"
          >
            <RotateCcw className="w-5 h-5" />
            もう一度人生を始める
          </button>

          <button
            type="button"
            onClick={() => setShowFullLog(!showFullLog)}
            className="px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center gap-2 border border-white/15 transition"
          >
            <History className="w-4 h-4 text-sky-300" />
            {showFullLog ? '人生の記録を閉じる' : '人生の記録を見る'}
          </button>

          <button
            type="button"
            onClick={handleDownloadResultImage}
            className="px-5 py-3.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-sm flex items-center gap-2 border border-amber-400/40 transition"
          >
            <Download className="w-4 h-4 text-amber-300" />
            結果を画像として保存する
          </button>
        </div>
      </div>
    </div>
  );
};
