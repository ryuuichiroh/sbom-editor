/**
 * 親子関係管理ユーティリティ
 * 循環参照検出ロジックを提供する
 */

import type { Component, Relationship } from '../types/unified';

/**
 * 循環参照検出結果
 */
export interface CircularReferenceResult {
  /** 循環参照が存在するか */
  hasCircular: boolean;
  /** 循環参照のパス（存在する場合） */
  path?: string[];
}

/**
 * 単一の親追加時の循環参照検出
 * @param componentId 対象コンポーネントID
 * @param newParentId 追加しようとする親コンポーネントID
 * @param components 全コンポーネント
 * @returns 循環参照検出結果
 */
export function detectCircularReference(
  componentId: string,
  newParentId: string,
  components: Component[]
): CircularReferenceResult {
  // 自己参照チェック
  if (componentId === newParentId) {
    return {
      hasCircular: true,
      path: [componentId, newParentId],
    };
  }

  // 新しい親の祖先を辿って、対象コンポーネントが含まれていないかチェック
  const visited = new Set<string>();
  const path: string[] = [componentId, newParentId];

  let currentId = newParentId;
  while (currentId) {
    if (visited.has(currentId)) {
      // 既に訪問済み（循環参照）
      return {
        hasCircular: true,
        path,
      };
    }

    visited.add(currentId);

    const current = components.find((c) => c.id === currentId);
    if (!current) break;

    // 親の中に対象コンポーネントが含まれている場合は循環参照
    if (current.parentIds.includes(componentId)) {
      path.push(componentId);
      return {
        hasCircular: true,
        path,
      };
    }

    // 次の親へ（複数親がある場合は最初の親を辿る）
    if (current.parentIds.length > 0) {
      currentId = current.parentIds[0];
      path.push(currentId);
    } else {
      break;
    }
  }

  return { hasCircular: false };
}

/**
 * 複数の親設定時の循環参照検出
 * @param componentId 対象コンポーネントID
 * @param newParentIds 設定しようとする親コンポーネントIDの配列
 * @param components 全コンポーネント
 * @returns 循環参照検出結果
 */
export function detectCircularReferenceMultiple(
  componentId: string,
  newParentIds: string[],
  components: Component[]
): CircularReferenceResult {
  // 各親について循環参照をチェック
  for (const parentId of newParentIds) {
    const result = detectCircularReference(componentId, parentId, components);
    if (result.hasCircular) {
      return result;
    }
  }

  return { hasCircular: false };
}

/**
 * 循環参照パスを人間が読みやすい形式にフォーマット
 * @param path 循環参照パス（コンポーネントIDの配列）
 * @param components 全コンポーネント
 * @returns フォーマットされた文字列
 */
export function formatCircularPath(path: string[], components: Component[]): string {
  const names = path.map((id) => {
    const component = components.find((c) => c.id === id);
    return component ? component.name : id;
  });
  return names.join(' → ');
}

/**
 * parentIds から Relationship エンティティを生成
 * @param componentId 対象コンポーネントID
 * @param parentIds 親コンポーネントIDの配列
 * @param relationshipType 関係タイプ（デフォルト: "DEPENDS_ON"）
 * @returns Relationship の配列
 */
export function createRelationshipsFromParents(
  componentId: string,
  parentIds: string[],
  relationshipType = 'DEPENDS_ON'
): Relationship[] {
  return parentIds.map((parentId) => ({
    sourceId: componentId,
    targetId: parentId,
    type: relationshipType,
  }));
}

/**
 * Relationship エンティティから parentIds を抽出
 * @param componentId 対象コンポーネントID
 * @param relationships 全 Relationship
 * @returns 親コンポーネントIDの配列
 */
export function extractParentIds(componentId: string, relationships: Relationship[]): string[] {
  return relationships
    .filter((r) => r.sourceId === componentId && r.type === 'DEPENDS_ON')
    .map((r) => r.targetId);
}
