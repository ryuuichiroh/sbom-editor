import type { StoreClientConfig, StoreSbomDetail, StoreListResponse } from '../types/store';
import { StoreError } from '../types/store';
import type { UnifiedSBOM } from '../types/unified';
import { getEnvStoreUrl } from './env';

/**
 * sbom-store API クライアント
 *
 * fetch API を使用して sbom-store と通信します。
 */
export class StoreClient {
  private baseUrl: string;

  constructor(config: StoreClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // 末尾のスラッシュを削除
  }

  /**
   * ヘルスチェック - ストアへの接続をテスト
   * @returns 接続成功時は true
   * @throws StoreError 接続失敗時
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }
      return true;
    } catch (error) {
      // StoreError の場合はそのまま再スロー
      if (this.isStoreError(error)) {
        throw error;
      }
      // それ以外はネットワークエラーとして扱う
      throw this.createNetworkError(error);
    }
  }

  /**
   * SBOM 一覧を取得
   * @param params - ページネーション、フィルタリングパラメータ
   * @returns SBOM 一覧レスポンス
   */
  async listSboms(params: {
    page?: number;
    limit?: number;
    tag?: string;
    name?: string;
    approved?: boolean;
  }): Promise<StoreListResponse> {
    const queryParams = new URLSearchParams();
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params.tag) queryParams.append('tag', params.tag);
    if (params.name) queryParams.append('name', params.name);
    if (params.approved !== undefined) queryParams.append('approved', params.approved.toString());

