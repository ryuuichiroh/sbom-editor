/**
 * 設定状態管理
 * React Context API + useReducer で設定ファイルの状態を管理する
 */

import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { FieldRequirementsConfig, CustomAttributesConfig } from '../types/config';

/**
 * 設定状態
 */
export interface ConfigState {
  fieldRequirements: FieldRequirementsConfig | null;
  customAttributes: CustomAttributesConfig | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * 設定アクション
 */
export type ConfigAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOAD_FIELD_REQUIREMENTS'; payload: FieldRequirementsConfig }
  | { type: 'LOAD_CUSTOM_ATTRIBUTES'; payload: CustomAttributesConfig }
  | { type: 'RESET_FIELD_REQUIREMENTS'; payload: FieldRequirementsConfig }
  | { type: 'RESET_CUSTOM_ATTRIBUTES'; payload: CustomAttributesConfig }
  | { type: 'CLEAR_CONFIG' };

/**
 * 初期状態
 */
const initialState: ConfigState = {
  fieldRequirements: null,
  customAttributes: null,
  isLoading: false,
  error: null,
};

/**
 * Config Reducer
 */
function configReducer(state: ConfigState, action: ConfigAction): ConfigState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'LOAD_FIELD_REQUIREMENTS':
      return {
        ...state,
        fieldRequirements: action.payload,
        error: null,
      };

    case 'LOAD_CUSTOM_ATTRIBUTES':
      return {
        ...state,
        customAttributes: action.payload,
        error: null,
      };

    case 'RESET_FIELD_REQUIREMENTS':
      return {
        ...state,
        fieldRequirements: action.payload,
        error: null,
      };

    case 'RESET_CUSTOM_ATTRIBUTES':
      return {
        ...state,
        customAttributes: action.payload,
        error: null,
      };

    case 'CLEAR_CONFIG':
      return initialState;

    default:
      return state;
  }
}

/**
 * Config Context Type
 */
export interface ConfigContextType {
  state: ConfigState;
  dispatch: React.Dispatch<ConfigAction>;
}

/**
 * Config Context
 */
const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

/**
 * Config Provider Props
 */
export interface ConfigProviderProps {
  children: ReactNode;
}

/**
 * Config Provider
 */
export const ConfigProvider = ({ children }: ConfigProviderProps): React.ReactElement => {
  const [state, dispatch] = useReducer(configReducer, initialState);

  return <ConfigContext.Provider value={{ state, dispatch }}>{children}</ConfigContext.Provider>;
};

/**
 * Config Context を使用するカスタムフック
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useConfig = (): ConfigContextType => {
  const context = useContext(ConfigContext);
  if (context === null || context === undefined) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
};
