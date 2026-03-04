/**
 * sbom-store API クライアント関連の型定義
 */

import type { UnifiedSBOM } from './unified';

/**
 * API クライアントの設定
 */
export interface StoreClientConfig {
  baseUrl: string;
}

/**
 * SBOM 一覧で使用する型（サマリー情報）
 */
export interface StoreSbomSummary {
  name: string;
  version: string;
  format: string;
  approved: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * SBOM 詳細で使用する型（サマリー + コンテンツ）
 */
export interface StoreSbomDetail extends StoreSbomSummary {
  content: UnifiedSBOM;
}

/**
 * 一覧取得レスポンスの型
 */
export interface StoreListResponse {
  data: StoreSbomSummary[];
  total: number;
  page: number;
  limit: number;
}

/**
 * ストアAPIエラークラス
 */
export class StoreError extends Error {
  public readonly statusCode: number;
  public readonly approvedConflict: boolean;

  constructor(statusCode: number, message: string, approvedConflict = false) {
    super(message);
    this.name = 'StoreError';
    this.statusCode = statusCode;
    this.approvedConflict = approvedConflict;
  }
}
