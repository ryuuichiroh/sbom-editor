/**
 * エラーメッセージの統一管理
 * すべてのストア関連エラーメッセージを日本語で提供
 */

import { StoreError } from '../types/store';

/**
 * エラーメッセージのカテゴリ
 */
export const ERROR_MESSAGES = {
  // 接続エラー
  CONNECTION: {
    NOT_CONFIGURED: 'ストアが設定されていません',
    FAILED: 'ストアに接続できませんでした',
    NETWORK_ERROR: 'ネットワークエラーが発生しました',
    TEST_REQUIRED: 'ストア URL を入力してください',
  },

  // SBOM 一覧
  LIST: {
    LOAD_FAILED: 'SBOM 一覧の取得に失敗しました',
  },

  // SBOM 読み込み
  LOAD: {
    FAILED: 'SBOM の読み込みに失敗しました',
    NOT_FOUND: 'SBOM が見つかりませんでした',
  },

  // SBOM 保存
  SAVE: {
    FAILED: '保存に失敗しました',
    VALIDATION_ERROR: '入力内容を確認してください',
    APPROVED_CONFLICT:
      'この SBOM は承認済みのため更新できません。別の名前またはバージョンで保存してください。',
    OVERWRITE_FAILED: '上書き保存に失敗しました',
  },

  // サーバーエラー
  SERVER: {
    INTERNAL_ERROR: 'サーバーでエラーが発生しました',
    CORS_ERROR: 'CORS 設定を確認してください',
  },

  // 汎用エラー
  GENERIC: {
    UNKNOWN: '不明なエラーが発生しました',
  },
} as const;

/**
 * 成功メッセージ
 */
export const SUCCESS_MESSAGES = {
  CONNECTION: {
    TEST_SUCCESS: '接続に成功しました',
  },
  LOAD: {
    SUCCESS: 'ストアから SBOM を読み込みました',
  },
  SAVE: {
    SUCCESS: 'SBOM を保存しました',
    OVERWRITE_SUCCESS: 'SBOM を上書き保存しました',
  },
} as const;

/**
 * StoreError から適切な日本語エラーメッセージを取得
 */
export function getErrorMessage(error: unknown): string {
  // StoreError の場合
  if (error instanceof StoreError) {
    // 承認済み SBOM への上書き拒否
    if (error.approvedConflict) {
      return ERROR_MESSAGES.SAVE.APPROVED_CONFLICT;
    }

    // HTTP ステータスコードに応じたメッセージ
    switch (error.statusCode) {
      case 0:
        // ネットワークエラー
        return ERROR_MESSAGES.CONNECTION.NETWORK_ERROR;
      case 400:
        return ERROR_MESSAGES.SAVE.VALIDATION_ERROR;
      case 404:
        return ERROR_MESSAGES.LOAD.NOT_FOUND;
      case 500:
        return ERROR_MESSAGES.SERVER.INTERNAL_ERROR;
      default:
        // StoreError のメッセージをそのまま使用
        return error.message;
    }
  }

  // Error オブジェクトの場合
  if (error instanceof Error) {
    return error.message;
  }

  // その他の場合
  return ERROR_MESSAGES.GENERIC.UNKNOWN;
}

/**
 * エラーオブジェクトから CORS エラーかどうかを判定
 */
export function isCorsError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('CORS') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError')
    );
  }
  return false;
}
