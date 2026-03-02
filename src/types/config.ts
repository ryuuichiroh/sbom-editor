/**
 * 設定ファイル型定義
 * field-requirements.json と custom-attributes.json の型定義
 */

import type { ComponentType } from './unified';

/**
 * 必須属性設定ファイル（field-requirements.json）
 */
export interface FieldRequirementsConfig {
  version: string;
  description?: string;
  spdx: {
    document: Record<string, FieldRequirement>;
    package: Record<string, FieldRequirement>;
    file: Record<string, FieldRequirement>;
  };
  cyclonedx: {
    metadata: Record<string, FieldRequirement>;
    component: Record<string, FieldRequirement>;
  };
}

export interface FieldRequirement {
  /** 仕様上の必須区分（変更不可） */
  specRequired: boolean;
  /** ポリシー上の必須区分（specRequired: true の場合は false に変更不可） */
  required: boolean;
  /** UI 表示ラベル（省略時はフィールド名） */
  label?: string;
  /** バリデーションエラーメッセージ */
  errorMessage?: string;
  /** UI ヒントテキスト */
  hint?: string;
}

/**
 * カスタム属性設定ファイル（custom-attributes.json）
 */
export interface CustomAttributesConfig {
  version: string;
  description?: string;
  attributes: CustomAttributeDefinition[];
}

export interface CustomAttributeDefinition {
  /** 属性名（エクスポート時のキー） */
  name: string;
  /** UI 表示ラベル（省略時は name を使用） */
  label?: string;
  /** ツールチップに表示する説明 */
  description?: string;
  /** 値のタイプ */
  valueType: 'string' | 'string[]';
  /** string[] の場合の区切り文字（SPDX エクスポート時に使用、デフォルト: ","） */
  delimiter?: string;
  /** 値の選択肢（定義した場合は UI でプルダウン / オートコンプリート表示） */
  options?: string[];
  /** 適用するコンポーネントタイプ（省略時は全タイプに適用） */
  applicableTo?: ComponentType[];
  /** デフォルト値 */
  defaultValue?: string | string[];
  /** 必須フラグ */
  required?: boolean;
  /** バリデーションエラーメッセージ（省略時はデフォルトメッセージ） */
  errorMessage?: string;
}
