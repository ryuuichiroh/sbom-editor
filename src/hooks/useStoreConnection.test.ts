import { renderHook, act, waitFor } from '@testing-library/react';
import { useStoreConnection } from './useStoreConnection';
import { StoreClient } from '../services/storeClient';

// StoreClient をモック
jest.mock('../services/storeClient');

describe('useStoreConnection', () => {
  const mockHealthCheck = jest.fn();

  beforeEach(() => {
    // localStorage をクリア
    localStorage.clear();

    // モックをリセット
    jest.clearAllMocks();

    // StoreClient のモック実装
    (StoreClient as jest.MockedClass<typeof StoreClient>).mockImplementation(
      () =>
        ({
          healthCheck: mockHealthCheck,
        }) as jest.Mocked<Pick<StoreClient, 'healthCheck'>>
    );
  });

  describe('初期化', () => {
    it('localStorage に URL がない場合、storeUrl は null', () => {
      const { result } = renderHook(() => useStoreConnection());

      expect(result.current.storeUrl).toBeNull();
      expect(result.current.isConnected).toBe(false);
    });

    it('localStorage に URL がある場合、storeUrl を読み込む', () => {
      const testUrl = 'http://localhost:3000';
      localStorage.setItem('sbomStoreUrl', testUrl);

      const { result } = renderHook(() => useStoreConnection());

      expect(result.current.storeUrl).toBe(testUrl);
    });

    it('localStorage に URL がある場合、自動的に接続テストを実行', async () => {
      const testUrl = 'http://localhost:3000';
      localStorage.setItem('sbomStoreUrl', testUrl);
      mockHealthCheck.mockResolvedValue(true);

      renderHook(() => useStoreConnection());

      await waitFor(() => {
        expect(mockHealthCheck).toHaveBeenCalled();
      });
    });
  });

  describe('updateStoreUrl', () => {
    it('URL を更新し、localStorage に保存する', () => {
      const { result } = renderHook(() => useStoreConnection());
      const newUrl = 'http://localhost:4000';

      act(() => {
        result.current.updateStoreUrl(newUrl);
      });

      expect(result.current.storeUrl).toBe(newUrl);
      expect(localStorage.getItem('sbomStoreUrl')).toBe(newUrl);
    });
  });

  describe('testConnection', () => {
    it('接続成功時、isConnected を true にして true を返す', async () => {
      mockHealthCheck.mockResolvedValue(true);
      const { result } = renderHook(() => useStoreConnection());

      let connectionResult: boolean | undefined;
      await act(async () => {
        connectionResult = await result.current.testConnection('http://localhost:3000');
      });

      expect(connectionResult).toBe(true);
      expect(result.current.isConnected).toBe(true);
    });

    it('接続失敗時、isConnected を false にして false を返す', async () => {
      mockHealthCheck.mockRejectedValue(new Error('Connection failed'));
      const { result } = renderHook(() => useStoreConnection());

      let connectionResult: boolean | undefined;
      await act(async () => {
        connectionResult = await result.current.testConnection('http://localhost:3000');
      });

      expect(connectionResult).toBe(false);
      expect(result.current.isConnected).toBe(false);
    });

    it('StoreClient を正しい URL で初期化する', async () => {
      mockHealthCheck.mockResolvedValue(true);
      const { result } = renderHook(() => useStoreConnection());
      const testUrl = 'http://localhost:3000';

      await act(async () => {
        await result.current.testConnection(testUrl);
      });

      expect(StoreClient).toHaveBeenCalledWith({ baseUrl: testUrl });
    });
  });

  describe('自動接続テスト', () => {
    it('接続成功時、isConnected が true になる', async () => {
      const testUrl = 'http://localhost:3000';
      localStorage.setItem('sbomStoreUrl', testUrl);
      mockHealthCheck.mockResolvedValue(true);

      const { result } = renderHook(() => useStoreConnection());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('接続失敗時、isConnected が false のまま', async () => {
      const testUrl = 'http://localhost:3000';
      localStorage.setItem('sbomStoreUrl', testUrl);
      mockHealthCheck.mockRejectedValue(new Error('Connection failed'));

      const { result } = renderHook(() => useStoreConnection());

      await waitFor(() => {
        expect(mockHealthCheck).toHaveBeenCalled();
      });

      expect(result.current.isConnected).toBe(false);
    });
  });
});
