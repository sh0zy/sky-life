# SKY LIFE — 国別公式統計データの出典・変換方法・限界

**最終更新日**: 2026-11-15（データ取得日: `2026-11-15T13:56:41Z`）

## 1. 基本方針（公式統計とゲーム内換算値の厳格な分離）

SKY LIFE では、国別の社会環境データについて以下の原則を採用しています。

1. **公式統計データ（A）の原数値保持**:
   World Bank API v2 および WHO Global Health Observatory (GHO) API から取得した公式数値・単位・対象年・公表機関・出典URL・実測/推計区分を `src/data/officialCountryStatistics.json` にそのまま保存し、ゲーム内から編集不可（読み取り専用）としています。
2. **欠損値を捏造しない**:
   公式統計にデータが存在しない場合（例：日本・アメリカ・フランスの World Bank ASPIRE 社会保護カバー率、日本・ブラジルの前期中等教育修了率）は `missing: true`（`value: null`）として記録し、UI上でも「データなし」と表示します。AIの推測や他国平均で埋めることはしません。
3. **ゲーム内換算値（B）の明示的分離**:
   ゲーム内の難易度やイベント傾向を調整する 0〜100 のパラメータは、公式統計から独自の正規化式で算出した **「ゲーム内換算値」** であり、公式統計そのものではありません。

---

## 2. 使用した公式統計機関とライセンス

| 機関名 | 対象データ | ライセンス・利用規約 | URL |
|---|---|---|---|
| World Bank Open Data | 教育・医療費負担・労働・GDP・社会保護・物価・ジニ指数 | CC BY 4.0 | https://data.worldbank.org/summary-terms-of-use |
| WHO Global Health Observatory (GHO) | UHCサービス・カバレッジ指数（SDG 3.8.1） | CC BY-NC-SA 3.0 IGO / WHO Terms | https://www.who.int/about/policies/publishing/data-policy |
| UNESCO Institute for Statistics (UIS) | 中等教育・高等教育就学率、修了率、公的教育支出（World Bank経由） | CC BY-SA 3.0 IGO | https://uis.unesco.org/ |
| ILOSTAT | 失業率・15歳以上就業率（ILOモデル推計、World Bank経由） | ILO Open Data Terms | https://ilostat.ilo.org/ |

---

## 3. 取得した公式指標一覧と対象年の方針

- **共通年優先ルール**: 対象6か国（`JPN`, `USA`, `BRA`, `IND`, `KEN`, `FRA`）すべてでデータが存在する最新年を優先して採用（`yearPolicy: "common_year"`）。
- **国別最新年ルール**: 6か国共通年が存在しない指標については、各国で利用可能な最新年を採用し、比較年が異なることを明記（`yearPolicy: "latest_available_per_country"`）。

| ゲーム内領域 | 公式指標名 | 指標コード | 単位 | 年度方針 | 参考/代替指標の区別 |
|---|---|---|---|---|---|
| 教育アクセス | 中等教育総就学率 | `SE.SEC.ENRR` | `% (gross)` | 共通年 (2022) | 直接指標 |
| 教育アクセス（修了） | 前期中等教育修了率 | `SE.SEC.CMPT.LO.ZS` | `% of relevant age group` | 国別最新年 | 直接指標（JPN/BRA欠損） |
| 教育費負担（参考） | 政府の教育支出（対GDP比） | `SE.XPD.TOTL.GD.ZS` | `% of GDP` | 共通年 (2021) | **参考指標**（家計負担の直接値ではない） |
| 医療アクセス | UHCサービス・カバレッジ指数 | `UHC_INDEX_REPORTED` | `Index (0-100)` | 共通年 (2023) | 直接指標（WHO GHO） |
| 医療費負担 | 経常医療費に占める自己負担支出割合 | `SH.XPD.OOPC.CH.ZS` | `% of current health expenditure` | 共通年 (2023) | 直接指標 |
| 雇用機会 | 失業率（ILOモデル推計） | `SL.UEM.TOTL.ZS` | `% of total labor force` | 共通年 (2024) | 直接指標（モデル推計） |
| 雇用機会（就業率） | 15歳以上就業率（ILOモデル推計） | `SL.EMP.TOTL.SP.ZS` | `% of population ages 15+` | 共通年 (2024) | 直接指標（モデル推計） |
| 所得・生活水準（参考） | 一人当たりGDP（PPP・2021年実質国際ドル） | `NY.GDP.PCAP.PP.KD` | `constant 2021 international $` | 共通年 (2024) | **参考指標**（家計可処分所得ではない） |
| 社会保障 | 社会保護・労働プログラムの人口カバー率 | `per_allsp.cov_pop_tot` | `% of population` | 国別最新年 | 直接指標（JPN/USA/FRA欠損） |
| 経済的不安定さ（参考） | 消費者物価上昇率（年率） | `FP.CPI.TOTL.ZG` | `% (annual)` | 共通年 (2024) | **参考指標** |
| 地域間・所得格差（参考） | ジニ指数（所得不平等度） | `SI.POV.GINI` | `Index (0-100)` | 国別最新年 | **参考指標**（都市農村格差そのものではない） |
| 社会的移動機会（参考） | 高等教育総就学率 | `SE.TER.ENRR` | `% (gross)` | 共通年 (2019) | **参考指標**（世代間移動の統一指標なし） |

