/**
 * 設定ファイルローダー
 * field-requirements.json と custom-attributes.json のロード・保存・リセットを管理
 */

import type { FieldRequirementsConfig, CustomAttributesConfig } from '../types/config';

const FIELD_REQUIREMENTS_KEY = 'sbom-editor:field-requirements';
const CUSTOM_ATTRIBUTES_KEY = 'sbom-editor:custom-attributes';

const DEFAULT_FIELD_REQUIREMENTS_PATH = '/config/field-requirements.json';
const DEFAULT_CUSTOM_ATTRIBUTES_PATH = '/config/custom-attributes.json';

/**
 * localStorage から必須属性設定を読み込む
 * localStorage にない場合はデフォルト設定をロードする
 */
export async function loadFieldRequirements(): Promise<FieldRequirementsConfig> {
  // localStorage から読み込み
  const stored = localStorage.getItem(FIELD_REQUIREMENTS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as FieldRequirementsConfig;
    } catch (error) {
      console.error('Failed to parse stored field requirements:', error);
      // パースエラーの場合はデフォルトにフォールバック
    }
  }

  // デフォルト設定をロード
  return loadDefaultFieldRequirements();
}

/**
 * デフォルトの必須属性設定をロードする
 */
export async function loadDefaultFieldRequirements(): Promise<FieldRequirementsConfig> {
  const response = await fetch(DEFAULT_FIELD_REQUIREMENTS_PATH);
  if (!response.ok) {
    throw new Error(`Failed to load default field requirements: ${response.statusText}`);
  }
  return (await response.json()) as FieldRequirementsConfig;
}

/**
 * 必須属性設定を localStorage に保存する
 */
export function saveFieldRequirements(config: FieldRequirementsConfig): void {
  localStorage.setItem(FIELD_REQUIREMENTS_KEY, JSON.stringify(config));
}

/**
 * 必須属性設定をデフォルトにリセットする
 */
export async function resetFieldRequirements(): Promise<FieldRequirementsConfig> {
  const defaultConfig = await loadDefaultFieldRequirements();
  saveFieldRequirements(defaultConfig);
  return defaultConfig;
}

/**
 * localStorage からカスタム属性設定を読み込む
 * localStorage にない場合はデフォルト設定をロードする
 */
export async function loadCustomAttributes(): Promise<CustomAttributesConfig> {
  // localStorage から読み込み
  const stored = localStorage.getItem(CUSTOM_ATTRIBUTES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as CustomAttributesConfig;
    } catch (error) {
      console.error('Failed to parse stored custom attributes:', error);
      // パースエラーの場合はデフォルトにフォールバック
    }
  }

  // デフォルト設定をロード
  return loadDefaultCustomAttributes();
}

/**
 * デフォルトのカスタム属性設定をロードする
 */
export async function loadDefaultCustomAttributes(): Promise<CustomAttributesConfig> {
  const response = await fetch(DEFAULT_CUSTOM_ATTRIBUTES_PATH);
  if (!response.ok) {
    throw new Error(`Failed to load default custom attributes: ${response.statusText}`);
  }
  return (await response.json()) as CustomAttributesConfig;
}

/**
 * カスタム属性設定を localStorage に保存する
 */
export function saveCustomAttributes(config: CustomAttributesConfig): void {
  localStorage.setItem(CUSTOM_ATTRIBUTES_KEY, JSON.stringify(config));
}

/**
 * カスタム属性設定をデフォルトにリセットする
 */
export async function resetCustomAttributes(): Promise<CustomAttributesConfig> {
  const defaultConfig = await loadDefaultCustomAttributes();
  saveCustomAttributes(defaultConfig);
  return defaultConfig;
}

/**
 * ユーザーがアップロードした設定ファイルを読み込む
 */
export async function loadConfigFromFile<T>(file: File): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const config = JSON.parse(content) as T;
        resolve(config);
      } catch {
        reject(new Error('設定ファイルのパースに失敗しました'));
      }
    };
    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました'));
    };
    reader.readAsText(file);
  });
}

/**
 * 必須属性設定のバリデーション
 */
export function validateFieldRequirements(config: unknown): config is FieldRequirementsConfig {
  if (typeof config !== 'object' || config === null) {
    return false;
  }

  const c = config as Record<string, unknown>;

  // version フィールドの存在チェック
  if (typeof c.version !== 'string') {
    return false;
  }

  // spdx と cyclonedx セクションの存在チェック
  if (
    typeof c.spdx !== 'object' ||
    c.spdx === null ||
    typeof c.cyclonedx !== 'object' ||
    c.cyclonedx === null
  ) {
    return false;
  }

  return true;
}

/**
 * カスタム属性設定のバリデーション
 */
export function validateCustomAttributes(config: unknown): config is CustomAttributesConfig {
  if (typeof config !== 'object' || config === null) {
    return false;
  }

  const c = config as Record<string, unknown>;

  // version フィールドの存在チェック
  if (typeof c.version !== 'string') {
    return false;
  }

  // attributes フィールドの存在チェック
  if (!Array.isArray(c.attributes)) {
    return false;
  }

  // 各属性の基本構造チェック
  return c.attributes.every((attr) => {
    if (typeof attr !== 'object' || attr === null) {
      return false;
    }
    const a = attr as Record<string, unknown>;
    return typeof a.name === 'string' && (a.valueType === 'string' || a.valueType === 'string[]');
  });
}
