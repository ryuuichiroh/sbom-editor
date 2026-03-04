/**
 * Header コンポーネントのテスト
 * ストア連携ボタンの表示/非表示、ダイアログ開閉、SBOM 読み込み処理をテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Header } from './Header';
import { SBOMProvider, useSBOM } from '../../store/sbomStore';
import { CommandHistoryProvider } from '../../store/commandHistory';
import { useStoreConnection } from '../../hooks/useStoreConnection';
import * as storeClientModule from '../../services/storeClient';
import type { UnifiedSBOM } from '../../types/unified';

// モック
jest.mock('../../hooks/useStoreConnection');
jest.mock('../../services/storeClient');
jest.mock('../../services/exporter/spdxExporter', () => ({
  convertToSPDXJSON: jest.fn().mockReturnValue('{}'),
}));
jest.mock('../../services/exporter/cyclonedxExporter', () => ({
  convertToCycloneDXJSON: jest.fn().mockReturnValue('{}'),
}));

const mockSbom: UnifiedSBOM = {
  format: 'spdx',
  specVersion: 'SPDX-2.3',
  metadata: { name: 'test-app', creators: [] },
  components: [],
  relationships: [],
};

/**
 * テスト用のラッパーコンポーネント
 */
function TestWrapper({
  children,
  initialSbom,
}: {
  children: React.ReactNode;
  initialSbom?: UnifiedSBOM;
}) {
  return (
    <SBOMProvider>
      <CommandHistoryProvider>
        {initialSbom && <SBOMLoader sbom={initialSbom} />}
        {children}
      </CommandHistoryProvider>
    </SBOMProvider>
  );
}

/**
 * SBOM をロードするヘルパーコンポーネント
 */
function SBOMLoader({ sbom }: { sbom: UnifiedSBOM }) {
  const { dispatch } = useSBOM();

  React.useEffect(() => {
    dispatch({ type: 'LOAD_SBOM', payload: sbom });
  }, [dispatch, sbom]);

  return null;
}

function renderHeader(options?: { withSBOM?: boolean }) {
  const result = render(
    <TestWrapper initialSbom={options?.withSBOM ? mockSbom : undefined}>
      <Header onSettingsClick={jest.fn()} />
    </TestWrapper>
  );
  return result;
}

describe('Header', () => {
  const mockUpdateStoreUrl = jest.fn();
  const mockTestConnection = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ストア連携ボタンの表示/非表示', () => {
    it('storeUrl が null の場合、ストア連携ボタンが表示されない', () => {
      (useStoreConnection as jest.Mock).mockReturnValue({
        storeUrl: null,
        isConnected: false,
        updateStoreUrl: mockUpdateStoreUrl,
        testConnection: mockTestConnection,
      });

      renderHeader();

      expect(screen.queryByText('ストアから読み込み')).not.toBeInTheDocument();
      expect(screen.queryByText('ストアへ保存')).not.toBeInTheDocument();
    });

    it('storeUrl が設定されている場合、ストア連携ボタンが表示される', () => {
      (useStoreConnection as jest.Mock).mockReturnValue({
        storeUrl: 'http://localhost:3000',
        isConnected: true,
        updateStoreUrl: mockUpdateStoreUrl,
        testConnection: mockTestConnection,
      });

      renderHeader();

      expect(screen.getByText('ストアから読み込み')).toBeInTheDocument();
      expect(screen.getByText('ストアへ保存')).toBeInTheDocument();
    });

    it('SBOM が読み込まれていない場合、ストアへ保存ボタンが無効になる', () => {
      (useStoreConnection as jest.Mock).mockReturnValue({
        storeUrl: 'http://localhost:3000',
        isConnected: true,
        updateStoreUrl: mockUpdateStoreUrl,
        testConnection: mockTestConnection,
      });

      renderHeader({ withSBOM: false });

      const saveButton = screen.getByText('ストアへ保存');
      expect(saveButton.closest('button')).toBeDisabled();
    });

    it('SBOM が読み込まれている場合、ストアへ保存ボタンが有効になる', () => {
      (useStoreConnection as jest.Mock).mockReturnValue({
        storeUrl: 'http://localhost:3000',
        isConnected: true,
        updateStoreUrl: mockUpdateStoreUrl,
        testConnection: mockTestConnection,
      });

      renderHeader({ withSBOM: true });

      const saveButton = screen.getByText('ストアへ保存');
      expect(saveButton.closest('button')).not.toBeDisabled();
    });
  });

  describe('ダイアログ開閉', () => {
    beforeEach(() => {
      (useStoreConnection as jest.Mock).mockReturnValue({
        storeUrl: 'http://localhost:3000',
        isConnected: true,
        updateStoreUrl: mockUpdateStoreUrl,
        testConnection: mockTestConnection,
      });

      // StoreConnectDialog が開いたときに呼ぶ API をモック
      (storeClientModule.createStoreClient as jest.Mock).mockReturnValue({
        listSboms: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
        listTags: jest.fn().mockResolvedValue([]),
        getSbom: jest.fn(),
      });
    });

    it('ストアから読み込みボタンをクリックすると StoreConnectDialog が開く', async () => {
      renderHeader();

      fireEvent.click(screen.getByText('ストアから読み込み'));

      await waitFor(() => {
        expect(screen.getByText('ストアから読み込み', { selector: 'h2' })).toBeInTheDocument();
      });
    });

    it('ストアへ保存ボタンをクリックすると StoreSaveDialog が開く', async () => {
      renderHeader({ withSBOM: true });

      fireEvent.click(screen.getByText('ストアへ保存'));

      await waitFor(() => {
        expect(screen.getByText('ストアへ保存', { selector: 'h2' })).toBeInTheDocument();
      });
    });
  });

  describe('SBOM 読み込み処理', () => {
    const mockSbomDetail = {
      name: 'loaded-app',
      version: '1.0.0',
      format: 'spdx',
      approved: false,
      tags: [],
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      content: mockSbom,
    };

    beforeEach(() => {
      (useStoreConnection as jest.Mock).mockReturnValue({
        storeUrl: 'http://localhost:3000',
        isConnected: true,
        updateStoreUrl: mockUpdateStoreUrl,
        testConnection: mockTestConnection,
      });

      (storeClientModule.createStoreClient as jest.Mock).mockReturnValue({
        listSboms: jest.fn().mockResolvedValue({
          data: [
            {
              name: 'loaded-app',
              version: '1.0.0',
              format: 'spdx',
              approved: false,
              tags: [],
              createdAt: '2025-01-01T00:00:00Z',
              updatedAt: '2025-01-01T00:00:00Z',
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
        }),
        listTags: jest.fn().mockResolvedValue([]),
        getSbom: jest.fn().mockResolvedValue(mockSbomDetail),
      });
    });

    it('ストアから SBOM を読み込むと成功メッセージが表示される', async () => {
      renderHeader();

      // StoreConnectDialog を開く
      fireEvent.click(screen.getByText('ストアから読み込み'));

      // SBOM 一覧が表示されるのを待つ
      await waitFor(() => {
        expect(screen.getByText('loaded-app')).toBeInTheDocument();
      });

      // 読み込みボタンをクリック
      fireEvent.click(screen.getByText('読み込み'));

      // 成功メッセージが表示される
      await waitFor(() => {
        expect(screen.getByText('ストアから SBOM を読み込みました')).toBeInTheDocument();
      });
    });
  });
});
