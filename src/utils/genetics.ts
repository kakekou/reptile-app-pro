// ============================================================
// モルフ遺伝計算エンジン
// ニシアフリカトカゲモドキ / ヒョウモントカゲモドキ 対応
// ============================================================

import type { GeneEntry, InheritanceMode, Species } from '@/types/database';

// -----------------------------------------------
// 遺伝子座の定義
// -----------------------------------------------

export interface LocusDefinition {
  name: string;
  mode: InheritanceMode;
  species: Species[];
  /** ホモ接合時の表現名 */
  homoName: string;
  /** ヘテロ接合時の表現名（共優性のみ） */
  hetName?: string;
  /** スーパー体の表現名（共優性のみ） */
  superName?: string;
}

/**
 * 主要なニシアフ・レオパの遺伝子座カタログ
 * ここに追加すれば自動的に計算対象になる
 */
export const LOCUS_CATALOG: LocusDefinition[] = [
  // ── ニシアフリカトカゲモドキ（劣性） ──
  { name: 'オレオ',       mode: '劣性', species: ['ニシアフリカトカゲモドキ'], homoName: 'オレオ' },
  { name: 'パターンレス', mode: '劣性', species: ['ニシアフリカトカゲモドキ'], homoName: 'パターンレス' },
  { name: 'キャラメル',   mode: '劣性', species: ['ニシアフリカトカゲモドキ'], homoName: 'キャラメルアルビノ' },
  { name: 'アメラニ',     mode: '劣性', species: ['ニシアフリカトカゲモドキ'], homoName: 'アメラニスティック' },

  // ── ニシアフリカトカゲモドキ（共優性） ──
  { name: 'ズールー',     mode: '共優性', species: ['ニシアフリカトカゲモドキ'], homoName: 'スーパーズールー', hetName: 'ズールー', superName: 'スーパーズールー' },
  { name: 'ホワイトアウト', mode: '共優性', species: ['ニシアフリカトカゲモドキ'], homoName: 'スーパーホワイトアウト', hetName: 'ホワイトアウト', superName: 'スーパーホワイトアウト' },
  { name: 'スティンガー', mode: '共優性', species: ['ニシアフリカトカゲモドキ'], homoName: 'スーパースティンガー', hetName: 'スティンガー', superName: 'スーパースティンガー' },

  // ── ヒョウモントカゲモドキ（劣性） ──
  { name: 'トレンパーアルビノ', mode: '劣性', species: ['ヒョウモントカゲモドキ'], homoName: 'トレンパーアルビノ' },
  { name: 'ベルアルビノ',       mode: '劣性', species: ['ヒョウモントカゲモドキ'], homoName: 'ベルアルビノ' },
  { name: 'レインウォーター',   mode: '劣性', species: ['ヒョウモントカゲモドキ'], homoName: 'レインウォーターアルビノ' },
  { name: 'エクリプス',         mode: '劣性', species: ['ヒョウモントカゲモドキ'], homoName: 'エクリプス' },
  { name: 'ブリザード',         mode: '劣性', species: ['ヒョウモントカゲモドキ'], homoName: 'ブリザード' },
  { name: 'マーフィーパターンレス', mode: '劣性', species: ['ヒョウモントカゲモドキ'], homoName: 'マーフィーパターンレス' },

  // ── ヒョウモントカゲモドキ（共優性） ──
  { name: 'マックスノー', mode: '共優性', species: ['ヒョウモントカゲモドキ'], homoName: 'スーパーマックスノー', hetName: 'マックスノー', superName: 'スーパーマックスノー' },
  { name: 'エニグマ',     mode: '優性',   species: ['ヒョウモントカゲモドキ'], homoName: 'エニグマ' },
];

// -----------------------------------------------
// 種別フィルタ
// -----------------------------------------------
export function getLocusesForSpecies(species: Species): LocusDefinition[] {
  return LOCUS_CATALOG.filter((l) => l.species.includes(species));
}

// -----------------------------------------------
// パネットスクエア計算
// -----------------------------------------------

/** 1つの遺伝子座における子の確率分布 */
export interface OffspringRatio {
  locus: string;
  mode: InheritanceMode;
  /** copies => 確率 (0.0 ~ 1.0) */
  distribution: { copies: 0 | 1 | 2; probability: number; label: string }[];
}

/**
 * 単一遺伝子座のクロス計算
 * @param fatherCopies 父のコピー数 (0, 1, 2)
 * @param motherCopies 母のコピー数 (0, 1, 2)
 * @param locus 遺伝子座の定義
 */
export function crossSingleLocus(
  fatherCopies: 0 | 1 | 2,
  motherCopies: 0 | 1 | 2,
  locus: LocusDefinition
): OffspringRatio {
  // 各親の配偶子 (0 or 1) の確率
  const fatherGametes = gameteProbabilities(fatherCopies);
  const motherGametes = gameteProbabilities(motherCopies);

  // パネットスクエア
  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
  for (const [fAllele, fProb] of fatherGametes) {
    for (const [mAllele, mProb] of motherGametes) {
      const childCopies = (fAllele + mAllele) as 0 | 1 | 2;
      counts[childCopies] += fProb * mProb;
    }
  }

  const distribution = ([0, 1, 2] as const).map((copies) => ({
    copies,
    probability: counts[copies],
    label: labelForCopies(copies, locus),
  }));

  return {
    locus: locus.name,
    mode: locus.mode,
    distribution: distribution.filter((d) => d.probability > 0),
  };
}

