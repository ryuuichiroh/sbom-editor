/**
 * コマンドパターンによる undo/redo 実装
 * 編集操作（属性変更、コンポーネント追加・削除、関係変更）を記録し、undo/redo を可能にする
 */

import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type { SBOMAction } from './sbomStore';

/**
 * コマンドインターフェース
 * execute: コマンドを実行する
 * undo: コマンドを取り消す
 */
export interface Command {
  execute: () => SBOMAction;
  undo: () => SBOMAction;
  description: string;
}

/**
 * コマンド履歴の状態
 */
export interface CommandHistoryState {
  undoStack: Command[];
  redoStack: Command[];
  maxHistorySize: number;
}

/**
 * コマンド履歴アクション
 */
export type CommandHistoryAction =
  | { type: 'EXECUTE_COMMAND'; payload: Command }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR_HISTORY' };

/**
 * 初期状態
 */
const initialState: CommandHistoryState = {
  undoStack: [],
  redoStack: [],
  maxHistorySize: 50, // 最大50件の履歴を保持
};

/**
 * コマンド履歴 Reducer
 */
function commandHistoryReducer(
  state: CommandHistoryState,
  action: CommandHistoryAction
): CommandHistoryState {
  switch (action.type) {
    case 'EXECUTE_COMMAND': {
      const newUndoStack = [...state.undoStack, action.payload];
      // 最大履歴サイズを超えた場合は古いものから削除
      if (newUndoStack.length > state.maxHistorySize) {
        newUndoStack.shift();
      }
      return {
        ...state,
        undoStack: newUndoStack,
        redoStack: [], // 新しいコマンド実行時は redo スタックをクリア
      };
    }

    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const command = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, command],
      };
    }

    case 'REDO': {
      if (state.redoStack.length === 0) return state;
      const command = state.redoStack[state.redoStack.length - 1];
      return {
        ...state,
        undoStack: [...state.undoStack, command],
        redoStack: state.redoStack.slice(0, -1),
      };
    }

    case 'CLEAR_HISTORY':
      return initialState;

    default:
      return state;
  }
}

/**
 * コマンド履歴 Context Type
 */
export interface CommandHistoryContextType {
  state: CommandHistoryState;
  dispatch: React.Dispatch<CommandHistoryAction>;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * コマンド履歴 Context
 */
const CommandHistoryContext = createContext<CommandHistoryContextType | undefined>(undefined);

/**
 * コマンド履歴 Provider Props
 */
export interface CommandHistoryProviderProps {
  children: ReactNode;
}

/**
 * コマンド履歴 Provider
 */
export const CommandHistoryProvider = ({
  children,
}: CommandHistoryProviderProps): React.ReactElement => {
  const [state, dispatch] = useReducer(commandHistoryReducer, initialState);

  const canUndo = state.undoStack.length > 0;
  const canRedo = state.redoStack.length > 0;

  return (
    <CommandHistoryContext.Provider value={{ state, dispatch, canUndo, canRedo }}>
      {children}
    </CommandHistoryContext.Provider>
  );
};

/**
 * コマンド履歴 Context を使用するカスタムフック
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useCommandHistory = (): CommandHistoryContextType => {
  const context = useContext(CommandHistoryContext);
  if (context === null || context === undefined) {
    throw new Error('useCommandHistory must be used within CommandHistoryProvider');
  }
  return context;
};

/**
 * undo/redo 操作を提供するカスタムフック
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useUndoRedo = (
  sbomDispatch: React.Dispatch<SBOMAction>
): {
  executeCommand: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
} => {
  const { state, dispatch, canUndo, canRedo } = useCommandHistory();

  const executeCommand = useCallback(
    (command: Command) => {
      // コマンドを実行
      const action = command.execute();
      sbomDispatch(action);
      // 履歴に追加
      dispatch({ type: 'EXECUTE_COMMAND', payload: command });
    },
    [sbomDispatch, dispatch]
  );

  const undo = useCallback(() => {
    if (state.undoStack.length === 0) return;
    const command = state.undoStack[state.undoStack.length - 1];
    // undo アクションを実行
    const action = command.undo();
    sbomDispatch(action);
    // 履歴を更新
    dispatch({ type: 'UNDO' });
  }, [state.undoStack, sbomDispatch, dispatch]);

  const redo = useCallback(() => {
    if (state.redoStack.length === 0) return;
    const command = state.redoStack[state.redoStack.length - 1];
    // redo アクションを実行（execute と同じ）
    const action = command.execute();
    sbomDispatch(action);
    // 履歴を更新
    dispatch({ type: 'REDO' });
  }, [state.redoStack, sbomDispatch, dispatch]);

  const clearHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_HISTORY' });
  }, [dispatch]);

  return {
    executeCommand,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  };
};
