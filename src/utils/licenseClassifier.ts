import type { LicenseCategory } from '../types/unified';

/**
 * SPDX License List に基づくライセンス分類マップ
 * https://spdx.org/licenses/
 */
const LICENSE_CATEGORY_MAP: Record<string, LicenseCategory> = {
  // Copyleft licenses
  'GPL-1.0-only': 'copyleft',
  'GPL-1.0-or-later': 'copyleft',
  'GPL-2.0-only': 'copyleft',
  'GPL-2.0-or-later': 'copyleft',
  'GPL-3.0-only': 'copyleft',
  'GPL-3.0-or-later': 'copyleft',
  'AGPL-1.0-only': 'copyleft',
  'AGPL-1.0-or-later': 'copyleft',
  'AGPL-3.0-only': 'copyleft',
  'AGPL-3.0-or-later': 'copyleft',
  'EUPL-1.0': 'copyleft',
  'EUPL-1.1': 'copyleft',
  'OSL-1.0': 'copyleft',
  'OSL-2.0': 'copyleft',
  'OSL-3.0': 'copyleft',

  // Weak copyleft licenses
  'LGPL-2.0-only': 'weak-copyleft',
  'LGPL-2.0-or-later': 'weak-copyleft',
  'LGPL-2.1-only': 'weak-copyleft',
  'LGPL-2.1-or-later': 'weak-copyleft',
  'LGPL-3.0-only': 'weak-copyleft',
  'LGPL-3.0-or-later': 'weak-copyleft',
  'MPL-1.0': 'weak-copyleft',
  'MPL-1.1': 'weak-copyleft',
  'MPL-2.0': 'weak-copyleft',
  'EUPL-1.2': 'weak-copyleft',
  'CDDL-1.0': 'weak-copyleft',
  'CDDL-1.1': 'weak-copyleft',
  'EPL-1.0': 'weak-copyleft',
  'EPL-2.0': 'weak-copyleft',
  'CPL-1.0': 'weak-copyleft',
  'IPL-1.0': 'weak-copyleft',

  // Permissive licenses
  MIT: 'permissive',
  'MIT-0': 'permissive',
  'Apache-1.0': 'permissive',
  'Apache-1.1': 'permissive',
  'Apache-2.0': 'permissive',
  'BSD-2-Clause': 'permissive',
  'BSD-3-Clause': 'permissive',
  'BSD-4-Clause': 'permissive',
  '0BSD': 'permissive',
  ISC: 'permissive',
  Unlicense: 'permissive',
  Zlib: 'permissive',
  'PSF-2.0': 'permissive',
  'Python-2.0': 'permissive',
  'Artistic-2.0': 'permissive',
  'BSL-1.0': 'permissive',
  'CC0-1.0': 'permissive',
  'CC-BY-3.0': 'permissive',
  'CC-BY-4.0': 'permissive',
  WTFPL: 'permissive',

  // Other licenses
  'Artistic-1.0': 'other',
  'Artistic-1.0-Perl': 'other',
  'Artistic-1.0-cl8': 'other',
};

/**
 * カテゴリの制約強度（数値が大きいほど制約が強い）
 */
const CATEGORY_STRENGTH: Record<LicenseCategory, number> = {
  copyleft: 4,
  'weak-copyleft': 3,
  permissive: 2,
  proprietary: 1,
  other: 1,
  unknown: 0,
};

/**
 * ライセンス ID からカテゴリを分類する
 * @param licenseId SPDX License ID
 * @returns ライセンスカテゴリ
 */
export function classifyLicense(licenseId: string): LicenseCategory {
  if (!licenseId || licenseId === 'NOASSERTION' || licenseId === 'NONE') {
    return 'unknown';
  }

  // LicenseRef- プレフィックスは proprietary として扱う
  if (licenseId.startsWith('LicenseRef-')) {
    return 'proprietary';
  }

  // マップから検索
  const category = LICENSE_CATEGORY_MAP[licenseId];
  if (category) {
    return category;
  }

  // 未知のライセンスは unknown
  return 'unknown';
}

/**
 * SPDX License Expression を評価し、最も制約の強いカテゴリを返す
 * @param expression SPDX License Expression (例: "MIT OR Apache-2.0", "GPL-2.0-only AND MIT")
 * @returns 最も制約の強いライセンスカテゴリ
 */
export function evaluateLicenseExpression(expression: string): LicenseCategory {
  if (!expression || expression === 'NOASSERTION' || expression === 'NONE') {
    return 'unknown';
  }

  // 式を分解してライセンス ID を抽出（AND, OR, WITH などの演算子で分割）
  const licenseIds = expression
    .split(/\s+(?:AND|OR|WITH)\s+/i)
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  if (licenseIds.length === 0) {
    return 'unknown';
  }

  // 各ライセンスを分類し、最も制約の強いカテゴリを採用
  let strongestCategory: LicenseCategory = 'unknown';
  let maxStrength = 0;

  for (const licenseId of licenseIds) {
    const category = classifyLicense(licenseId);
    const strength = CATEGORY_STRENGTH[category];

    if (strength > maxStrength) {
      maxStrength = strength;
      strongestCategory = category;
    }
  }

  return strongestCategory;
}

/**
 * カテゴリの表示名を取得
 * @param category ライセンスカテゴリ
 * @returns 表示名
 */
export function getCategoryDisplayName(category: LicenseCategory): string {
  const displayNames: Record<LicenseCategory, string> = {
    copyleft: 'Copyleft',
    'weak-copyleft': 'Weak Copyleft',
    permissive: 'Permissive',
    proprietary: 'Proprietary',
    other: 'Other',
    unknown: 'Unknown',
  };

  return displayNames[category];
}

/**
 * カテゴリのソート順を取得（制約が強い順）
 * @param category ライセンスカテゴリ
 * @returns ソート順（数値が小さいほど上位）
 */
export function getCategorySortOrder(category: LicenseCategory): number {
  return -CATEGORY_STRENGTH[category];
}
