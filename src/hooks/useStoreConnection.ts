import { useState, useEffect, useCallback } from 'react';
import { StoreClient } from '../services/storeClient';
import { getEnvStoreUrl } from '../services/env';

/**
 * ストア接続状態を管理するカスタムフック
 *
 * localStorage または環境変数から URL を読み込み、接続テストを実行します。
 * 優先順位: localStorage > 環境変数 (VITE_SBOM_STORE_URL)
 * URL の更新と接続テストの機能を提供します。
 */
export function useStoreConnection() {
  const [storeUrl, setStoreUrl] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  /**
   * 指定された URL への接続をテスト
   * @param url - テストするストア URL
   * @returns 接続成功時は true、失敗時は false
   */
  const testConnection = useCallback(async (url: string): Promise<boolean> => {
    try {
      const client = new StoreClient({ baseUrl: url });
      await client.healthCheck();
      setIsConnected(true);
      return true;
    } catch {
      setIsConnected(false);
      return false;
    }
  }, []);

  // マウント時に localStorage または環境変数から URL を読み込み、接続テストを実行
  useEffect(() => {
    // localStorage から取得を試みる
    let url = localStorage.getItem('sbomStoreUrl');

    // localStorage になければ環境変数から取得
    url ??= getEnvStoreUrl() ?? null;

    setStoreUrl(url);
    if (url) {
      void testConnection(url);
    }

    // 他のコンポーネントが localStorage を更新した場合に同期する
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sbomStoreUrl') {
        setStoreUrl(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [testConnection]);

  /**
   * ストア URL を更新し、localStorage に保存
   * @param url - 新しいストア URL
   */
  const updateStoreUrl = (url: string) => {
    localStorage.setItem('sbomStoreUrl', url);
    setStoreUrl(url);
    // 同一タブ内の他のインスタンスに通知
    window.dispatchEvent(new StorageEvent('storage', { key: 'sbomStoreUrl', newValue: url }));
  };

  return {
    storeUrl,
    isConnected,
    updateStoreUrl,
    testConnection,
  };
}
