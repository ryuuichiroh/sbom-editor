/**
 * DeleteConfirmDialog のテスト
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import type { Component } from '../../types/unified';

describe('DeleteConfirmDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  const mockComponent: Component = {
    id: '1',
    name: 'test-component',
    version: '1.0.0',
    type: 'library',
    licenses: [],
    hashes: [],
    externalRefs: [],
    customAttributes: [],
    parentIds: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('単一コンポーネント削除の確認ダイアログが表示される', () => {
    render(
      <DeleteConfirmDialog
        open={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        components={[mockComponent]}
      />
    );

    expect(screen.getByText('コンポーネントの削除')).toBeInTheDocument();
    expect(screen.getByText(/test-component/)).toBeInTheDocument();
    expect(screen.getByText(/1.0.0/)).toBeInTheDocument();
    expect(screen.getByText('この操作は取り消せません')).toBeInTheDocument();
  });

  it('複数コンポーネント削除の確認ダイアログが表示される', () => {
    const components = [
      mockComponent,
      { ...mockComponent, id: '2', name: 'component-2', version: '2.0.0' },
      { ...mockComponent, id: '3', name: 'component-3', version: undefined },
    ];

    render(
      <DeleteConfirmDialog
        open={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        components={components}
      />
    );

    expect(screen.getByText('コンポーネントの一括削除')).toBeInTheDocument();
    expect(screen.getByText(/3 個のコンポーネントを削除しますか/)).toBeInTheDocument();
    expect(screen.getByText('test-component')).toBeInTheDocument();
    expect(screen.getByText('component-2')).toBeInTheDocument();
    expect(screen.getByText('component-3')).toBeInTheDocument();
  });

  it('影響を受ける関係の数が表示される', () => {
    render(
      <DeleteConfirmDialog
        open={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        components={[mockComponent]}
        affectedRelationships={5}
      />
    );

    expect(screen.getByText(/5 個の関連する依存関係も削除されます/)).toBeInTheDocument();
  });

  it('キャンセルボタンでダイアログが閉じる', () => {
    render(
      <DeleteConfirmDialog
        open={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        components={[mockComponent]}
      />
    );

    fireEvent.click(screen.getByText('キャンセル'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('削除ボタンで削除が実行される', () => {
    render(
      <DeleteConfirmDialog
        open={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        components={[mockComponent]}
      />
    );

    fireEvent.click(screen.getByText('削除'));

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('ダイアログが閉じている時に表示されない', () => {
    render(
      <DeleteConfirmDialog
        open={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        components={[mockComponent]}
      />
    );

    expect(screen.queryByText('コンポーネントの削除')).not.toBeInTheDocument();
  });
});