    try {
      const response = await fetch(`${this.baseUrl}/api/sboms?${queryParams}`);
      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }
      return (await response.json()) as StoreListResponse;
    } catch (error) {
      if (this.isStoreError(error)) {
        throw error;
      }
      throw this.createNetworkError(error);
    }
  }

  /**
   * 特定の SBOM を取得
   * @param name - SBOM 名
   * @param version - SBOM バージョン
   * @returns SBOM 詳細
   */
  async getSbom(name: string, version: string): Promise<StoreSbomDetail> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/sboms/${encodeURIComponent(name)}/${encodeURIComponent(version)}`
      );
      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }
      return (await response.json()) as StoreSbomDetail;
    } catch (error) {
      if (this.isStoreError(error)) {
        throw error;
      }
      throw this.createNetworkError(error);
    }
  }

  /**
   * 新しい SBOM を作成
   * @param data - SBOM データ
   * @returns 作成された SBOM 詳細
   */
  async createSbom(data: {
    name: string;
    version: string;
    format: string;
    content: UnifiedSBOM;
    tags?: string[];
  }): Promise<StoreSbomDetail> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sboms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }
      return (await response.json()) as StoreSbomDetail;
    } catch (error) {
      if (this.isStoreError(error)) {
        throw error;
      }
      throw this.createNetworkError(error);
    }
  }

  /**
   * 既存の SBOM を更新
   * @param name - SBOM 名
   * @param version - SBOM バージョン
   * @param data - 更新データ
   * @returns 更新された SBOM 詳細
   */
  async updateSbom(
    name: string,
    version: string,
    data: {
      format?: string;
      content?: UnifiedSBOM;
      tags?: string[];
    }
  ): Promise<StoreSbomDetail> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/sboms/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }
      return (await response.json()) as StoreSbomDetail;
    } catch (error) {
      if (this.isStoreError(error)) {
        throw error;
      }
      throw this.createNetworkError(error);
    }
  }

  /**
   * SBOM を削除
   * @param name - SBOM 名
   * @param version - SBOM バージョン
   */
  async deleteSbom(name: string, version: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/sboms/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
        {
          method: 'DELETE',
        }
      );
      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }
    } catch (error) {
      if (this.isStoreError(error)) {
        throw error;
      }
      throw this.createNetworkError(error);
    }
  }

  /**
   * SBOM の承認ステータスを更新
   * @param name - SBOM 名
   * @param version - SBOM バージョン
   * @param approved - 承認状態
   * @returns 更新された SBOM 詳細
   */
  async updateApprovalStatus(
    name: string,
    version: string,
    approved: boolean
  ): Promise<StoreSbomDetail> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/sboms/${encodeURIComponent(name)}/${encodeURIComponent(version)}/approve`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ approved }),
        }
      );
      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }
      return (await response.json()) as StoreSbomDetail;
    } catch (error) {
      if (this.isStoreError(error)) {
        throw error;
      }
      throw this.createNetworkError(error);
    }
  }

  /**
   * SBOM にタグを追加
   * @param name - SBOM 名
   * @param version - SBOM バージョン
   * @param tags - 追加するタグの配列
   * @returns 更新された SBOM 詳細
   */
  async addTags(name: string, version: string, tags: string[]): Promise<StoreSbomDetail> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/sboms/${encodeURIComponent(name)}/${encodeURIComponent(version)}/tags`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tags }),
        }
      );
      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }
      return (await response.json()) as StoreSbomDetail;
    } catch (error) {
      if (this.isStoreError(error)) {
        throw error;
      }
      throw this.createNetworkError(error);
    }
  }

  /**
   * SBOM からタグを削除
   * @param name - SBOM 名
   * @param version - SBOM バージョン
   * @param tagName - 削除するタグ名
   * @returns 更新された SBOM 詳細
   */
  async removeTag(name: string, version: string, tagName: string): Promise<StoreSbomDetail> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/sboms/${encodeURIComponent(name)}/${encodeURIComponent(version)}/tags/${encodeURIComponent(tagName)}`,
        {
          method: 'DELETE',
        }
      );
      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }
      return (await response.json()) as StoreSbomDetail;
    } catch (error) {
      if (this.isStoreError(error)) {
        throw error;
      }
      throw this.createNetworkError(error);
    }
  }

  /**
   * すべてのタグを取得
   * @returns タグの配列
   */
  async listTags(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }
      const tags = (await response.json()) as { id: string; name: string }[] | string[];
      // APIがオブジェクト配列を返す場合はnameプロパティを抽出
      if (Array.isArray(tags) && tags.length > 0 && typeof tags[0] === 'object') {
        return (tags as { id: string; name: string }[]).map((tag) => tag.name);
      }
      return tags as string[];
    } catch (error) {
      if (this.isStoreError(error)) {
        throw error;
      }
      throw this.createNetworkError(error);
    }
  }

  /**
   * HTTP エラーレスポンスを処理
   * @param response - fetch レスポンス
   * @returns StoreError
   */
  private async handleErrorResponse(response: Response): Promise<StoreError> {
    let errorData: { message?: string; approvedConflict?: boolean } = {};
    try {
      errorData = (await response.json()) as { message?: string; approvedConflict?: boolean };
    } catch {
      errorData = {};
    }

    return new StoreError(
      response.status,
      errorData.message ?? `HTTP ${response.status.toString()}: ${response.statusText}`,
      errorData.approvedConflict ?? false
    );
  }

  /**
   * ネットワークエラーを作成
   * @param error - 元のエラー
   * @returns StoreError
   */
  private createNetworkError(error: unknown): StoreError {
    const message = error instanceof Error ? error.message : 'ネットワークエラーが発生しました';
    return new StoreError(0, message, false);
  }

  /**
   * StoreError かどうかを判定
   * @param error - エラーオブジェクト
   * @returns StoreError の場合 true
   */
  private isStoreError(error: unknown): error is StoreError {
    return error instanceof StoreError;
  }
}

/**
 * localStorage または環境変数から URL を取得してクライアントを作成
 * 優先順位: localStorage > 環境変数 (VITE_SBOM_STORE_URL)
 * @returns StoreClient インスタンス、または URL が設定されていない場合は null
 */
export function createStoreClient(): StoreClient | null {
  // localStorage から取得を試みる
  let baseUrl = localStorage.getItem('sbomStoreUrl');

  // localStorage になければ環境変数から取得
  baseUrl ??= getEnvStoreUrl() ?? null;

  if (!baseUrl) return null;
  return new StoreClient({ baseUrl });
}
