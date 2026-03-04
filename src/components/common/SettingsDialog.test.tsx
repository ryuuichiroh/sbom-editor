/**
 * SettingsDialog のテスト
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsDialog } from './SettingsDialog';
import { ConfigProvider } from '../../store/configStore';
import * as configLoader from '../../services/configLoader';
import { useStoreConnection } from '../../hooks/useStoreConnection';

// configLoader のモック
jest.mock('../../services/configLoader');

// useStoreConnection のモック
jest.mock('../../hooks/useStoreConnection');

const mockFieldRequirements = {
  version: '1.0.0',
  description: 'Test field requirements',
  spdx: {
    document: {},
    package: {},
    file: {},
  },
  cyclonedx: {
    metadata: {},
    component: {},
  },
};

const mockCustomAttributes = {
  version: '1.0.0',
  description: 'Test custom attributes',
  attributes: [
    {
      name: 'test:attr',
      valueType: 'string' as const,
    },
  ],
};

describe('SettingsDialog', () => {
  const mockOnClose = jest.fn();
  const mockUpdateStoreUrl = jest.fn();
  const mockTestConnection = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // useStoreConnection のデフォルトモック
    (useStoreConnection as jest.Mock).mockReturnValue({
      storeUrl: null,
      isConnected: false,
      updateStoreUrl: mockUpdateStoreUrl,
      testConnection: mockTestConnection,
    });
  });

  it('ダイアログが開いている時に表示される', () => {
    render(
      <ConfigProvider>
        <SettingsDialog open={true} onClose={mockOnClose} />
      </ConfigProvider>
    );

    expect(screen.getByText('設定')).toBeInTheDocument();
    expect(screen.getByText('必須属性設定 (field-requirements.json)')).toBeInTheDocument();
    expect(screen.getByText('カスタム属性設定 (custom-attributes.json)')).toBeInTheDocument();
  });

  it('ダイアログが閉じている時に表示されない', () => {
    render(
      <ConfigProvider>
        <SettingsDialog open={false} onClose={mockOnClose} />
      </ConfigProvider>
    );

    expect(screen.queryByText('設定')).not.toBeInTheDocument();
  });

  it('閉じるボタンをクリックすると onClose が呼ばれる', () => {
    render(
      <ConfigProvider>
        <SettingsDialog open={true} onClose={mockOnClose} />
      </ConfigProvider>
    );

    const closeButton = screen.getByText('閉じる');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('必須属性設定のリセットボタンが機能する', async () => {
    const mockResetFieldRequirements = jest
      .spyOn(configLoader, 'resetFieldRequirements')
      .mockResolvedValue(mockFieldRequirements);

    render(
      <ConfigProvider>
        <SettingsDialog open={true} onClose={mockOnClose} />
      </ConfigProvider>
    );

    const resetButtons = screen.getAllByText('デフォルトに戻す');
    fireEvent.click(resetButtons[0]); // 最初のリセットボタン（必須属性設定）

    await waitFor(() => {
      expect(mockResetFieldRequirements).toHaveBeenCalledTimes(1);
    });
  });

  it('カスタム属性設定のリセットボタンが機能する', async () => {
    const mockResetCustomAttributes = jest
      .spyOn(configLoader, 'resetCustomAttributes')
      .mockResolvedValue(mockCustomAttributes);

    render(
      <ConfigProvider>
        <SettingsDialog open={true} onClose={mockOnClose} />
      </ConfigProvider>
    );

    const resetButtons = screen.getAllByText('デフォルトに戻す');
    fireEvent.click(resetButtons[1]); // 2番目のリセットボタン（カスタム属性設定）

    await waitFor(() => {
      expect(mockResetCustomAttributes).toHaveBeenCalledTimes(1);
    });
  });

  it('ファイルアップロードボタンが表示される', () => {
    render(
      <ConfigProvider>
        <SettingsDialog open={true} onClose={mockOnClose} />
      </ConfigProvider>
    );

    const uploadButtons = screen.getAllByText('ファイルをアップロード');
    expect(uploadButtons).toHaveLength(2); // 必須属性設定とカスタム属性設定
  });

  describe('ストア接続設定', () => {
    it('ストア接続設定セクションが表示される', () => {
      render(
        <ConfigProvider>
          <SettingsDialog open={true} onClose={mockOnClose} />
        </ConfigProvider>
      );

      expect(screen.getByText('ストア接続設定')).toBeInTheDocument();
      expect(screen.getByLabelText('sbom-store URL')).toBeInTheDocument();
      expect(screen.getByText('接続テスト')).toBeInTheDocument();
    });

    it('ストア URL が設定されている場合、入力フィールドに表示される', () => {
      (useStoreConnection as jest.Mock).mockReturnValue({
        storeUrl: 'http://localhost:3000',
        isConnected: true,
        updateStoreUrl: mockUpdateStoreUrl,
        testConnection: mockTestConnection,
      });

      render(
        <ConfigProvider>
          <SettingsDialog open={true} onClose={mockOnClose} />
        </ConfigProvider>
      );

      const input = screen.getByLabelText('sbom-store URL');
      expect(input.value).toBe('http://localhost:3000');
    });

    it('接続済みの場合、接続済みメッセージが表示される', () => {
      (useStoreConnection as jest.Mock).mockReturnValue({
        storeUrl: 'http://localhost:3000',
        isConnected: true,
        updateStoreUrl: mockUpdateStoreUrl,
        testConnection: mockTestConnection,
      });

      render(
        <ConfigProvider>
          <SettingsDialog open={true} onClose={mockOnClose} />
        </ConfigProvider>
      );

      expect(screen.getByText('接続済み')).toBeInTheDocument();
    });

    it('接続テストボタンをクリックすると testConnection が呼ばれる', async () => {
      mockTestConnection.mockResolvedValue(true);

      render(
        <ConfigProvider>
          <SettingsDialog open={true} onClose={mockOnClose} />
        </ConfigProvider>
      );

      const input = screen.getByLabelText('sbom-store URL');
      fireEvent.change(input, { target: { value: 'http://localhost:3000' } });

      const testButton = screen.getByText('接続テスト');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(mockTestConnection).toHaveBeenCalledWith('http://localhost:3000');
      });
    });

    it('接続テスト成功時に成功メッセージが表示される', async () => {
      mockTestConnection.mockResolvedValue(true);

      render(
        <ConfigProvider>
          <SettingsDialog open={true} onClose={mockOnClose} />
        </ConfigProvider>
      );

      const input = screen.getByLabelText('sbom-store URL');
      fireEvent.change(input, { target: { value: 'http://localhost:3000' } });

      const testButton = screen.getByText('接続テスト');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('接続に成功しました')).toBeInTheDocument();
      });
    });

    it('接続テスト失敗時にエラーメッセージが表示される', async () => {
      mockTestConnection.mockResolvedValue(false);

      render(
        <ConfigProvider>
          <SettingsDialog open={true} onClose={mockOnClose} />
        </ConfigProvider>
      );

      const input = screen.getByLabelText('sbom-store URL');
      fireEvent.change(input, { target: { value: 'http://invalid-url' } });

      const testButton = screen.getByText('接続テスト');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('ストアに接続できませんでした')).toBeInTheDocument();
      });
    });

    it('URL が空の場合、エラーメッセージが表示される', async () => {
      render(
        <ConfigProvider>
          <SettingsDialog open={true} onClose={mockOnClose} />
        </ConfigProvider>
      );

      const testButton = screen.getByText('接続テスト');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('ストア URL を入力してください')).toBeInTheDocument();
      });
    });

    it('接続テスト成功時に updateStoreUrl が呼ばれる', async () => {
      mockTestConnection.mockResolvedValue(true);

      render(
        <ConfigProvider>
          <SettingsDialog open={true} onClose={mockOnClose} />
        </ConfigProvider>
      );

      const input = screen.getByLabelText('sbom-store URL');
      fireEvent.change(input, { target: { value: 'http://localhost:3000' } });

      const testButton = screen.getByText('接続テスト');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(mockUpdateStoreUrl).toHaveBeenCalledWith('http://localhost:3000');
      });
    });
  });
});
