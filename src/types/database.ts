// ============================================================
// Supabase テーブルに対応する TypeScript 型定義
// すべての ID は bigint (string として扱う)
// ============================================================

/** 種類 */
export type Species = 'ニシアフリカトカゲモドキ' | 'ヒョウモントカゲモドキ';

/** 性別 */
export type Sex = 'オス' | 'メス' | '不明';

/** 飼育ステータス */
export type IndividualStatus = '飼育中' | '売約済み' | '譲渡済み' | '死亡';

/** 体調レベル */
export type ConditionLevel = '絶好調' | '普通' | '不調';

/** 脱皮完全度 */
export type ShedCompleteness = '完全' | '不完全';

/** 餌の種類 */
export type FoodType =
  | 'コオロギ'
  | 'デュビア'
  | 'ミルワーム'
  | 'ハニーワーム'
  | 'シルクワーム'
  | 'ピンクマウス'
  | 'ヒヨコ'
  | '卵'
  | '人工フード'
  | 'その他';

// -----------------------------------------------
// テーブル型
// -----------------------------------------------

export interface Individual {
  id: string;
  user_id: string;
  name: string;
  species: Species;
  sex: Sex;
  morph: string;
  genes: GeneEntry[];
  birth_date: string | null;
  acquired_on: string | null;
  source: string;
  image_url: string | null;
  status: IndividualStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Feeding {
  id: string;
  user_id: string;
  individual_id: string;
  fed_at: string;
  food_type: FoodType;
  quantity: number;
  refused: boolean;
  dusting: boolean;
  notes: string;
  created_at: string;
}

export interface Measurement {
  id: string;
  user_id: string;
  individual_id: string;
  measured_on: string;
  weight_g: number | null;
  length_cm: number | null;
  notes: string;
  created_at: string;
}

export interface HealthLog {
  id: string;
  user_id: string;
  individual_id: string;
  logged_on: string;
  condition: ConditionLevel;
  symptoms: string[];
  notes: string;
  created_at: string;
}

export interface Shed {
  id: string;
  user_id: string;
  individual_id: string;
  shed_on: string;
  completeness: ShedCompleteness;
  notes: string;
  created_at: string;
}

export interface Pairing {
  id: string;
  user_id: string;
  male_id: string;
  female_id: string;
  paired_on: string;
  confirmed: boolean;
  notes: string;
  created_at: string;
}

export interface Clutch {
  id: string;
  user_id: string;
  pairing_id: string;
  laid_on: string;
  egg_count: number;
  fertile_count: number;
  hatched_on: string | null;
  hatch_count: number;
  incubation_temp_c: number | null;
  notes: string;
  created_at: string;
}

export interface Memo {
  id: string;
  user_id: string;
  individual_id: string | null;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

/** ケアログ種別 (care_logs テーブル用) */
export type CareLogType =
  | 'poop'
  | 'urine'
  | 'cleaning'
  | 'bathing'
  | 'handling'
  | 'water_change'
  | 'medication'
  | 'hospital'
  | 'mating'
  | 'egg_laying';

export interface CareLog {
  id: string;
  user_id: string;
  individual_id: string;
  care_type: CareLogType;
  value: string | null;
  logged_on: string;
  notes: string;
  created_at: string;
}

// -----------------------------------------------
// 遺伝子関連
// -----------------------------------------------

/** 遺伝形式 */
export type InheritanceMode = '劣性' | '共優性' | '優性';

/** 遺伝子エントリ (genes jsonb 内の要素) */
export interface GeneEntry {
  locus: string;       // 遺伝子座名 (例: "オレオ", "キャラメル")
  mode: InheritanceMode;
  copies: 0 | 1 | 2;  // 0=ノーマル, 1=ヘテロ/het, 2=ホモ/スーパー
}

// -----------------------------------------------
// Supabase Database 型マッピング
// -----------------------------------------------
export interface Database {
  public: {
    Tables: {
      individuals: {
        Row: Individual;
        Insert: Omit<Individual, 'id' | 'created_at' | 'updated_at'> & { id?: never; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Individual, 'id'>>;
        Relationships: [];
      };
      feedings: {
        Row: Feeding;
        Insert: Omit<Feeding, 'id' | 'created_at'> & { id?: never; created_at?: string };
        Update: Partial<Omit<Feeding, 'id'>>;
        Relationships: [];
      };
      measurements: {
        Row: Measurement;
        Insert: Omit<Measurement, 'id' | 'created_at'> & { id?: never; created_at?: string };
        Update: Partial<Omit<Measurement, 'id'>>;
        Relationships: [];
      };
      health_logs: {
        Row: HealthLog;
        Insert: Omit<HealthLog, 'id' | 'created_at'> & { id?: never; created_at?: string };
        Update: Partial<Omit<HealthLog, 'id'>>;
        Relationships: [];
      };
      sheds: {
        Row: Shed;
        Insert: Omit<Shed, 'id' | 'created_at'> & { id?: never; created_at?: string };
        Update: Partial<Omit<Shed, 'id'>>;
        Relationships: [];
      };
      pairings: {
        Row: Pairing;
        Insert: Omit<Pairing, 'id' | 'created_at'> & { id?: never; created_at?: string };
        Update: Partial<Omit<Pairing, 'id'>>;
        Relationships: [];
      };
      clutches: {
        Row: Clutch;
        Insert: Omit<Clutch, 'id' | 'created_at'> & { id?: never; created_at?: string };
        Update: Partial<Omit<Clutch, 'id'>>;
        Relationships: [];
      };
      memos: {
        Row: Memo;
        Insert: Omit<Memo, 'id' | 'created_at' | 'updated_at'> & { id?: never; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Memo, 'id'>>;
        Relationships: [];
      };
      care_logs: {
        Row: CareLog;
        Insert: Omit<CareLog, 'id' | 'created_at'> & { id?: never; created_at?: string };
        Update: Partial<Omit<CareLog, 'id'>>;
        Relationships: [];
      };
    };
    Views: {
      individuals_with_latest: {
        Row: Individual & {
          latest_weight_g: number | null;
          latest_length_cm: number | null;
          latest_measured_on: string | null;
          latest_condition: string | null;
          latest_condition_on: string | null;
          latest_fed_at: string | null;
          latest_food_type: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_dashboard_stats: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      get_monthly_events: {
        Args: { target_year: number; target_month: number };
        Returns: unknown;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
