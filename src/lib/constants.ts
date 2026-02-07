import type { FoodType, ConditionLevel, Species, Sex, IndividualStatus } from '@/types/database';

/** 餌リスト（アイコングリッド用） */
export const FOOD_OPTIONS: { type: FoodType; icon: string; label: string }[] = [
  { type: 'コオロギ',     icon: 'Bug',          label: 'コオロギ' },
  { type: 'デュビア',     icon: 'Bug',          label: 'デュビア' },
  { type: 'ミルワーム',   icon: 'Worm',         label: 'ミルワーム' },
  { type: 'ハニーワーム', icon: 'Worm',         label: 'ハニーワーム' },
  { type: 'シルクワーム', icon: 'Worm',         label: 'シルクワーム' },
  { type: 'ピンクマウス', icon: 'Mouse',        label: 'ピンクマウス' },
  { type: '人工フード',   icon: 'FlaskConical', label: '人工フード' },
  { type: 'その他',       icon: 'Plus',         label: 'その他' },
];

/** 体調レベル */
export const CONDITION_OPTIONS: { level: ConditionLevel; color: string; icon: string; label: string }[] = [
  { level: '絶好調', color: '#059669', icon: 'HeartPulse', label: '絶好調' },
  { level: '普通',   color: '#2563eb', icon: 'Heart',      label: '普通' },
  { level: '不調',   color: '#e11d48', icon: 'HeartCrack', label: '不調' },
];

/** 種類 */
export const SPECIES_OPTIONS: { value: Species; label: string; shortLabel: string }[] = [
  { value: 'ニシアフリカトカゲモドキ', label: 'ニシアフリカトカゲモドキ', shortLabel: 'ニシアフ' },
  { value: 'ヒョウモントカゲモドキ',   label: 'ヒョウモントカゲモドキ',   shortLabel: 'レオパ' },
];

/** 性別 */
export const SEX_OPTIONS: { value: Sex; icon: string; label: string }[] = [
  { value: 'オス', icon: 'CircleDot',    label: 'オス' },
  { value: 'メス', icon: 'CircleDashed', label: 'メス' },
  { value: '不明', icon: 'HelpCircle',   label: '不明' },
];

/** ステータス */
export const STATUS_OPTIONS: { value: IndividualStatus; color: string; label: string }[] = [
  { value: '飼育中',   color: '#059669', label: '飼育中' },
  { value: '売約済み', color: '#d97706', label: '売約済み' },
  { value: '譲渡済み', color: '#6b7280', label: '譲渡済み' },
  { value: '死亡',     color: '#e11d48', label: '死亡' },
];

/** 症状タグの選択肢 */
export const SYMPTOM_TAGS = [
  '食欲不振', '下痢', '便秘', '脱皮不全', '目の異常',
  '皮膚の異常', '体重減少', '元気がない', '嘔吐', 'その他',
] as const;
