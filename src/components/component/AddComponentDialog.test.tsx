/**
 * AddComponentDialog のテスト
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddComponentDialog } from './AddComponentDialog';
import type { NewComponentData } from './AddComponentDialog';

describe('AddComponentDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnAdd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ダイアログが開いている時に表示される', () => {
    render(<AddComponentDialog open={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

    expect(screen.getByText('新規コンポーネント追加')).toBeInTheDocument();
    expect(screen.getByLabelText(/コンポーネント名/)).toBeInTheDocument();
    expect(screen.getByLabelText(/バージョン/)).toBeInTheDocument();
    expect(screen.getByText('タイプ')).toBeInTheDocument();
    expect(screen.getByLabelText(/説明/)).toBeInTheDocument();
  });

  it('ダイアログが閉じている時に表示されない', () => {
    render(<AddComponentDialog open={false} onClose={mockOnClose} onAdd={mockOnAdd} />);

    expect(screen.queryByText('新規コンポーネント追加')).not.toBeInTheDocument();
  });

  it('キャンセルボタンでダイアログが閉じる', () => {
    render(<AddComponentDialog open={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

    fireEvent.click(screen.getByText('キャンセル'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('コンポーネント名が空の場合はエラーが表示される', async () => {
    render(<AddComponentDialog open={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

    fireEvent.click(screen.getByText('追加'));

    await waitFor(() => {
      expect(screen.getByText('コンポーネント名は必須です')).toBeInTheDocument();
    });

    expect(mockOnAdd).not.toHaveBeenCalled();
  });

  it('有効なデータで追加できる', async () => {
    render(<AddComponentDialog open={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

    const nameInput = screen.getByLabelText(/コンポーネント名/);
    const versionInput = screen.getByLabelText(/バージョン/);
    const descriptionInput = screen.getByLabelText(/説明/);

    fireEvent.change(nameInput, { target: { value: 'test-component' } });
    fireEvent.change(versionInput, { target: { value: '1.0.0' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test description' } });

    fireEvent.click(screen.getByText('追加'));

    await waitFor(() => {
      expect(mockOnAdd).toHaveBeenCalledWith({
        name: 'test-component',
        version: '1.0.0',
        type: 'library',
        description: 'Test description',
      } as NewComponentData);
    });
  });

  it('バージョンと説明は省略可能', async () => {
    render(<AddComponentDialog open={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

    const nameInput = screen.getByLabelText(/コンポーネント名/);
    fireEvent.change(nameInput, { target: { value: 'minimal-component' } });

    fireEvent.click(screen.getByText('追加'));

    await waitFor(() => {
      expect(mockOnAdd).toHaveBeenCalledWith({
        name: 'minimal-component',
        version: undefined,
        type: 'library',
        description: undefined,
      } as NewComponentData);
    });
  });

  it('空白のみの入力は無効', async () => {
    render(<AddComponentDialog open={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

    const nameInput = screen.getByLabelText(/コンポーネント名/);
    fireEvent.change(nameInput, { target: { value: '   ' } });

    fireEvent.click(screen.getByText('追加'));

    await waitFor(() => {
      expect(screen.getByText('コンポーネント名は必須です')).toBeInTheDocument();
    });

    expect(mockOnAdd).not.toHaveBeenCalled();
  });
});