/**
 * 複数遺伝子座のクロス計算（独立分配を仮定）
 * 全組み合わせの確率を返す
 */
export function crossAllLoci(
  fatherGenes: GeneEntry[],
  motherGenes: GeneEntry[],
  species: Species
): CrossResult[] {
  const locuses = getLocusesForSpecies(species);

  // 各遺伝子座ごとの結果
  const perLocus: OffspringRatio[] = locuses.map((locus) => {
    const fc = findCopies(fatherGenes, locus.name);
    const mc = findCopies(motherGenes, locus.name);
    return crossSingleLocus(fc, mc, locus);
  });

  // 全組み合わせを展開
  return expandCombinations(perLocus);
}

/** クロス結果の1パターン */
export interface CrossResult {
  /** 表現型ラベル (例: "オレオ het.キャラメル") */
  phenotype: string;
  /** 遺伝子型の詳細 */
  genotype: { locus: string; copies: 0 | 1 | 2; label: string }[];
  /** 出現確率 (0.0 ~ 1.0) */
  probability: number;
}

// -----------------------------------------------
// 内部ヘルパー
// -----------------------------------------------

function gameteProbabilities(copies: 0 | 1 | 2): [number, number][] {
  switch (copies) {
    case 0: return [[0, 1.0]];
    case 1: return [[0, 0.5], [1, 0.5]];
    case 2: return [[1, 1.0]];
  }
}

function findCopies(genes: GeneEntry[], locusName: string): 0 | 1 | 2 {
  const found = genes.find((g) => g.locus === locusName);
  return found ? found.copies : 0;
}

function labelForCopies(copies: 0 | 1 | 2, locus: LocusDefinition): string {
  switch (locus.mode) {
    case '劣性':
      if (copies === 2) return locus.homoName;
      if (copies === 1) return `het.${locus.name}`;
      return 'ノーマル';

    case '共優性':
      if (copies === 2) return locus.superName ?? locus.homoName;
      if (copies === 1) return locus.hetName ?? locus.name;
      return 'ノーマル';

    case '優性':
      if (copies >= 1) return locus.homoName;
      return 'ノーマル';
  }
}

function expandCombinations(perLocus: OffspringRatio[]): CrossResult[] {
  if (perLocus.length === 0) return [{ phenotype: 'ノーマル', genotype: [], probability: 1 }];

  let results: CrossResult[] = [{ phenotype: '', genotype: [], probability: 1 }];

  for (const locusResult of perLocus) {
    const next: CrossResult[] = [];
    for (const existing of results) {
      for (const dist of locusResult.distribution) {
        next.push({
          phenotype: '',  // 後で組み立て
          genotype: [
            ...existing.genotype,
            { locus: locusResult.locus, copies: dist.copies, label: dist.label },
          ],
          probability: existing.probability * dist.probability,
        });
      }
    }
    results = next;
  }

  // 表現型ラベルを組み立て
  for (const r of results) {
    const visibleTraits = r.genotype.filter((g) => g.label !== 'ノーマル');
    const homoTraits = visibleTraits.filter((g) => !g.label.startsWith('het.'));
    const hetTraits = visibleTraits.filter((g) => g.label.startsWith('het.'));

    const parts: string[] = [];
    if (homoTraits.length > 0) {
      parts.push(homoTraits.map((g) => g.label).join(' '));
    }
    if (hetTraits.length > 0) {
      parts.push(hetTraits.map((g) => g.label).join(' '));
    }

    r.phenotype = parts.length > 0 ? parts.join(' ') : 'ノーマル';
  }

  // 同じ表現型をマージ
  const merged = new Map<string, CrossResult>();
  for (const r of results) {
    const key = r.genotype.map((g) => `${g.locus}:${g.copies}`).join('|');
    if (merged.has(key)) {
      merged.get(key)!.probability += r.probability;
    } else {
      merged.set(key, { ...r });
    }
  }

  return Array.from(merged.values())
    .filter((r) => r.probability > 0.0001)
    .sort((a, b) => b.probability - a.probability);
}

// -----------------------------------------------
// ユーティリティ：確率をパーセント文字列に変換
// -----------------------------------------------
export function probabilityToPercent(p: number): string {
  const pct = p * 100;
  if (pct === Math.floor(pct)) return `${pct}%`;
  return `${pct.toFixed(1)}%`;
}

// -----------------------------------------------
// ユーティリティ：分数表記
// -----------------------------------------------
export function probabilityToFraction(p: number): string {
  const fractions: [number, string][] = [
    [1, '1/1'],
    [0.75, '3/4'],
    [0.5, '1/2'],
    [0.25, '1/4'],
    [0.125, '1/8'],
    [0.0625, '1/16'],
    [0.03125, '1/32'],
  ];
  for (const [val, label] of fractions) {
    if (Math.abs(p - val) < 0.001) return label;
  }
  return probabilityToPercent(p);
}
