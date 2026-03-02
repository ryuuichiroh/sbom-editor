/**
 * フィールドバリデーターのテスト
 */

import { describe, it, expect } from '@jest/globals';
import { validateComponent, validateMetadata, validateSBOM } from './fieldValidator';
import type { Component, UnifiedSBOM, SBOMMetadata } from '../../types/unified';
import type { FieldRequirementsConfig, CustomAttributesConfig } from '../../types/config';

describe('fieldValidator', () => {
  describe('validateComponent - SPDX', () => {
    const mockSpdxComponent: Component = {
      id: 'test-1',
      name: 'test-component',
      version: '1.0.0',
      type: 'library',
      licenses: [],
      hashes: [],
      externalRefs: [],
      customAttributes: [],
      parentIds: [],
      spdxId: 'SPDXRef-test',
      downloadLocation: 'https://example.com',
    };

    it('仕様必須フィールドが空の場合はエラーを返す', () => {
      const component: Component = {
        ...mockSpdxComponent,
        name: '',
      };

      const result = validateComponent(component, 'spdx', null, null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('name');
      expect(result.errors[0].type).toBe('required');
    });

    it('仕様必須フィールドがすべて入力されている場合はエラーなし', () => {
      const result = validateComponent(mockSpdxComponent, 'spdx', null, null);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('ポリシー必須フィールドが空の場合はエラーを返す', () => {
      const config: FieldRequirementsConfig = {
        version: '1.0.0',
        spdx: {
          document: {},
          package: {
            PackageName: { specRequired: true, required: true },
            SPDXID: { specRequired: true, required: true },
            PackageDownloadLocation: { specRequired: true, required: true },
            PackageVersion: {
              specRequired: false,
              required: true,
              errorMessage: 'バージョンは必須です',
            },
          },
          file: {},
        },
        cyclonedx: {
          metadata: {},
          component: {},
        },
      };

      const component: Component = {
        ...mockSpdxComponent,
        version: undefined,
      };

      const result = validateComponent(component, 'spdx', config, null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('PackageVersion');
      expect(result.errors[0].message).toBe('バージョンは必須です');
    });

    it('SPDX ID が空の場合はエラーを返す', () => {
      const component: Component = {
        ...mockSpdxComponent,
        spdxId: undefined,
      };

      const result = validateComponent(component, 'spdx', null, null);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'spdxId')).toBe(true);
    });

    it('ダウンロード場所が空の場合はエラーを返す', () => {
      const component: Component = {
        ...mockSpdxComponent,
        downloadLocation: undefined,
      };

      const result = validateComponent(component, 'spdx', null, null);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'downloadLocation')).toBe(true);
    });
  });

  describe('validateComponent - CycloneDX', () => {
    const mockCdxComponent: Component = {
      id: 'test-1',
      name: 'test-component',
      version: '1.0.0',
      type: 'library',
      licenses: [],
      hashes: [],
      externalRefs: [],
      customAttributes: [],
      parentIds: [],
      bomRef: 'pkg:npm/test@1.0.0',
    };

    it('仕様必須フィールドが空の場合はエラーを返す', () => {
      const component: Component = {
        ...mockCdxComponent,
        name: '',
      };

      const result = validateComponent(component, 'cyclonedx', null, null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('name');
    });

    it('仕様必須フィールドがすべて入力されている場合はエラーなし', () => {
      const result = validateComponent(mockCdxComponent, 'cyclonedx', null, null);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('ポリシー必須フィールドが空の場合はエラーを返す', () => {
      const config: FieldRequirementsConfig = {
        version: '1.0.0',
        spdx: {
          document: {},
          package: {},
          file: {},
        },
        cyclonedx: {
          metadata: {},
          component: {
            type: { specRequired: true, required: true },
            name: { specRequired: true, required: true },
            'bom-ref': { specRequired: false, required: true },
            purl: { specRequired: false, required: true, errorMessage: 'PURL は必須です' },
          },
        },
      };

      const component: Component = {
        ...mockCdxComponent,
        purl: undefined,
      };

      const result = validateComponent(component, 'cyclonedx', config, null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('purl');
      expect(result.errors[0].message).toBe('PURL は必須です');
    });
  });

  describe('validateComponent - カスタム属性', () => {
    const mockComponent: Component = {
      id: 'test-1',
      name: 'test-component',
      version: '1.0.0',
      type: 'library',
      licenses: [],
      hashes: [],
      externalRefs: [],
      customAttributes: [],
      parentIds: [],
      spdxId: 'SPDXRef-test',
      downloadLocation: 'https://example.com',
    };

    it('必須カスタム属性が空の場合はエラーを返す', () => {
      const customConfig: CustomAttributesConfig = {
        version: '1.0.0',
        attributes: [
          {
            name: 'internal:team',
            label: '担当チーム',
            valueType: 'string',
            required: true,
            errorMessage: '担当チームは必須です',
          },
        ],
      };

      const result = validateComponent(mockComponent, 'spdx', null, customConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('internal:team');
      expect(result.errors[0].message).toBe('担当チームは必須です');
      expect(result.errors[0].type).toBe('custom');
    });

    it('必須カスタム属性が入力されている場合はエラーなし', () => {
      const customConfig: CustomAttributesConfig = {
        version: '1.0.0',
        attributes: [
          {
            name: 'internal:team',
            label: '担当チーム',
            valueType: 'string',
            required: true,
          },
        ],
      };

      const component: Component = {
        ...mockComponent,
        customAttributes: [
          {
            name: 'internal:team',
            value: 'platform',
            valueType: 'string',
          },
        ],
      };

      const result = validateComponent(component, 'spdx', null, customConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('applicableTo が指定されている場合、該当するコンポーネントタイプのみチェックする', () => {
      const customConfig: CustomAttributesConfig = {
        version: '1.0.0',
        attributes: [
          {
            name: 'internal:review-status',
            label: 'レビューステータス',
            valueType: 'string',
            required: true,
            applicableTo: ['library', 'framework'],
          },
        ],
      };

      // library タイプ: エラーあり
      const libraryComponent: Component = {
        ...mockComponent,
        type: 'library',
      };
      const libraryResult = validateComponent(libraryComponent, 'spdx', null, customConfig);
      expect(libraryResult.isValid).toBe(false);

      // application タイプ: エラーなし（applicableTo に含まれない）
      const appComponent: Component = {
        ...mockComponent,
        type: 'application',
      };
      const appResult = validateComponent(appComponent, 'spdx', null, customConfig);
      expect(appResult.isValid).toBe(true);
    });

    it('string[] 型の必須カスタム属性が空配列の場合はエラーを返す', () => {
      const customConfig: CustomAttributesConfig = {
        version: '1.0.0',
        attributes: [
          {
            name: 'internal:tags',
            label: 'タグ',
            valueType: 'string[]',
            required: true,
          },
        ],
      };

      const component: Component = {
        ...mockComponent,
        customAttributes: [
          {
            name: 'internal:tags',
            value: [],
            valueType: 'string[]',
          },
        ],
      };

      const result = validateComponent(component, 'spdx', null, customConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('internal:tags');
    });
  });

  describe('validateMetadata - SPDX', () => {
    const mockSpdxMetadata: SBOMMetadata = {
      name: 'test-sbom',
      namespace: 'https://example.com/test',
      created: '2024-01-01T00:00:00Z',
      creators: [{ type: 'tool', name: 'test-tool' }],
      spdxId: 'SPDXRef-DOCUMENT',
      dataLicense: 'CC0-1.0',
    };

    it('仕様必須フィールドが空の場合はエラーを返す', () => {
      const metadata: SBOMMetadata = {
        ...mockSpdxMetadata,
        name: '',
      };

      const sbom: UnifiedSBOM = {
        format: 'spdx',
        specVersion: 'SPDX-2.3',
        metadata,
        components: [],
        relationships: [],
      };

      const result = validateMetadata(sbom, null);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'name')).toBe(true);
    });

    it('仕様必須フィールドがすべて入力されている場合はエラーなし', () => {
      const sbom: UnifiedSBOM = {
        format: 'spdx',
        specVersion: 'SPDX-2.3',
        metadata: mockSpdxMetadata,
        components: [],
        relationships: [],
      };

      const result = validateMetadata(sbom, null);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateMetadata - CycloneDX', () => {
    const mockCdxMetadata: SBOMMetadata = {
      name: 'test-sbom',
      created: '2024-01-01T00:00:00Z',
      creators: [{ type: 'tool', name: 'test-tool' }],
      serialNumber: 'urn:uuid:12345678-1234-1234-1234-123456789012',
      bomVersion: 1,
    };

    it('ポリシー必須フィールドが空の場合はエラーを返す', () => {
      const config: FieldRequirementsConfig = {
        version: '1.0.0',
        spdx: {
          document: {},
          package: {},
          file: {},
        },
        cyclonedx: {
          metadata: {
            serialNumber: { specRequired: false, required: true },
            timestamp: { specRequired: false, required: true },
          },
          component: {},
        },
      };

      const metadata: SBOMMetadata = {
        ...mockCdxMetadata,
        serialNumber: undefined,
      };

      const sbom: UnifiedSBOM = {
        format: 'cyclonedx',
        specVersion: '1.4',
        metadata,
        components: [],
        relationships: [],
      };

      const result = validateMetadata(sbom, config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'serialNumber')).toBe(true);
    });
  });

  describe('validateSBOM', () => {
    it('メタデータとコンポーネントの両方をバリデーションする', () => {
      const sbom: UnifiedSBOM = {
        format: 'spdx',
        specVersion: 'SPDX-2.3',
        metadata: {
          name: '',
          namespace: 'https://example.com/test',
          created: '2024-01-01T00:00:00Z',
          creators: [{ type: 'tool', name: 'test-tool' }],
          spdxId: 'SPDXRef-DOCUMENT',
          dataLicense: 'CC0-1.0',
        },
        components: [
          {
            id: 'test-1',
            name: '',
            version: '1.0.0',
            type: 'library',
            licenses: [],
            hashes: [],
            externalRefs: [],
            customAttributes: [],
            parentIds: [],
            spdxId: 'SPDXRef-test',
            downloadLocation: 'https://example.com',
          },
        ],
        relationships: [],
      };

      const result = validateSBOM(sbom, null, null);

      expect(result.isValid).toBe(false);
      expect(result.metadata.isValid).toBe(false);
      expect(result.components[0].isValid).toBe(false);
    });

    it('すべてのバリデーションが成功した場合は isValid が true', () => {
      const sbom: UnifiedSBOM = {
        format: 'spdx',
        specVersion: 'SPDX-2.3',
        metadata: {
          name: 'test-sbom',
          namespace: 'https://example.com/test',
          created: '2024-01-01T00:00:00Z',
          creators: [{ type: 'tool', name: 'test-tool' }],
          spdxId: 'SPDXRef-DOCUMENT',
          dataLicense: 'CC0-1.0',
        },
        components: [
          {
            id: 'test-1',
            name: 'test-component',
            version: '1.0.0',
            type: 'library',
            licenses: [],
            hashes: [],
            externalRefs: [],
            customAttributes: [],
            parentIds: [],
            spdxId: 'SPDXRef-test',
            downloadLocation: 'https://example.com',
          },
        ],
        relationships: [],
      };

      const result = validateSBOM(sbom, null, null);

      expect(result.isValid).toBe(true);
      expect(result.metadata.isValid).toBe(true);
      expect(result.components[0].isValid).toBe(true);
    });
  });
});
