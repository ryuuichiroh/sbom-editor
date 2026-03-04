import { StoreClient, createStoreClient } from './storeClient';
import type { UnifiedSBOM } from '../types/unified';

// fetch をモック
global.fetch = jest.fn();

describe('StoreClient', () => {
  let client: StoreClient;
  const baseUrl = 'http://localhost:3000';

  beforeEach(() => {
    client = new StoreClient({ baseUrl });
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('末尾のスラッシュを削除する', () => {
      const clientWithSlash = new StoreClient({ baseUrl: 'http://localhost:3000/' });
      expect((clientWithSlash as any).baseUrl).toBe('http://localhost:3000');
    });
  });

  describe('healthCheck', () => {
    it('接続成功時、true を返す', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await client.healthCheck();

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/health`);
    });

    it('接続失敗時、StoreError をスローする', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ message: 'Server error' }),
      });

      await expect(client.healthCheck()).rejects.toMatchObject({
        statusCode: 500,
        message: 'Server error',
      });
    });

    it('ネットワークエラー時、StoreError をスローする', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(client.healthCheck()).rejects.toMatchObject({
        statusCode: 0,
        message: 'Network error',
      });
    });
  });

  describe('listSboms', () => {
    it('SBOM 一覧を取得する', async () => {
      const mockResponse = {
        data: [
          {
            name: 'test-sbom',
            version: '1.0.0',
            format: 'CycloneDX',
            approved: false,
            tags: ['test'],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.listSboms({ page: 1, limit: 20 });

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/sboms?page=1&limit=20`);
    });

    it('フィルタパラメータを含めて取得する', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [], total: 0, page: 1, limit: 20 }),
      });

      await client.listSboms({
        page: 1,
        limit: 20,
        name: 'test',
        tag: 'production',
        approved: true,
      });

      expect(fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/sboms?page=1&limit=20&tag=production&name=test&approved=true`
      );
    });

    it('パラメータなしで取得する', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [], total: 0, page: 1, limit: 20 }),
      });

      await client.listSboms({});

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/sboms?`);
    });

    it('approved=false でフィルタリングする', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [], total: 0, page: 1, limit: 20 }),
      });

      await client.listSboms({ approved: false });

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/sboms?approved=false`);
    });
  });

  describe('getSbom', () => {
    it('特定の SBOM を取得する', async () => {
      const mockSbom = {
        name: 'test-sbom',
        version: '1.0.0',
        format: 'CycloneDX',
        approved: false,
        tags: ['test'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        content: {} as UnifiedSBOM,
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSbom),
      });

      const result = await client.getSbom('test-sbom', '1.0.0');

      expect(result).toEqual(mockSbom);
      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/sboms/test-sbom/1.0.0`);
    });

    it('名前とバージョンを URL エンコードする', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await client.getSbom('test sbom', '1.0.0-beta');

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/sboms/test%20sbom/1.0.0-beta`);
    });

    it('特殊文字を含む名前とバージョンを URL エンコードする', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await client.getSbom('test/sbom', '1.0.0+build');

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/sboms/test%2Fsbom/1.0.0%2Bbuild`);
    });
  });

  describe('createSbom', () => {
    it('新しい SBOM を作成する', async () => {
      const mockData = {
        name: 'new-sbom',
        version: '1.0.0',
        format: 'CycloneDX',
        content: {} as UnifiedSBOM,
        tags: ['test'],
      };

      const mockResponse = {
        ...mockData,
        approved: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.createSbom(mockData);

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/sboms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockData),
      });
    });

    it('タグなしで SBOM を作成する', async () => {
      const mockData = {
        name: 'new-sbom',
        version: '1.0.0',
        format: 'CycloneDX',
        content: {} as UnifiedSBOM,
      };

      const mockResponse = {
        ...mockData,
        approved: false,
        tags: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.createSbom(mockData);

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/sboms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockData),
      });
    });
  });

  describe('updateSbom', () => {
    it('既存の SBOM を更新する', async () => {
      const mockData = {
        format: 'SPDX',
        content: {} as UnifiedSBOM,
      };

      const mockResponse = {
        name: 'test-sbom',
        version: '1.0.0',
        format: 'SPDX',
        approved: false,
        tags: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        content: {} as UnifiedSBOM,
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.updateSbom('test-sbom', '1.0.0', mockData);

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/sboms/test-sbom/1.0.0`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockData),
      });
    });
  });

  describe('deleteSbom', () => {
    it('SBOM を削除する', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      await client.deleteSbom('test-sbom', '1.0.0');

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/sboms/test-sbom/1.0.0`, {
        method: 'DELETE',
      });
    });
  });

  describe('updateApprovalStatus', () => {
    it('承認ステータスを更新する', async () => {
      const mockResponse = {
        name: 'test-sbom',
        version: '1.0.0',
        format: 'CycloneDX',
        approved: true,
        tags: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        content: {} as UnifiedSBOM,
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.updateApprovalStatus('test-sbom', '1.0.0', true);

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/sboms/test-sbom/1.0.0/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved: true }),
      });
    });
  });

  describe('addTags', () => {
    it('タグを追加する', async () => {
      const mockResponse = {
        name: 'test-sbom',
        version: '1.0.0',
        format: 'CycloneDX',
        approved: false,
        tags: ['tag1', 'tag2'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        content: {} as UnifiedSBOM,
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.addTags('test-sbom', '1.0.0', ['tag1', 'tag2']);

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/sboms/test-sbom/1.0.0/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags: ['tag1', 'tag2'] }),
      });
    });
  });

  describe('removeTag', () => {
    it('タグを削除する', async () => {
      const mockResponse = {
        name: 'test-sbom',
        version: '1.0.0',
        format: 'CycloneDX',
        approved: false,
        tags: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        content: {} as UnifiedSBOM,
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.removeTag('test-sbom', '1.0.0', 'tag1');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/sboms/test-sbom/1.0.0/tags/tag1`, {
        method: 'DELETE',
      });
    });

    it('特殊文字を含むタグ名を URL エンコードする', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await client.removeTag('test-sbom', '1.0.0', 'tag with spaces');

      expect(fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/sboms/test-sbom/1.0.0/tags/tag%20with%20spaces`,
        {
          method: 'DELETE',
        }
      );
    });
  });

  describe('listTags', () => {
    it('すべてのタグを取得する', async () => {
      const mockTags = ['tag1', 'tag2', 'tag3'];

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTags),
      });

      const result = await client.listTags();

      expect(result).toEqual(mockTags);
      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/tags`);
    });
  });

  describe('エラーハンドリング', () => {
    it('approvedConflict フラグを含むエラーを処理する', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () =>
          Promise.resolve({
            message: 'Cannot update approved SBOM',
            approvedConflict: true,
          }),
      });

      await expect(client.updateSbom('test-sbom', '1.0.0', {})).rejects.toMatchObject({
        statusCode: 403,
        message: 'Cannot update approved SBOM',
        approvedConflict: true,
      });
    });

    it('JSON パースエラー時、statusText を使用する', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(client.healthCheck()).rejects.toMatchObject({
        statusCode: 500,
        message: 'HTTP 500: Internal Server Error',
      });
    });

    it('404 エラーを処理する', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () =>
          Promise.resolve({
            message: 'SBOM not found',
          }),
      });

      await expect(client.getSbom('nonexistent', '1.0.0')).rejects.toMatchObject({
        statusCode: 404,
        message: 'SBOM not found',
      });
    });

    it('409 Conflict エラーを処理する', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: () =>
          Promise.resolve({
            message: 'SBOM already exists',
          }),
      });

      await expect(
        client.createSbom({
          name: 'test',
          version: '1.0.0',
          format: 'CycloneDX',
          content: {} as UnifiedSBOM,
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'SBOM already exists',
      });
    });

    it('ネットワークエラー時、すべてのメソッドで適切にエラーを処理する', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network failure'));

      await expect(client.listSboms({})).rejects.toMatchObject({
        statusCode: 0,
        message: 'Network failure',
      });

      await expect(client.getSbom('test', '1.0.0')).rejects.toMatchObject({
        statusCode: 0,
        message: 'Network failure',
      });

      await expect(
        client.createSbom({
          name: 'test',
          version: '1.0.0',
          format: 'CycloneDX',
          content: {} as UnifiedSBOM,
        })
      ).rejects.toMatchObject({
        statusCode: 0,
        message: 'Network failure',
      });
    });

    it('approvedConflict が false の場合も正しく処理する', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () =>
          Promise.resolve({
            message: 'Invalid data',
            approvedConflict: false,
          }),
      });

      await expect(
        client.createSbom({
          name: '',
          version: '',
          format: 'CycloneDX',
          content: {} as UnifiedSBOM,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid data',
        approvedConflict: false,
      });
    });
  });
});

describe('createStoreClient', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('localStorage に URL がある場合、StoreClient を返す', () => {
    localStorage.setItem('sbomStoreUrl', 'http://localhost:3000');

    const client = createStoreClient();

    expect(client).toBeInstanceOf(StoreClient);
  });

  it('localStorage に URL がない場合、null を返す', () => {
    const client = createStoreClient();

    expect(client).toBeNull();
  });
});
