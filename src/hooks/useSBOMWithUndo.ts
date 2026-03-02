/**
 * undo/redo 対応の SBOM 操作フック
 * コンポーネント編集操作を undo/redo 可能にする
 */

import { useCallback } from 'react';
import { useSBOM } from '../store/sbomStore';
import { useUndoRedo } from '../store/commandHistory';
import {
  createUpdateComponentCommand,
  createAddComponentCommand,
  createDeleteComponentCommand,
} from '../store/commands';
import type { Component, UnifiedSBOM } from '../types/unified';

/**
 * undo/redo 対応の SBOM 操作を提供するカスタムフック
 */
export const useSBOMWithUndo = () => {
  const { state, dispatch } = useSBOM();
  const { executeCommand, undo, redo, canUndo, canRedo, clearHistory } = useUndoRedo(dispatch);

  /**
   * コンポーネントを更新（undo/redo 対応）
   */
  const updateComponent = useCallback(
    (componentId: string, updates: Partial<Component>) => {
      if (!state.sbom) return;

      const oldComponent = state.sbom.components.find((c) => c.id === componentId);
      if (!oldComponent) return;

      const command = createUpdateComponentCommand(componentId, oldComponent, updates);
      executeCommand(command);
    },
    [state.sbom, executeCommand]
  );

  /**
   * コンポーネントを追加（undo/redo 対応）
   */
  const addComponent = useCallback(
    (component: Component) => {
      const command = createAddComponentCommand(component);
      executeCommand(command);
    },
    [executeCommand]
  );

  /**
   * コンポーネントを削除（undo/redo 対応）
   */
  const deleteComponent = useCallback(
    (componentId: string) => {
      if (!state.sbom) return;

      const component = state.sbom.components.find((c) => c.id === componentId);
      if (!component) return;

      const relatedRelationships = state.sbom.relationships.filter(
        (r) => r.sourceId === componentId || r.targetId === componentId
      );

      const command = createDeleteComponentCommand(component, relatedRelationships);
      executeCommand(command);
    },
    [state.sbom, executeCommand]
  );

  /**
   * SBOM をロード（履歴をクリア）
   */
  const loadSBOM = useCallback(
    (sbom: UnifiedSBOM) => {
      dispatch({ type: 'LOAD_SBOM', payload: sbom });
      clearHistory();
    },
    [dispatch, clearHistory]
  );

  /**
   * SBOM をクリア（履歴をクリア）
   */
  const clearSBOM = useCallback(() => {
    dispatch({ type: 'CLEAR_SBOM' });
    clearHistory();
  }, [dispatch, clearHistory]);

  return {
    state,
    dispatch,
    updateComponent,
    addComponent,
    deleteComponent,
    loadSBOM,
    clearSBOM,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};
