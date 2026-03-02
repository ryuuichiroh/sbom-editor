/**
 * SBOM 状態管理
 * React Context API + useReducer で UnifiedSBOM の状態を管理する
 */

import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { UnifiedSBOM, Component, Relationship, SBOMMetadata } from '../types/unified';

/**
 * SBOM 状態
 */
export interface SBOMState {
  sbom: UnifiedSBOM | null;
  selectedComponentId: string | null;
  isModified: boolean;
}

/**
 * SBOM アクション
 */
export type SBOMAction =
  | { type: 'LOAD_SBOM'; payload: UnifiedSBOM }
  | { type: 'CLEAR_SBOM' }
  | { type: 'UPDATE_METADATA'; payload: Partial<SBOMMetadata> }
  | { type: 'ADD_COMPONENT'; payload: Component }
  | { type: 'UPDATE_COMPONENT'; payload: { id: string; updates: Partial<Component> } }
  | { type: 'DELETE_COMPONENT'; payload: string }
  | { type: 'DELETE_COMPONENTS'; payload: string[] }
  | { type: 'ADD_RELATIONSHIP'; payload: Relationship }
  | { type: 'UPDATE_RELATIONSHIP'; payload: { index: number; updates: Partial<Relationship> } }
  | { type: 'DELETE_RELATIONSHIP'; payload: number }
  | { type: 'SELECT_COMPONENT'; payload: string | null }
  | { type: 'MARK_AS_SAVED' };

/**
 * 初期状態
 */
const initialState: SBOMState = {
  sbom: null,
  selectedComponentId: null,
  isModified: false,
};

/**
 * SBOM Reducer
 */
function sbomReducer(state: SBOMState, action: SBOMAction): SBOMState {
  switch (action.type) {
    case 'LOAD_SBOM':
      return {
        ...state,
        sbom: action.payload,
        selectedComponentId: null,
        isModified: false,
      };

    case 'CLEAR_SBOM':
      return initialState;

    case 'UPDATE_METADATA':
      if (!state.sbom) return state;
      return {
        ...state,
        sbom: {
          ...state.sbom,
          metadata: {
            ...state.sbom.metadata,
            ...action.payload,
          },
        },
        isModified: true,
      };

    case 'ADD_COMPONENT':
      if (!state.sbom) return state;
      return {
        ...state,
        sbom: {
          ...state.sbom,
          components: [...state.sbom.components, action.payload],
        },
        isModified: true,
      };

    case 'UPDATE_COMPONENT': {
      if (!state.sbom) return state;
      const componentIndex = state.sbom.components.findIndex((c) => c.id === action.payload.id);
      if (componentIndex === -1) return state;

      const updatedComponents = [...state.sbom.components];
      updatedComponents[componentIndex] = {
        ...updatedComponents[componentIndex],
        ...action.payload.updates,
      };

      return {
        ...state,
        sbom: {
          ...state.sbom,
          components: updatedComponents,
        },
        isModified: true,
      };
    }

    case 'DELETE_COMPONENT': {
      if (!state.sbom) return state;
      return {
        ...state,
        sbom: {
          ...state.sbom,
          components: state.sbom.components.filter((c) => c.id !== action.payload),
          relationships: state.sbom.relationships.filter(
            (r) => r.sourceId !== action.payload && r.targetId !== action.payload
          ),
        },
        selectedComponentId:
          state.selectedComponentId === action.payload ? null : state.selectedComponentId,
        isModified: true,
      };
    }

    case 'DELETE_COMPONENTS': {
      if (!state.sbom) return state;
      const idsToDelete = new Set(action.payload);
      return {
        ...state,
        sbom: {
          ...state.sbom,
          components: state.sbom.components.filter((c) => !idsToDelete.has(c.id)),
          relationships: state.sbom.relationships.filter(
            (r) => !idsToDelete.has(r.sourceId) && !idsToDelete.has(r.targetId)
          ),
        },
        selectedComponentId: idsToDelete.has(state.selectedComponentId ?? '')
          ? null
          : state.selectedComponentId,
        isModified: true,
      };
    }

    case 'ADD_RELATIONSHIP':
      if (!state.sbom) return state;
      return {
        ...state,
        sbom: {
          ...state.sbom,
          relationships: [...state.sbom.relationships, action.payload],
        },
        isModified: true,
      };

    case 'UPDATE_RELATIONSHIP': {
      if (!state.sbom) return state;
      const updatedRelationships = [...state.sbom.relationships];
      if (action.payload.index < 0 || action.payload.index >= updatedRelationships.length) {
        return state;
      }
      updatedRelationships[action.payload.index] = {
        ...updatedRelationships[action.payload.index],
        ...action.payload.updates,
      };
      return {
        ...state,
        sbom: {
          ...state.sbom,
          relationships: updatedRelationships,
        },
        isModified: true,
      };
    }

    case 'DELETE_RELATIONSHIP': {
      if (!state.sbom) return state;
      return {
        ...state,
        sbom: {
          ...state.sbom,
          relationships: state.sbom.relationships.filter((_, i) => i !== action.payload),
        },
        isModified: true,
      };
    }

    case 'SELECT_COMPONENT':
      return {
        ...state,
        selectedComponentId: action.payload,
      };

    case 'MARK_AS_SAVED':
      return {
        ...state,
        isModified: false,
      };

    default:
      return state;
  }
}

/**
 * SBOM Context Type
 */
export interface SBOMContextType {
  state: SBOMState;
  dispatch: React.Dispatch<SBOMAction>;
}

/**
 * SBOM Context
 */
const SBOMContext = createContext<SBOMContextType | undefined>(undefined);

/**
 * SBOM Provider Props
 */
export interface SBOMProviderProps {
  children: ReactNode;
}

/**
 * SBOM Provider
 */
export const SBOMProvider = ({ children }: SBOMProviderProps): React.ReactElement => {
  const [state, dispatch] = useReducer(sbomReducer, initialState);

  return <SBOMContext.Provider value={{ state, dispatch }}>{children}</SBOMContext.Provider>;
};

/**
 * SBOM Context を使用するカスタムフック
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useSBOM = (): SBOMContextType => {
  const context = useContext(SBOMContext);
  if (context === null || context === undefined) {
    throw new Error('useSBOM must be used within SBOMProvider');
  }
  return context;
};
