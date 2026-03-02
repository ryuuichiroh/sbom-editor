/**
 * 循環参照検出ロジックの単体テスト
 */

import { describe, it, expect } from '@jest/globals';
import {
  detectCircularReference,
  detectCircularReferenceMultiple,
  formatCircularPath,
  createRelationshipsFromParents,
  extractParentIds,
} from './relationshipUtils';
import type { Component, Relationship } from '../types/unified';

// テスト用のコンポーネントを作成するヘルパー関数
function createTestComponent(id: string, name: string, parentIds: string[] = []): Component {
  return {
    id,
    name,
    version: '1.0.0',
    type: 'library',
    licenses: [],
    hashes: [],
    externalRefs: [],
    customAttributes: [],
    parentIds,
  };
}

describe('relationshipUtils', () => {
  describe('detectCircularReference', () => {
    it('自己参照を検出する', () => {
      const components: Component[] = [createTestComponent('comp-1', 'Component 1')];

      const result = detectCircularReference('comp-1', 'comp-1', components);

      expect(result.hasCircular).toBe(true);
      expect(result.path).toEqual(['comp-1', 'comp-1']);
    });

    it('直接的な循環参照を検出する (A → B → A)', () => {
      const components: Component[] = [
        createTestComponent('comp-a', 'Component A', ['comp-b']),
        createTestComponent('comp-b', 'Component B'),
      ];

      const result = detectCircularReference('comp-b', 'comp-a', components);

      expect(result.hasCircular).toBe(true);
      expect(result.path).toContain('comp-a');
      expect(result.path).toContain('comp-b');
    });

    it('間接的な循環参照を検出する (A → B → C → A)', () => {
      const components: Component[] = [
        createTestComponent('comp-a', 'Component A', ['comp-b']),
        createTestComponent('comp-b', 'Component B', ['comp-c']),
        createTestComponent('comp-c', 'Component C'),
      ];

      const result = detectCircularReference('comp-c', 'comp-a', components);

      expect(result.hasCircular).toBe(true);
    });

    it('循環参照がない場合は false を返す', () => {
      const components: Component[] = [
        createTestComponent('comp-a', 'Component A'),
        createTestComponent('comp-b', 'Component B', ['comp-a']),
        createTestComponent('comp-c', 'Component C', ['comp-b']),
      ];

      const result = detectCircularReference('comp-a', 'comp-d', components);

      expect(result.hasCircular).toBe(false);
      expect(result.path).toBeUndefined();
    });

    it('親が存在しない場合は循環参照なしとする', () => {
      const components: Component[] = [createTestComponent('comp-a', 'Component A')];

      const result = detectCircularReference('comp-a', 'non-existent', components);

      expect(result.hasCircular).toBe(false);
    });

    it('複数の親を持つコンポーネントで循環参照を検出する', () => {
      const components: Component[] = [
        createTestComponent('comp-a', 'Component A', ['comp-b', 'comp-c']),
        createTestComponent('comp-b', 'Component B'),
        createTestComponent('comp-c', 'Component C'),
      ];

      const result = detectCircularReference('comp-b', 'comp-a', components);

      expect(result.hasCircular).toBe(true);
    });
  });

  describe('detectCircularReferenceMultiple', () => {
    it('複数の親のうち1つでも循環参照があれば検出する', () => {
      const components: Component[] = [
        createTestComponent('comp-a', 'Component A', ['comp-b']),
        createTestComponent('comp-b', 'Component B'),
        createTestComponent('comp-c', 'Component C'),
      ];

      const result = detectCircularReferenceMultiple('comp-b', ['comp-c', 'comp-a'], components);

      expect(result.hasCircular).toBe(true);
    });

    it('全ての親で循環参照がない場合は false を返す', () => {
      const components: Component[] = [
        createTestComponent('comp-a', 'Component A'),
        createTestComponent('comp-b', 'Component B'),
        createTestComponent('comp-c', 'Component C'),
        createTestComponent('comp-d', 'Component D'),
      ];

      const result = detectCircularReferenceMultiple('comp-d', ['comp-a', 'comp-b'], components);

      expect(result.hasCircular).toBe(false);
    });

    it('空の親リストの場合は循環参照なしとする', () => {
      const components: Component[] = [createTestComponent('comp-a', 'Component A')];

      const result = detectCircularReferenceMultiple('comp-a', [], components);

      expect(result.hasCircular).toBe(false);
    });
  });

  describe('formatCircularPath', () => {
    it('循環参照パスを人間が読みやすい形式にフォーマットする', () => {
      const components: Component[] = [
        createTestComponent('comp-a', 'Component A'),
        createTestComponent('comp-b', 'Component B'),
        createTestComponent('comp-c', 'Component C'),
      ];

      const path = ['comp-a', 'comp-b', 'comp-c', 'comp-a'];
      const formatted = formatCircularPath(path, components);

      expect(formatted).toBe('Component A → Component B → Component C → Component A');
    });

    it('コンポーネントが見つからない場合は ID を表示する', () => {
      const components: Component[] = [createTestComponent('comp-a', 'Component A')];

      const path = ['comp-a', 'non-existent', 'comp-a'];
      const formatted = formatCircularPath(path, components);

      expect(formatted).toBe('Component A → non-existent → Component A');
    });
  });

  describe('createRelationshipsFromParents', () => {
    it('parentIds から Relationship エンティティを生成する', () => {
      const relationships = createRelationshipsFromParents('comp-a', ['comp-b', 'comp-c']);

      expect(relationships).toHaveLength(2);
      expect(relationships[0]).toEqual({
        sourceId: 'comp-a',
        targetId: 'comp-b',
        type: 'DEPENDS_ON',
      });
      expect(relationships[1]).toEqual({
        sourceId: 'comp-a',
        targetId: 'comp-c',
        type: 'DEPENDS_ON',
      });
    });

    it('カスタム関係タイプを指定できる', () => {
      const relationships = createRelationshipsFromParents('comp-a', ['comp-b'], 'CONTAINS');

      expect(relationships).toHaveLength(1);
      expect(relationships[0].type).toBe('CONTAINS');
    });

    it('空の親リストの場合は空配列を返す', () => {
      const relationships = createRelationshipsFromParents('comp-a', []);

      expect(relationships).toHaveLength(0);
    });
  });

  describe('extractParentIds', () => {
    it('Relationship エンティティから parentIds を抽出する', () => {
      const relationships: Relationship[] = [
        { sourceId: 'comp-a', targetId: 'comp-b', type: 'DEPENDS_ON' },
        { sourceId: 'comp-a', targetId: 'comp-c', type: 'DEPENDS_ON' },
        { sourceId: 'comp-b', targetId: 'comp-d', type: 'DEPENDS_ON' },
        { sourceId: 'comp-a', targetId: 'comp-e', type: 'CONTAINS' },
      ];

      const parentIds = extractParentIds('comp-a', relationships);

      expect(parentIds).toHaveLength(2);
      expect(parentIds).toContain('comp-b');
      expect(parentIds).toContain('comp-c');
      expect(parentIds).not.toContain('comp-e'); // CONTAINS は除外
    });

    it('該当する関係がない場合は空配列を返す', () => {
      const relationships: Relationship[] = [
        { sourceId: 'comp-b', targetId: 'comp-c', type: 'DEPENDS_ON' },
      ];

      const parentIds = extractParentIds('comp-a', relationships);

      expect(parentIds).toHaveLength(0);
    });
  });
});
