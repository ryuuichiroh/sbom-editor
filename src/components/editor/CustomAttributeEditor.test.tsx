/**
 * CustomAttributeEditor のテスト
 */

import { describe, it, expect } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CustomAttributeEditor } from './CustomAttributeEditor';
import { SBOMProvider } from '../../store/sbomStore';
import { ConfigProvider } from '../../store/configStore';
import type { Component } from '../../types/unified';

// モックコンポーネント
const mockComponent: Component = {
  id: 'test-component-1',
  name: 'Test Component',
  version: '1.0.0',
  type: 'library',
  licenses: [],
  hashes: [],
  externalRefs: [],
  customAttributes: [],
  parentIds: [],
};

// ConfigProvider のモック
const MockConfigProvider = ({ children }: { children: React.ReactNode }) => {
  return <ConfigProvider>{children}</ConfigProvider>;
};

describe('CustomAttributeEditor', () => {
  it('カスタム属性がない場合、メッセージを表示する', () => {
    render(
      <SBOMProvider>
        <MockConfigProvider>
          <CustomAttributeEditor component={mockComponent} />
        </MockConfigProvider>
      </SBOMProvider>
    );

    expect(
      screen.getByText('カスタム属性がありません。「追加」ボタンから属性を追加してください。')
    ).toBeInTheDocument();
  });

  it('追加ボタンをクリックするとダイアログが開く', async () => {
    render(
      <SBOMProvider>
        <MockConfigProvider>
          <CustomAttributeEditor component={mockComponent} />
        </MockConfigProvider>
      </SBOMProvider>
    );

    const addButton = screen.getByRole('button', { name: /追加/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('カスタム属性を追加')).toBeInTheDocument();
    });
  });

  it('カスタム属性が存在する場合、属性を表示する', () => {
    const componentWithAttributes: Component = {
      ...mockComponent,
      customAttributes: [
        {
          name: 'test:team',
          value: 'team-a',
          valueType: 'string',
        },
      ],
    };

    render(
      <SBOMProvider>
        <MockConfigProvider>
          <CustomAttributeEditor component={componentWithAttributes} />
        </MockConfigProvider>
      </SBOMProvider>
    );

    // 属性名が表示されることを確認（複数箇所に表示される）
    const teamElements = screen.getAllByText(/test:team/);
    expect(teamElements.length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('team-a')).toBeInTheDocument();
  });

  it('必須属性にアスタリスクが表示される', () => {
    const componentWithAttributes: Component = {
      ...mockComponent,
      customAttributes: [
        {
          name: 'test:team',
          value: '',
          valueType: 'string',
        },
      ],
    };

    render(
      <SBOMProvider>
        <MockConfigProvider>
          <CustomAttributeEditor component={componentWithAttributes} />
        </MockConfigProvider>
      </SBOMProvider>
    );

    // 属性が表示されることを確認
    const teamElements = screen.getAllByText(/test:team/);
    expect(teamElements.length).toBeGreaterThan(0);
  });

  it('string[] 型の属性が複数の値を持つ場合、チップで表示される', () => {
    const componentWithAttributes: Component = {
      ...mockComponent,
      customAttributes: [
        {
          name: 'test:tags',
          value: ['tag1', 'tag2'],
          valueType: 'string[]',
        },
      ],
    };

    render(
      <SBOMProvider>
        <MockConfigProvider>
          <CustomAttributeEditor component={componentWithAttributes} />
        </MockConfigProvider>
      </SBOMProvider>
    );

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
  });
});
