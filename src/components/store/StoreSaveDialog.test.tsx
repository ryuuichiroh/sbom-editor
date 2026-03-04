/**
 * StoreSaveDialog のテスト
 */

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { StoreSaveDialog } from './StoreSaveDialog';
import * as storeClientModule from '../../services/storeClient';
import { StoreError } from '../../types/store';
import type { UnifiedSBOM } from '../../types/unified';

// storeClient モジュールのモック
jest.mock('../../services/storeClient');

const mockSbom: UnifiedSBOM = {
  format: 'spdx',
  specVersion: 'SPDX-2.3',
  metadata: { name: 'test-app', creators: [] },
  components: [],
  relationships: [],
};

describe('StoreSaveDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnSaveSuccess = jest.fn();
  let mockCreateSbom: jest.Mock;
  let mockUpdateSbom: jest.Mock;
  let mockListTags: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockCreateSbom = jest.fn().mockResolvedValue({
      name: 'test-app',
      version: '1.0.0',
      format: 'spdx',
      approved: false,
      tags: [],
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      content: mockSbom,
    });
    mockUpdateSbom = jest.fn().mockResolvedValue({
      name: 'test-app',
      version: '1.0.0',
      format: 'spdx',
      approved: false,
      tags: [],
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-02T00:00:00Z',
      content: mockSbom,
    });
    mockListTags = jest.fn().mockResolvedValue(['production', 'release', 'dev']);

    (storeClientModule.createStoreClient as jest.Mock).mockReturnValue({
      createSbom: mockCreateSbom,
      updateSbom: mockUpdateSbom,
      listTags: mockListTags,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('レンダリング', () => {
    it('ダイアログが開いている時にタイトルが表示される', () => {
      act(() => {
        render(<StoreSaveDialog open={true} onClose={mockOnClose} sbom={mockSbom} />);
      });

      expect(screen.getByText('ストアへ保存')).toBeInTheDocument();
    });

    it('ダイアログが閉じている時に表示されない', () => {
      act(() => {
        render(<StoreSaveDialog open={false} onClose={mockOnClose} sbom={mockSbom} />);
      });

      expect(screen.queryByText('ストアへ保存')).not.toBeInTheDocument();
    });

    it('名前、バージョン、タグの入力フィールドが表示される', () => {
      act(() => {
        render(<StoreSaveDialog open={true} onClose={mockOnClose} sbom={mockSbom} />);
      });

      expect(screen.getByLabelText(/名前/)).toBeInTheDocument();
      expect(screen.getByLabelText(/バージョン/)).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /タグ/ })).toBeInTheDocument();
    });

    it('SBOM のメタデータ名が初期値として設定される', () => {
      act(() => {
        render(<StoreSaveDialog open={true} onClose={mockOnClose} sbom={mockSbom} />);
      });

      const nameInput = screen.getByLabelText(/名前/);
      expect(nameInput.value).toBe('test-app');
    });

    it('保存ボタンとキャンセルボタンが表示される', () => {
      act(() => {
        render(<StoreSaveDialog open={true} onClose={mockOnClose} sbom={mockSbom} />);
      });

      expect(screen.getByText('保存')).toBeInTheDocument();
      expect(screen.getByText('キャンセル')).toBeInTheDocument();
    });
  });

  describe('入力バリデーション', () => {
    it('名前が空の場合、保存ボタンが無効になる', () => {
      act(() => {
        render(<StoreSaveDialog open={true} onClose={mockOnClose} sbom={mockSbom} />);
      });

      // 名前を空にする
      const nameInput = screen.getByLabelText(/名前/);
      fireEvent.change(nameInput, { target: { value: '' } });

      const saveButton = screen.getByText('保存');
      expect(saveButton).toBeDisabled();
    });

    it('バージョンが空の場合、保存ボタンが無効になる', () => {
      act(() => {
        render(<StoreSaveDialog open={true} onClose={mockOnClose} sbom={mockSbom} />);
      });

      // バージョンは初期値が空なので、名前だけ入力
      const nameInput = screen.getByLabelText(/名前/);
      fireEvent.change(nameInput, { target: { value: 'my-app' } });

      const saveButton = screen.getByText('保存');
      expect(saveButton).toBeDisabled();
    });

    it('名前とバージョンが入力されている場合、保存ボタンが有効になる', () => {
      act(() => {
        render(<StoreSaveDialog open={true} onClose={mockOnClose} sbom={mockSbom} />);
      });

      const nameInput = screen.getByLabelText(/名前/);
      const versionInput = screen.getByLabelText(/バージョン/);

      fireEvent.change(nameInput, { target: { value: 'my-app' } });
      fireEvent.change(versionInput, { target: { value: '1.0.0' } });

      const saveButton = screen.getByText('保存');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('保存処理', () => {
    it('保存ボタンをクリックすると createSbom が呼ばれる', () => {
      act(() => {
        render(
          <StoreSaveDialog
            open={true}
            onClose={mockOnClose}
            sbom={mockSbom}
            onSaveSuccess={mockOnSaveSuccess}
          />
        );
      });

      const nameInput = screen.getByLabelText(/名前/);
      const versionInput = screen.getByLabelText(/バージョン/);

      fireEvent.change(nameInput, { target: { value: 'my-app' } });
      fireEvent.change(versionInput, { target: { value: '1.0.0' } });

      const saveButton = screen.getByText('保存');
      act(() => {
        fireEvent.click(saveButton);
      });

      expect(mockCreateSbom).toHaveBeenCalledWith({
        name: 'my-app',
        version: '1.0.0',
        format: 'spdx',
        content: mockSbom,
        tags: [],
      });
    });

    it('保存成功時にonSaveSuccessコールバックが呼ばれる', async () => {
      act(() => {
        render(
          <StoreSaveDialog
            open={true}
            onClose={mockOnClose}
            sbom={mockSbom}
            onSaveSuccess={mockOnSaveSuccess}
          />
        );
      });

      const nameInput = screen.getByLabelText(/名前/);
      const versionInput = screen.getByLabelText(/バージョン/);

      fireEvent.change(nameInput, { target: { value: 'my-app' } });
      fireEvent.change(versionInput, { target: { value: '1.0.0' } });

      act(() => {
        fireEvent.click(screen.getByText('保存'));
      });

      await waitFor(() => {
        expect(mockOnSaveSuccess).toHaveBeenCalledWith('SBOM を保存しました');
      });
    });

    it('保存成功後にダイアログが閉じる', async () => {
      act(() => {
        render(<StoreSaveDialog open={true} onClose={mockOnClose} sbom={mockSbom} />);
      });

      const nameInput = screen.getByLabelText(/名前/);
      const versionInput = screen.getByLabelText(/バージョン/);

      fireEvent.change(nameInput, { target: { value: 'my-app' } });
      fireEvent.change(versionInput, { target: { value: '1.0.0' } });

      act(() => {
        fireEvent.click(screen.getByText('保存'));
      });

      // 非同期処理完了を待つ
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('ストアが設定されていない場合エラーが表示される', async () => {
      (storeClientModule.createStoreClient as jest.Mock).mockReturnValue(null);

      act(() => {
        render(<StoreSaveDialog open={true} onClose={mockOnClose} sbom={mockSbom} />);
      });

      const nameInput = screen.getByLabelText(/名前/);
      const versionInput = screen.getByLabelText(/バージョン/);

      fireEvent.change(nameInput, { target: { value: 'my-app' } });
      fireEvent.change(versionInput, { target: { value: '1.0.0' } });

      act(() => {
        fireEvent.click(screen.getByText('保存'));
      });

      await waitFor(() => {
        expect(screen.getByText('ストアが設定されていません')).toBeInTheDocument();
      });
    });

    it('API エラー時にエラーメッセージが表示される', async () => {
      mockCreateSbom.mockRejectedValue(new StoreError(500, 'サーバーでエラーが発生しました'));

      act(() => {
        render(<StoreSaveDialog open={true} onClose={mockOnClose} sbom={mockSbom} />);
      });

      const nameInput = screen.getByLabelText(/名前/);
      const versionInput = screen.getByLabelText(/バージョン/);

      fireEvent.change(nameInput, { target: { value: 'my-app' } });
      fireEvent.change(versionInput, { target: { value: '1.0.0' } });

      act(() => {
        fireEvent.click(screen.getByText('保存'));
      });

      await waitFor(() => {
        expect(screen.getByText('サーバーでエラーが発生しました')).toBeInTheDocument();
      });
    });
  });

  describe('上書き確認', () => {
    it('409 Conflict 時に上書き確認メッセージが表示される', async () => {
      mockCreateSbom.mockRejectedValue(new StoreError(409, 'Conflict', false));

      act(() => {
        render(<StoreSaveDialog open={true} onClose={mockOnClose} sbom={mockSbom} />);
      });

      const nameInput = screen.getByLabelText(/名前/);
      const versionInput = screen.getByLabelText(/バージョン/);

      fireEvent.change(nameInput, { target: { value: 'my-app' } });
      fireEvent.change(versionInput, { target: { value: '1.0.0' } });

      act(() => {
        fireEvent.click(screen.getByText('保存'));
      });

      await waitFor(() => {
        expect(
          screen.getByText(/同じ名前とバージョンの SBOM が既に存在します/)
        ).toBeInTheDocument();
      });
      expect(screen.getByText('上書き')).toBeInTheDocument();
    });

    it('上書きボタンをクリックすると updateSbom が呼ばれる', async () => {
      mockCreateSbom.mockRejectedValue(new StoreError(409, 'Conflict', false));

      act(() => {
        render(<StoreSaveDialog open={true} onClose={mockOnClose} sbom={mockSbom} />);
      });

      const nameInput = screen.getByLabelText(/名前/);
      const versionInput = screen.getByLabelText(/バージョン/);

      fireEvent.change(nameInput, { target: { value: 'my-app' } });
      fireEvent.change(versionInput, { target: { value: '1.0.0' } });

      act(() => {
        fireEvent.click(screen.getByText('保存'));
      });

      await waitFor(() => {
        expect(screen.getByText('上書き')).toBeInTheDocument();
      });

      act(() => {
        fireEvent.click(screen.getByText('上書き'));
      });

      expect(mockUpdateSbom).toHaveBeenCalledWith('my-app', '1.0.0', {
        format: 'spdx',
        content: mockSbom,
        tags: [],
      });
    });

    it('上書き確認でキャンセルすると確認メッセージが消える', async () => {
      mockCreateSbom.mockRejectedValue(new StoreError(409, 'Conflict', false));

      act(() => {
        render(<StoreSaveDialog open={true} onClose={mockOnClose} sbom={mockSbom} />);
      });

      const nameInput = screen.getByLabelText(/名前/);
      const versionInput = screen.getByLabelText(/バージョン/);

      fireEvent.change(nameInput, { target: { value: 'my-app' } });
      fireEvent.change(versionInput, { target: { value: '1.0.0' } });

      act(() => {
        fireEvent.click(screen.getByText('保存'));
      });

      await waitFor(() => {
        expect(
          screen.getByText(/同じ名前とバージョンの SBOM が既に存在します/)
        ).toBeInTheDocument();
      });

      // 上書き確認のキャンセルボタンをクリック
      const cancelButtons = screen.getAllByText('キャンセル');
      act(() => {
        fireEvent.click(cancelButtons[0]); // Alert 内のキャンセル
      });

      expect(
        screen.queryByText(/同じ名前とバージョンの SBOM が既に存在します/)
      ).not.toBeInTheDocument();
    });

    it('上書き成功時にonSaveSuccessコールバックが呼ばれる', async () => {
      mockCreateSbom.mockRejectedValue(new StoreError(409, 'Conflict', false));

      act(() => {
        render(
          <StoreSaveDialog
            open={true}
            onClose={mockOnClose}
            sbom={mockSbom}
            onSaveSuccess={mockOnSaveSuccess}
          />
        );
      });

      const nameInput = screen.getByLabelText(/名前/);
      const versionInput = screen.getByLabelText(/バージョン/);

      fireEvent.change(nameInput, { target: { value: 'my-app' } });
      fireEvent.change(versionInput, { target: { value: '1.0.0' } });

      act(() => {
        fireEvent.click(screen.getByText('保存'));
      });

      await waitFor(() => {
        expect(screen.getByText('上書き')).toBeInTheDocument();
      });

      act(() => {
        fireEvent.click(screen.getByText('上書き'));
      });

      await waitFor(() => {
        expect(mockOnSaveSuccess).toHaveBeenCalledWith('SBOM を上書き保存しました');
      });
    });
  });

  describe('承認済み SBOM 保護', () => {
    it('承認済み SBOM への保存時にエラーメッセージが表示される', async () => {
      mockCreateSbom.mockRejectedValue(
        new StoreError(403, 'Approved SBOM cannot be updated', true)
      );

      act(() => {
        render(<StoreSaveDialog open={true} onClose={mockOnClose} sbom={mockSbom} />);
      });

      const nameInput = screen.getByLabelText(/名前/);
      const versionInput = screen.getByLabelText(/バージョン/);

      fireEvent.change(nameInput, { target: { value: 'approved-app' } });
      fireEvent.change(versionInput, { target: { value: '1.0.0' } });

      act(() => {
        fireEvent.click(screen.getByText('保存'));
      });

      await waitFor(() => {
        expect(
          screen.getByText(
            'この SBOM は承認済みのため更新できません。別の名前またはバージョンで保存してください。'
          )
        ).toBeInTheDocument();
      });
    });

    it('上書き時に承認済みエラーが返された場合もエラーメッセージが表示される', async () => {
      mockCreateSbom.mockRejectedValue(new StoreError(409, 'Conflict', false));
      mockUpdateSbom.mockRejectedValue(
        new StoreError(403, 'Approved SBOM cannot be updated', true)
      );

      act(() => {
        render(<StoreSaveDialog open={true} onClose={mockOnClose} sbom={mockSbom} />);
      });

      const nameInput = screen.getByLabelText(/名前/);
      const versionInput = screen.getByLabelText(/バージョン/);

      fireEvent.change(nameInput, { target: { value: 'approved-app' } });
      fireEvent.change(versionInput, { target: { value: '1.0.0' } });

      act(() => {
        fireEvent.click(screen.getByText('保存'));
      });

      await waitFor(() => {
        expect(screen.getByText('上書き')).toBeInTheDocument();
      });

      act(() => {
        fireEvent.click(screen.getByText('上書き'));
      });

      await waitFor(() => {
        expect(
          screen.getByText(
            'この SBOM は承認済みのため更新できません。別の名前またはバージョンで保存してください。'
          )
        ).toBeInTheDocument();
      });
    });
  });

  describe('キャンセル', () => {
    it('キャンセルボタンをクリックすると onClose が呼ばれる', () => {
      act(() => {
        render(<StoreSaveDialog open={true} onClose={mockOnClose} sbom={mockSbom} />);
      });

      fireEvent.click(screen.getByText('キャンセル'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