---

## 4. 公式値からゲーム内換算値への変換式（`src/utils/statisticsConverter.ts`）

すべてのゲーム内換算値は、極端な難易度を避けるため上下限をクリップした上で算出しています。

1. **教育アクセス (`educationAccess`)**:
   - `SE.SEC.ENRR`（65〜105% → 45〜90）を主軸とし、`SE.SEC.CMPT.LO.ZS`（70〜102% → 50〜90）が利用可能な場合は `0.7 : 0.3` で加重平均。
2. **教育費負担 (`educationCostBurden`)【暫定換算】**:
   - 家計の直接教育費負担に関する6か国統一指標がWorld Bank APIにないため、`SE.XPD.TOTL.GD.ZS`（2.5〜6.5% の逆方向 → 25〜70）を65%、`SE.TER.ENRR`（10〜90% → 42〜68）を35%として暫定算出。
3. **医療アクセス (`medicalAccess`)**:
   - WHO `UHC_INDEX_REPORTED`（45〜92 → 42〜92）を線形正規化。
4. **医療費負担 (`medicalCostBurden`)**:
   - `SH.XPD.OOPC.CH.ZS`（5〜50% → 20〜78）を線形正規化。
5. **雇用機会 (`employmentOpportunity`)**:
   - `SL.UEM.TOTL.ZS`（2〜10% の逆方向 → 48〜86）を65%、`SL.EMP.TOTL.SP.ZS`（48〜66% → 52〜82）を35%で加重平均。
6. **所得・経済水準 (`incomeLivingBalance`)【参考】**:
   - `log10(NY.GDP.PCAP.PP.KD)`（3.65〜4.92 → 40〜86）を線形正規化。
7. **社会保障 (`socialSecurity`)**:
   - `per_allsp.cov_pop_tot` が取得可能な国（BRA/IND/KEN）はカバー率（15〜85% → 36〜78, 60%）＋ UHC（40%）。
   - 未収録国（JPN/USA/FRA）は **暫定換算** として WHO UHC（50%）＋ 医療自己負担の低さ（50%）で算出。
8. **経済的不安定さ (`economicInstability`)**:
   - `FP.CPI.TOTL.ZG`（1.5〜7.0% → 28〜72, 55%）＋ `SL.UEM.TOTL.ZS`（2〜10% → 26〜68, 45%）。
9. **格差・環境差 (`regionalDisparity`)【参考】**:
   - `SI.POV.GINI`（22〜54 → 34〜78）を線形正規化。
10. **社会的移動機会 (`socialMobility`)【参考・暫定】**:
    - `SE.TER.ENRR`（50%）＋ `educationAccess`（30%）＋ `(100 - regionalDisparity)`（20%）。

---

## 5. データ再取得方法

```bash
node --experimental-strip-types scripts/updateCountryStatistics.ts
```

上記スクリプトを実行すると、World Bank API v2 と WHO GHO API から最新データを取得し、`src/data/officialCountryStatistics.json` を更新します。
