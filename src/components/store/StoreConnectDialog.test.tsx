/**
 * StoreConnectDialog のテスト
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StoreConnectDialog } from './StoreConnectDialog';
import * as storeClientModule from '../../services/storeClient';
import type { StoreListResponse, StoreSbomDetail } from '../../types/store';
import { StoreError } from '../../types/store';
import { ERROR_MESSAGES } from '../../utils/errorMessages';

// storeClient モジュールのモック
jest.mock('../../services/storeClient');

const mockSbomList: StoreListResponse = {
  data: [
    {
      name: 'test-app',
      version: '1.0.0',
      format: 'spdx',
      approved: true,
      tags: ['production', 'release'],
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-02T00:00:00Z',
    },
    {
      name: 'lib-utils',
      version: '2.0.0',
      format: 'cyclonedx',
      approved: false,
      tags: ['dev'],
      createdAt: '2025-01-03T00:00:00Z',
      updatedAt: '2025-01-04T00:00:00Z',
    },
  ],
  total: 2,
  page: 1,
  limit: 20,
};

const mockSbomDetail: StoreSbomDetail = {
  name: 'test-app',
  version: '1.0.0',
  format: 'spdx',
  approved: true,
  tags: ['production'],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-02T00:00:00Z',
  content: {
    format: 'spdx',
    specVersion: 'SPDX-2.3',
    metadata: { name: 'test-app', creators: [] },
    components: [],
    relationships: [],
  },
};

describe('StoreConnectDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnLoad = jest.fn();
  let mockListSboms: jest.Mock;
  let mockGetSbom: jest.Mock;
  let mockListTags: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockListSboms = jest.fn().mockResolvedValue(mockSbomList);
    mockGetSbom = jest.fn().mockResolvedValue(mockSbomDetail);
    mockListTags = jest.fn().mockResolvedValue(['production', 'release', 'dev']);

    (storeClientModule.createStoreClient as jest.Mock).mockReturnValue({
      listSboms: mockListSboms,
      getSbom: mockGetSbom,
      listTags: mockListTags,
    });
  });

  it('ダイアログが開いている時にタイトルが表示される', () => {
    render(<StoreConnectDialog open={true} onClose={mockOnClose} onLoad={mockOnLoad} />);

    expect(screen.getByText('ストアから読み込み')).toBeInTheDocument();
  });

  it('ダイアログが閉じている時に表示されない', () => {
    render(<StoreConnectDialog open={false} onClose={mockOnClose} onLoad={mockOnLoad} />);

    expect(screen.queryByText('ストアから読み込み')).not.toBeInTheDocument();
  });

  it('SBOM 一覧が表示される', async () => {
    render(<StoreConnectDialog open={true} onClose={mockOnClose} onLoad={mockOnLoad} />);

    await waitFor(() => {
      expect(screen.getByText('test-app')).toBeInTheDocument();
      expect(screen.getByText('lib-utils')).toBeInTheDocument();
    });
  });

  it('SBOM のバージョン、形式が表示される', async () => {
    render(<StoreConnectDialog open={true} onClose={mockOnClose} onLoad={mockOnLoad} />);

    await waitFor(() => {
      expect(screen.getByText('1.0.0')).toBeInTheDocument();
      expect(screen.getByText('2.0.0')).toBeInTheDocument();
      expect(screen.getByText('spdx')).toBeInTheDocument();
      expect(screen.getByText('cyclonedx')).toBeInTheDocument();
    });
  });

  it('承認済みインジケーターが表示される', async () => {
    render(<StoreConnectDialog open={true} onClose={mockOnClose} onLoad={mockOnLoad} />);

    await waitFor(() => {
      expect(screen.getByLabelText('承認済み')).toBeInTheDocument();
    });
  });

  it('タグが Chip として表示される', async () => {
    render(<StoreConnectDialog open={true} onClose={mockOnClose} onLoad={mockOnLoad} />);

    await waitFor(() => {
      expect(screen.getByText('production')).toBeInTheDocument();
      expect(screen.getByText('release')).toBeInTheDocument();
      expect(screen.getByText('dev')).toBeInTheDocument();
    });
  });

  it('読み込みボタンをクリックすると SBOM が読み込まれる', async () => {
    render(<StoreConnectDialog open={true} onClose={mockOnClose} onLoad={mockOnLoad} />);

    await waitFor(() => {
      expect(screen.getByText('test-app')).toBeInTheDocument();
    });

    const loadButtons = screen.getAllByText('読み込み');
    fireEvent.click(loadButtons[0]);

    await waitFor(() => {
      expect(mockGetSbom).toHaveBeenCalledWith('test-app', '1.0.0');
      expect(mockOnLoad).toHaveBeenCalledWith(mockSbomDetail.content);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('名前フィルタで検索できる', async () => {
    render(<StoreConnectDialog open={true} onClose={mockOnClose} onLoad={mockOnLoad} />);

    await waitFor(() => {
      expect(screen.getByText('test-app')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText('名前で検索');
    fireEvent.change(nameInput, { target: { value: 'test' } });

    const searchButton = screen.getByText('検索');
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(mockListSboms).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'test', page: 1 })
      );
    });
  });

  it('承認状態フィルタで絞り込める', async () => {
    render(<StoreConnectDialog open={true} onClose={mockOnClose} onLoad={mockOnLoad} />);

    await waitFor(() => {
      expect(screen.getByText('test-app')).toBeInTheDocument();
    });

    const approvedCheckbox = screen.getByLabelText('承認済みのみ');
    fireEvent.click(approvedCheckbox);

    const searchButton = screen.getByText('検索');
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(mockListSboms).toHaveBeenCalledWith(
        expect.objectContaining({ approved: true, page: 1 })
      );
    });
  });

  it('ストアが設定されていない場合エラーが表示される', async () => {
    (storeClientModule.createStoreClient as jest.Mock).mockReturnValue(null);

    render(<StoreConnectDialog open={true} onClose={mockOnClose} onLoad={mockOnLoad} />);

    await waitFor(() => {
      expect(screen.getByText('ストアが設定されていません')).toBeInTheDocument();
    });
  });

  it('API エラー時にエラーメッセージが表示される', async () => {
    mockListSboms.mockRejectedValue(new StoreError(500, ERROR_MESSAGES.SERVER.INTERNAL_ERROR));

    render(<StoreConnectDialog open={true} onClose={mockOnClose} onLoad={mockOnLoad} />);

    await waitFor(() => {
      expect(screen.getByText(ERROR_MESSAGES.SERVER.INTERNAL_ERROR)).toBeInTheDocument();
    });
  });

  it('SBOM が0件の場合、メッセージが表示される', async () => {
    mockListSboms.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

    render(<StoreConnectDialog open={true} onClose={mockOnClose} onLoad={mockOnLoad} />);

    await waitFor(() => {
      expect(screen.getByText('SBOM が見つかりませんでした')).toBeInTheDocument();
    });
  });

  it('読み込み失敗時にエラーメッセージが表示される', async () => {
    mockGetSbom.mockRejectedValue(new StoreError(404, ERROR_MESSAGES.LOAD.NOT_FOUND));

    render(<StoreConnectDialog open={true} onClose={mockOnClose} onLoad={mockOnLoad} />);

    await waitFor(() => {
      expect(screen.getByText('test-app')).toBeInTheDocument();
    });

    const loadButtons = screen.getAllByText('読み込み');
    fireEvent.click(loadButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(ERROR_MESSAGES.LOAD.NOT_FOUND)).toBeInTheDocument();
    });

    expect(mockOnLoad).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  describe('ページネーション', () => {
    it('総ページ数が1の場合、ページネーションが表示されない', async () => {
      render(<StoreConnectDialog open={true} onClose={mockOnClose} onLoad={mockOnLoad} />);

      await waitFor(() => {
        expect(screen.getByText('test-app')).toBeInTheDocument();
      });

      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });

    it('総ページ数が2以上の場合、ページネーションが表示される', async () => {
      mockListSboms.mockResolvedValue({
        ...mockSbomList,
        total: 40,
      });

      render(<StoreConnectDialog open={true} onClose={mockOnClose} onLoad={mockOnLoad} />);

      await waitFor(() => {
        expect(screen.getByText('test-app')).toBeInTheDocument();
      });

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });
});
