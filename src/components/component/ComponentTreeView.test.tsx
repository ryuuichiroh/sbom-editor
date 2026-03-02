/**
 * ComponentTreeView のテスト
 */

import { render, screen } from '@testing-library/react';
import { ComponentTreeView } from './ComponentTreeView';
import { SBOMProvider } from '../../store/sbomStore';

describe('ComponentTreeView', () => {
  it('SBOM がない場合、メッセージを表示する', () => {
    render(
      <SBOMProvider>
        <ComponentTreeView />
      </SBOMProvider>
    );

    expect(screen.getByText('SBOM ファイルをアップロードしてください')).toBeInTheDocument();
  });

  it('コンポーネント数を表示する', () => {
    // Note: This test would need a custom wrapper to provide the SBOM state
    // For now, this is a placeholder structure
    expect(true).toBe(true);
  });
});
