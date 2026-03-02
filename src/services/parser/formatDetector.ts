/**
 * SBOM フォーマット自動検出ユーティリティ
 *
 * bomFormat フィールド（CycloneDX）または SPDXVersion フィールド（SPDX）の存在で判定する。
 */

export type SBOMFormat = 'spdx' | 'cyclonedx' | 'unknown';

export interface FormatDetectionResult {
  format: SBOMFormat;
  specVersion?: string;
}

/**
 * SBOM ファイルの内容からフォーマットを自動検出する
 *
 * @param content - パース済みの JSON/YAML オブジェクト、または文字列
 * @returns フォーマット検出結果
 */
export const detectFormat = (content: unknown): FormatDetectionResult => {
  if (content === null || content === undefined) {
    return { format: 'unknown' };
  }

  // 文字列の場合は JSON としてパースを試みる
  let data: unknown = content;
  if (typeof content === 'string') {
    try {
      data = JSON.parse(content);
    } catch {
      // JSON パースに失敗した場合は文字列として処理
      return detectFromString(content);
    }
  }

  // オブジェクトとして処理
  if (typeof data === 'object' && data !== null) {
    return detectFromObject(data as Record<string, unknown>);
  }

  return { format: 'unknown' };
};

/**
 * オブジェクトからフォーマットを検出
 */
const detectFromObject = (data: Record<string, unknown>): FormatDetectionResult => {
  // CycloneDX の検出: bomFormat フィールドの存在
  if ('bomFormat' in data && data.bomFormat === 'CycloneDX') {
    const specVersion = typeof data.specVersion === 'string' ? data.specVersion : undefined;
    return {
      format: 'cyclonedx',
      specVersion,
    };
  }

  // SPDX の検出: SPDXVersion フィールドの存在
  if ('SPDXVersion' in data || 'spdxVersion' in data) {
    const specVersion = (data.SPDXVersion ?? data.spdxVersion) as string | undefined;
    return {
      format: 'spdx',
      specVersion,
    };
  }

  return { format: 'unknown' };
};

/**
 * 文字列（tag-value 形式など）からフォーマットを検出
 */
const detectFromString = (content: string): FormatDetectionResult => {
  // SPDX tag-value 形式の検出
  if (content.includes('SPDXVersion:') || content.includes('SPDXID:')) {
    const versionMatch = /SPDXVersion:\s*(.+)/.exec(content);
    const specVersion = versionMatch ? versionMatch[1].trim() : undefined;
    return {
      format: 'spdx',
      specVersion,
    };
  }

  return { format: 'unknown' };
};
