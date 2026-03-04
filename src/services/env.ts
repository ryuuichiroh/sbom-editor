/**
 * 環境変数アクセスモジュール
 *
 * import.meta.env へのアクセスをこのファイルに集約することで、
 * Jest テスト時にこのモジュールだけをモックすれば済むようにしています。
 */

/**
 * 環境変数から SBOM Store URL を取得
 */
export function getEnvStoreUrl(): string | undefined {
  return import.meta.env.VITE_SBOM_STORE_URL;
}
