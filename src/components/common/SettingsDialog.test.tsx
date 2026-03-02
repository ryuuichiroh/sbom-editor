/**
 * SettingsDialog のテスト
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsDialog } from './SettingsDialog';
import { ConfigProvider } from '../../store/configStore';
import * as configLoader from '../../services/configLoader';

// configLoader のモック
jest.mock('../../services/configLoader');

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

  beforeEach(() => {
    jest.clearAllMocks();
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
});
