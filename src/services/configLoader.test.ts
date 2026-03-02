/**
 * configLoader のテスト
 */

import {
  loadFieldRequirements,
  loadCustomAttributes,
  saveFieldRequirements,
  saveCustomAttributes,
  resetFieldRequirements,
  resetCustomAttributes,
  loadConfigFromFile,
  validateFieldRequirements,
  validateCustomAttributes,
} from './configLoader';
import type { FieldRequirementsConfig, CustomAttributesConfig } from '../types/config';

// localStorage のモック
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// fetch のモック
globalThis.fetch = jest.fn();

describe('configLoader', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('loadFieldRequirements', () => {
    it('localStorage に保存された設定を読み込む', async () => {
      const mockConfig: FieldRequirementsConfig = {
        version: '1.0.0',
        spdx: {
          document: {},
          package: {},
          file: {},
        },
        cyclonedx: {
          metadata: {},
          component: {},
        },
      };

      localStorage.setItem('sbom-editor:field-requirements', JSON.stringify(mockConfig));

      const result = await loadFieldRequirements();
      expect(result).toEqual(mockConfig);
    });

    it('localStorage にない場合はデフォルト設定をロードする', async () => {
      const mockConfig: FieldRequirementsConfig = {
        version: '1.0.0',
        description: 'Default config',
        spdx: {
          document: {},
          package: {},
          file: {},
        },
        cyclonedx: {
          metadata: {},
          component: {},
        },
      };

      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        // eslint-disable-next-line @typescript-eslint/require-await
        json: async () => mockConfig,
      });

      const result = await loadFieldRequirements();
      expect(result).toEqual(mockConfig);
      expect(globalThis.fetch).toHaveBeenCalledWith('/config/field-requirements.json');
    });
  });

  describe('saveFieldRequirements', () => {
    it('設定を localStorage に保存する', () => {
      const mockConfig: FieldRequirementsConfig = {
        version: '1.0.0',
        spdx: {
          document: {},
          package: {},
          file: {},
        },
        cyclonedx: {
          metadata: {},
          component: {},
        },
      };

      saveFieldRequirements(mockConfig);

      const stored = localStorage.getItem('sbom-editor:field-requirements');
      expect(stored).toBe(JSON.stringify(mockConfig));
    });
  });

  describe('resetFieldRequirements', () => {
    it('デフォルト設定をロードして保存する', async () => {
      const mockConfig: FieldRequirementsConfig = {
        version: '1.0.0',
        spdx: {
          document: {},
          package: {},
          file: {},
        },
        cyclonedx: {
          metadata: {},
          component: {},
        },
      };

      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        // eslint-disable-next-line @typescript-eslint/require-await
        json: async () => mockConfig,
      });

      const result = await resetFieldRequirements();
      expect(result).toEqual(mockConfig);

      const stored = localStorage.getItem('sbom-editor:field-requirements');
      expect(stored).toBe(JSON.stringify(mockConfig));
    });
  });

  describe('loadCustomAttributes', () => {
    it('localStorage に保存された設定を読み込む', async () => {
      const mockConfig: CustomAttributesConfig = {
        version: '1.0.0',
        attributes: [],
      };

      localStorage.setItem('sbom-editor:custom-attributes', JSON.stringify(mockConfig));

      const result = await loadCustomAttributes();
      expect(result).toEqual(mockConfig);
    });

    it('localStorage にない場合はデフォルト設定をロードする', async () => {
      const mockConfig: CustomAttributesConfig = {
        version: '1.0.0',
        description: 'Default config',
        attributes: [],
      };

      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        // eslint-disable-next-line @typescript-eslint/require-await
        json: async () => mockConfig,
      });

      const result = await loadCustomAttributes();
      expect(result).toEqual(mockConfig);
      expect(globalThis.fetch).toHaveBeenCalledWith('/config/custom-attributes.json');
    });
  });

  describe('saveCustomAttributes', () => {
    it('設定を localStorage に保存する', () => {
      const mockConfig: CustomAttributesConfig = {
        version: '1.0.0',
        attributes: [],
      };

      saveCustomAttributes(mockConfig);

      const stored = localStorage.getItem('sbom-editor:custom-attributes');
      expect(stored).toBe(JSON.stringify(mockConfig));
    });
  });

  describe('resetCustomAttributes', () => {
    it('デフォルト設定をロードして保存する', async () => {
      const mockConfig: CustomAttributesConfig = {
        version: '1.0.0',
        attributes: [],
      };

      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        // eslint-disable-next-line @typescript-eslint/require-await
        json: async () => mockConfig,
      });

      const result = await resetCustomAttributes();
      expect(result).toEqual(mockConfig);

      const stored = localStorage.getItem('sbom-editor:custom-attributes');
      expect(stored).toBe(JSON.stringify(mockConfig));
    });
  });

  describe('loadConfigFromFile', () => {
    it('ファイルから設定を読み込む', async () => {
      const mockConfig = { version: '1.0.0', test: 'data' };
      const file = new File([JSON.stringify(mockConfig)], 'config.json', {
        type: 'application/json',
      });

      const result = await loadConfigFromFile(file);
      expect(result).toEqual(mockConfig);
    });

    it('無効な JSON の場合はエラーをスローする', async () => {
      const file = new File(['invalid json'], 'config.json', {
        type: 'application/json',
      });

      await expect(loadConfigFromFile(file)).rejects.toThrow('設定ファイルのパースに失敗しました');
    });
  });

  describe('validateFieldRequirements', () => {
    it('有効な設定を検証する', () => {
      const validConfig: FieldRequirementsConfig = {
        version: '1.0.0',
        spdx: {
          document: {},
          package: {},
          file: {},
        },
        cyclonedx: {
          metadata: {},
          component: {},
        },
      };

      expect(validateFieldRequirements(validConfig)).toBe(true);
    });

    it('version がない場合は false を返す', () => {
      const invalidConfig = {
        spdx: {
          document: {},
          package: {},
          file: {},
        },
        cyclonedx: {
          metadata: {},
          component: {},
        },
      };

      expect(validateFieldRequirements(invalidConfig)).toBe(false);
    });

    it('spdx セクションがない場合は false を返す', () => {
      const invalidConfig = {
        version: '1.0.0',
        cyclonedx: {
          metadata: {},
          component: {},
        },
      };

      expect(validateFieldRequirements(invalidConfig)).toBe(false);
    });
  });

  describe('validateCustomAttributes', () => {
    it('有効な設定を検証する', () => {
      const validConfig: CustomAttributesConfig = {
        version: '1.0.0',
        attributes: [
          {
            name: 'test',
            valueType: 'string',
          },
        ],
      };

      expect(validateCustomAttributes(validConfig)).toBe(true);
    });

    it('version がない場合は false を返す', () => {
      const invalidConfig = {
        attributes: [],
      };

      expect(validateCustomAttributes(invalidConfig)).toBe(false);
    });

    it('attributes が配列でない場合は false を返す', () => {
      const invalidConfig = {
        version: '1.0.0',
        attributes: 'not an array',
      };

      expect(validateCustomAttributes(invalidConfig)).toBe(false);
    });

    it('属性に name がない場合は false を返す', () => {
      const invalidConfig = {
        version: '1.0.0',
        attributes: [
          {
            valueType: 'string',
          },
        ],
      };

      expect(validateCustomAttributes(invalidConfig)).toBe(false);
    });
  });
});
