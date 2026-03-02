/**
 * コマンドファクトリー関数
 * 各種編集操作に対応するコマンドを生成する
 */

import type { Command } from './commandHistory';
import type { Component, Relationship, SBOMMetadata } from '../types/unified';

/**
 * メタデータ更新コマンド
 */
export const createUpdateMetadataCommand = (
  oldMetadata: SBOMMetadata,
  newMetadata: Partial<SBOMMetadata>
): Command => ({
  execute: () => ({
    type: 'UPDATE_METADATA',
    payload: newMetadata,
  }),
  undo: () => ({
    type: 'UPDATE_METADATA',
    payload: oldMetadata,
  }),
  description: 'メタデータを更新',
});

/**
 * コンポーネント追加コマンド
 */
export const createAddComponentCommand = (component: Component): Command => ({
  execute: () => ({
    type: 'ADD_COMPONENT',
    payload: component,
  }),
  undo: () => ({
    type: 'DELETE_COMPONENT',
    payload: component.id,
  }),
  description: `コンポーネント「${component.name}」を追加`,
});

/**
 * コンポーネント更新コマンド
 */
export const createUpdateComponentCommand = (
  componentId: string,
  oldComponent: Component,
  updates: Partial<Component>
): Command => ({
  execute: () => ({
    type: 'UPDATE_COMPONENT',
    payload: { id: componentId, updates },
  }),
  undo: () => ({
    type: 'UPDATE_COMPONENT',
    payload: { id: componentId, updates: oldComponent },
  }),
  description: `コンポーネント「${oldComponent.name}」を更新`,
});

/**
 * コンポーネント削除コマンド
 */
export const createDeleteComponentCommand = (
  component: Component,
  _relatedRelationships: Relationship[]
): Command => ({
  execute: () => ({
    type: 'DELETE_COMPONENT',
    payload: component.id,
  }),
  undo: () => ({
    type: 'ADD_COMPONENT',
    payload: component,
  }),
  description: `コンポーネント「${component.name}」を削除`,
});

/**
 * 複数コンポーネント削除コマンド
 */
export const createDeleteComponentsCommand = (
  components: Component[],
  _relatedRelationships: Relationship[]
): Command => ({
  execute: () => ({
    type: 'DELETE_COMPONENTS',
    payload: components.map((c) => c.id),
  }),
  undo: () => {
    // undo 時は複数のコンポーネントを順次追加する必要があるため、
    // 最初のコンポーネントのみを返し、残りは別途処理する
    // 実際の実装では、複数アクションをバッチ処理する仕組みが必要
    throw new Error('複数コンポーネント削除の undo は未実装');
  },
  description: `${String(components.length)}個のコンポーネントを削除`,
});

/**
 * 関係追加コマンド
 */
export const createAddRelationshipCommand = (relationship: Relationship): Command => ({
  execute: () => ({
    type: 'ADD_RELATIONSHIP',
    payload: relationship,
  }),
  undo: () => {
    // 関係の削除には index が必要だが、追加時点では不明
    // 実装上の制約として、関係の undo は制限される
    throw new Error('関係追加の undo は未実装');
  },
  description: '関係を追加',
});

/**
 * 関係更新コマンド
 */
export const createUpdateRelationshipCommand = (
  index: number,
  oldRelationship: Relationship,
  updates: Partial<Relationship>
): Command => ({
  execute: () => ({
    type: 'UPDATE_RELATIONSHIP',
    payload: { index, updates },
  }),
  undo: () => ({
    type: 'UPDATE_RELATIONSHIP',
    payload: { index, updates: oldRelationship },
  }),
  description: '関係を更新',
});

/**
 * 関係削除コマンド
 */
export const createDeleteRelationshipCommand = (
  index: number,
  relationship: Relationship
): Command => ({
  execute: () => ({
    type: 'DELETE_RELATIONSHIP',
    payload: index,
  }),
  undo: () => ({
    type: 'ADD_RELATIONSHIP',
    payload: relationship,
  }),
  description: '関係を削除',
});
