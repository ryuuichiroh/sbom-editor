/**
 * CycloneDX エクスポーターの単体テスト
 */

import { describe, it, expect } from '@jest/globals';
import { convertToCycloneDXJSON } from './cyclonedxExporter';
import type { UnifiedSBOM } from '../../types/unified';

describe('cyclonedxExporter', () => {
  describe('convertToCycloneDXJSON', () => {
    it('基本的な SBOM を CycloneDX JSON に変換できる', () => {
      const sbom: UnifiedSBOM = {
        format: 'cyclonedx',
        specVersion: '1.4',
        metadata: {
          name: 'Test SBOM',
          serialNumber: 'urn:uuid:12345678-1234-1234-1234-123456789abc',
          created: '2024-01-01T00:00:00Z',
          creators: [
            { type: 'tool', name: 'ACME scanner', version: '1.0' },
            { type: 'person', name: 'John Doe', email: 'john@example.com' },
          ],
          bomVersion: 1,
        },
        components: [
          {
            id: 'comp-1',
            name: 'test-component',
            version: '1.0.0',
            type: 'library',
            licenses: [{ licenseId: 'MIT', category: 'permissive' }],
            copyrightText: 'Copyright 2024 Test',
            hashes: [{ algorithm: 'SHA-256', value: 'abc123' }],
            externalRefs: [],
            customAttributes: [],
            parentIds: [],
            bomRef: 'pkg:npm/test-component@1.0.0',
            purl: 'pkg:npm/test-component@1.0.0',
          },
        ],
        relationships: [],
      };

      const jsonString = convertToCycloneDXJSON(sbom);
      const cdxBom = JSON.parse(jsonString);

      expect(cdxBom.bomFormat).toBe('CycloneDX');
      expect(cdxBom.specVersion).toBe('1.4');
      expect(cdxBom.serialNumber).toBe('urn:uuid:12345678-1234-1234-1234-123456789abc');
      expect(cdxBom.version).toBe(1);
      expect(cdxBom.metadata.timestamp).toBe('2024-01-01T00:00:00Z');
      expect(cdxBom.metadata.tools).toHaveLength(1);
      expect(cdxBom.metadata.tools[0]).toMatchObject({
        vendor: 'ACME',
        name: 'scanner',
        version: '1.0',
      });
      expect(cdxBom.metadata.authors).toHaveLength(1);
      expect(cdxBom.metadata.authors[0]).toMatchObject({
        name: 'John Doe',
        email: 'john@example.com',
      });
      expect(cdxBom.components).toHaveLength(1);
      expect(cdxBom.components[0].name).toBe('test-component');
      expect(cdxBom.components[0].version).toBe('1.0.0');
      expect(cdxBom.components[0]['bom-ref']).toBe('pkg:npm/test-component@1.0.0');
    });

    it('カスタム属性を properties として出力する', () => {
      const sbom: UnifiedSBOM = {
        format: 'cyclonedx',
        specVersion: '1.4',
        metadata: {
          name: 'Test SBOM',
          created: '2024-01-01T00:00:00Z',
          creators: [{ type: 'tool', name: 'test-tool' }],
        },
        components: [
          {
            id: 'comp-1',
            name: 'test-component',
            type: 'library',
            licenses: [{ category: 'unknown' }],
            hashes: [],
            externalRefs: [],
            customAttributes: [
              { name: 'internal:team', value: 'platform', valueType: 'string' },
              {
                name: 'internal:tags',
                value: ['oss', 'security'],
                valueType: 'string[]',
              },
            ],
            parentIds: [],
            bomRef: 'comp-1',
          },
        ],
        relationships: [],
      };

      const jsonString = convertToCycloneDXJSON(sbom);
      const cdxBom = JSON.parse(jsonString);

      expect(cdxBom.components[0].properties).toHaveLength(3);
      expect(cdxBom.components[0].properties[0]).toMatchObject({
        name: 'internal:team',
        value: 'platform',
      });
      // string[] は同名エントリを複数展開
      expect(cdxBom.components[0].properties[1]).toMatchObject({
        name: 'internal:tags',
        value: 'oss',
      });
      expect(cdxBom.components[0].properties[2]).toMatchObject({
        name: 'internal:tags',
        value: 'security',
      });
    });

    it('cdxProperties と customAttributes をマージする', () => {
      const sbom: UnifiedSBOM = {
        format: 'cyclonedx',
        specVersion: '1.4',
        metadata: {
          name: 'Test SBOM',
          created: '2024-01-01T00:00:00Z',
          creators: [{ type: 'tool', name: 'test-tool' }],
        },
        components: [
          {
            id: 'comp-1',
            name: 'test-component',
            type: 'library',
            licenses: [{ category: 'unknown' }],
            hashes: [],
            externalRefs: [],
            cdxProperties: [
              { name: 'original:prop', value: 'original-value', valueType: 'string' },
            ],
            customAttributes: [{ name: 'custom:prop', value: 'custom-value', valueType: 'string' }],
            parentIds: [],
            bomRef: 'comp-1',
          },
        ],
        relationships: [],
      };

      const jsonString = convertToCycloneDXJSON(sbom);
      const cdxBom = JSON.parse(jsonString);

      expect(cdxBom.components[0].properties).toHaveLength(2);
      expect(cdxBom.components[0].properties[0]).toMatchObject({
        name: 'original:prop',
        value: 'original-value',
      });
      expect(cdxBom.components[0].properties[1]).toMatchObject({
        name: 'custom:prop',
        value: 'custom-value',
      });
    });

    it('依存関係を正しく変換する', () => {
      const sbom: UnifiedSBOM = {
        format: 'cyclonedx',
        specVersion: '1.4',
        metadata: {
          name: 'Test SBOM',
          created: '2024-01-01T00:00:00Z',
          creators: [{ type: 'tool', name: 'test-tool' }],
        },
        components: [
          {
            id: 'comp-1',
            name: 'parent-component',
            type: 'library',
            licenses: [{ category: 'unknown' }],
            hashes: [],
            externalRefs: [],
            customAttributes: [],
            parentIds: [],
            bomRef: 'parent-ref',
          },
          {
            id: 'comp-2',
            name: 'child-component',
            type: 'library',
            licenses: [{ category: 'unknown' }],
            hashes: [],
            externalRefs: [],
            customAttributes: [],
            parentIds: ['comp-1'],
            bomRef: 'child-ref',
          },
        ],
        relationships: [
          {
            sourceId: 'comp-2',
            targetId: 'comp-1',
            type: 'dependsOn',
          },
        ],
      };

      const jsonString = convertToCycloneDXJSON(sbom);
      const cdxBom = JSON.parse(jsonString);

      expect(cdxBom.dependencies).toHaveLength(2);

      const parentDep = cdxBom.dependencies.find((d: { ref: string }) => d.ref === 'parent-ref');
      expect(parentDep).toBeDefined();
      expect(parentDep.dependsOn).toBeUndefined();

      const childDep = cdxBom.dependencies.find((d: { ref: string }) => d.ref === 'child-ref');
      expect(childDep).toBeDefined();
      expect(childDep.dependsOn).toEqual(['parent-ref']);
    });

    it('rawSource を活用して情報損失を防ぐ', () => {
      const rawSource = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        serialNumber: 'urn:uuid:original-uuid',
        version: 1,
        metadata: {
          timestamp: '2024-01-01T00:00:00Z',
          tools: [{ name: 'original-tool', version: '1.0' }],
        },
        components: [
          {
            type: 'library',
            'bom-ref': 'original-ref',
            name: 'original-component',
            version: '1.0.0',
            purl: 'pkg:npm/original@1.0.0',
            properties: [{ name: 'original:prop', value: 'original-value' }],
          },
        ],
        dependencies: [],
      };

      const sbom: UnifiedSBOM = {
        format: 'cyclonedx',
        specVersion: '1.4',
        metadata: {
          name: 'Updated SBOM',
          serialNumber: 'urn:uuid:original-uuid',
          created: '2024-01-02T00:00:00Z',
          creators: [{ type: 'tool', name: 'updated-tool', version: '2.0' }],
          bomVersion: 2,
        },
        components: [
          {
            id: 'comp-1',
            name: 'updated-component',
            version: '2.0.0',
            type: 'library',
            licenses: [{ licenseId: 'Apache-2.0', category: 'permissive' }],
            hashes: [],
            externalRefs: [],
            customAttributes: [{ name: 'custom:prop', value: 'custom-value', valueType: 'string' }],
            cdxProperties: [
              { name: 'original:prop', value: 'original-value', valueType: 'string' },
            ],
            parentIds: [],
            bomRef: 'original-ref',
            purl: 'pkg:npm/updated@2.0.0',
          },
        ],
        relationships: [],
        rawSource,
      };

      const jsonString = convertToCycloneDXJSON(sbom);
      const cdxBom = JSON.parse(jsonString);

      // 更新された値が反映されている
      expect(cdxBom.version).toBe(2);
      expect(cdxBom.components[0].name).toBe('updated-component');
      expect(cdxBom.components[0].version).toBe('2.0.0');
      expect(cdxBom.components[0].purl).toBe('pkg:npm/updated@2.0.0');

      // rawSource から保持された値
      expect(cdxBom.serialNumber).toBe('urn:uuid:original-uuid');
      expect(cdxBom.components[0]['bom-ref']).toBe('original-ref');

      // properties がマージされている
      expect(cdxBom.components[0].properties).toHaveLength(2);
      expect(cdxBom.components[0].properties[0]).toMatchObject({
        name: 'original:prop',
        value: 'original-value',
      });
      expect(cdxBom.components[0].properties[1]).toMatchObject({
        name: 'custom:prop',
        value: 'custom-value',
      });
    });

    it('ライセンスを正しく変換する', () => {
      const sbom: UnifiedSBOM = {
        format: 'cyclonedx',
        specVersion: '1.4',
        metadata: {
          name: 'Test SBOM',
          created: '2024-01-01T00:00:00Z',
          creators: [{ type: 'tool', name: 'test-tool' }],
        },
        components: [
          {
            id: 'comp-1',
            name: 'test-component',
            type: 'library',
            licenses: [
              { licenseId: 'MIT', category: 'permissive' },
              { expression: 'MIT OR Apache-2.0', category: 'permissive' },
              { licenseName: 'Custom License', category: 'other' },
            ],
            hashes: [],
            externalRefs: [],
            customAttributes: [],
            parentIds: [],
            bomRef: 'comp-1',
          },
        ],
        relationships: [],
      };

      const jsonString = convertToCycloneDXJSON(sbom);
      const cdxBom = JSON.parse(jsonString);

      expect(cdxBom.components[0].licenses).toHaveLength(3);
      expect(cdxBom.components[0].licenses[0]).toMatchObject({
        license: { id: 'MIT' },
      });
      expect(cdxBom.components[0].licenses[1]).toMatchObject({
        expression: 'MIT OR Apache-2.0',
      });
      expect(cdxBom.components[0].licenses[2]).toMatchObject({
        license: { name: 'Custom License' },
      });
    });

    it('ハッシュ値を正しく変換する', () => {
      const sbom: UnifiedSBOM = {
        format: 'cyclonedx',
        specVersion: '1.4',
        metadata: {
          name: 'Test SBOM',
          created: '2024-01-01T00:00:00Z',
          creators: [{ type: 'tool', name: 'test-tool' }],
        },
        components: [
          {
            id: 'comp-1',
            name: 'test-component',
            type: 'library',
            licenses: [{ category: 'unknown' }],
            hashes: [
              { algorithm: 'SHA-256', value: 'abc123' },
              { algorithm: 'SHA-1', value: 'def456' },
            ],
            externalRefs: [],
            customAttributes: [],
            parentIds: [],
            bomRef: 'comp-1',
          },
        ],
        relationships: [],
      };

      const jsonString = convertToCycloneDXJSON(sbom);
      const cdxBom = JSON.parse(jsonString);

      expect(cdxBom.components[0].hashes).toHaveLength(2);
      expect(cdxBom.components[0].hashes[0]).toMatchObject({
        alg: 'SHA-256',
        content: 'abc123',
      });
      expect(cdxBom.components[0].hashes[1]).toMatchObject({
        alg: 'SHA-1',
        content: 'def456',
      });
    });
  });
});
