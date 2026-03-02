/**
 * SPDX エクスポーターの単体テスト
 */

import { describe, it, expect } from '@jest/globals';
import { convertToSPDXJSON } from './spdxExporter';
import type { UnifiedSBOM } from '../../types/unified';

describe('spdxExporter', () => {
  describe('convertToSPDXJSON', () => {
    it('基本的な SBOM を SPDX JSON に変換できる', () => {
      const sbom: UnifiedSBOM = {
        format: 'spdx',
        specVersion: 'SPDX-2.3',
        metadata: {
          name: 'Test SBOM',
          namespace: 'https://example.com/test-sbom',
          created: '2024-01-01T00:00:00Z',
          creators: [
            { type: 'tool', name: 'test-tool', version: '1.0' },
            { type: 'person', name: 'John Doe', email: 'john@example.com' },
          ],
          spdxId: 'SPDXRef-DOCUMENT',
          dataLicense: 'CC0-1.0',
        },
        components: [
          {
            id: 'comp-1',
            name: 'test-package',
            version: '1.0.0',
            type: 'library',
            licenses: [{ licenseId: 'MIT', category: 'permissive' }],
            copyrightText: 'Copyright 2024 Test',
            hashes: [{ algorithm: 'SHA-256', value: 'abc123' }],
            externalRefs: [],
            customAttributes: [],
            parentIds: [],
            spdxId: 'SPDXRef-Package',
            downloadLocation: 'https://example.com/package.tar.gz',
          },
        ],
        relationships: [],
      };

      const jsonString = convertToSPDXJSON(sbom);
      const spdxDoc = JSON.parse(jsonString);

      expect(spdxDoc.spdxVersion).toBe('SPDX-2.3');
      expect(spdxDoc.dataLicense).toBe('CC0-1.0');
      expect(spdxDoc.SPDXID).toBe('SPDXRef-DOCUMENT');
      expect(spdxDoc.name).toBe('Test SBOM');
      expect(spdxDoc.documentNamespace).toBe('https://example.com/test-sbom');
      expect(spdxDoc.creationInfo.created).toBe('2024-01-01T00:00:00Z');
      expect(spdxDoc.creationInfo.creators).toContain('Tool: test-tool-1.0');
      expect(spdxDoc.creationInfo.creators).toContain('Person: John Doe (john@example.com)');
      expect(spdxDoc.packages).toHaveLength(1);
      expect(spdxDoc.packages[0].name).toBe('test-package');
      expect(spdxDoc.packages[0].versionInfo).toBe('1.0.0');
      expect(spdxDoc.packages[0].SPDXID).toBe('SPDXRef-Package');
    });

    it('カスタム属性を ExternalRef として出力する', () => {
      const sbom: UnifiedSBOM = {
        format: 'spdx',
        specVersion: 'SPDX-2.3',
        metadata: {
          name: 'Test SBOM',
          namespace: 'https://example.com/test-sbom',
          created: '2024-01-01T00:00:00Z',
          creators: [{ type: 'tool', name: 'test-tool' }],
          spdxId: 'SPDXRef-DOCUMENT',
          dataLicense: 'CC0-1.0',
        },
        components: [
          {
            id: 'comp-1',
            name: 'test-package',
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
            spdxId: 'SPDXRef-Package',
            downloadLocation: 'NOASSERTION',
          },
        ],
        relationships: [],
      };

      const jsonString = convertToSPDXJSON(sbom);
      const spdxDoc = JSON.parse(jsonString);

      expect(spdxDoc.packages[0].externalRefs).toHaveLength(2);
      expect(spdxDoc.packages[0].externalRefs[0]).toMatchObject({
        referenceCategory: 'OTHER',
        referenceType: 'custom:internal:team',
        referenceLocator: 'platform',
      });
      expect(spdxDoc.packages[0].externalRefs[1]).toMatchObject({
        referenceCategory: 'OTHER',
        referenceType: 'custom:internal:tags',
        referenceLocator: 'oss,security',
      });
    });

    it('関係性を正しく変換する', () => {
      const sbom: UnifiedSBOM = {
        format: 'spdx',
        specVersion: 'SPDX-2.3',
        metadata: {
          name: 'Test SBOM',
          namespace: 'https://example.com/test-sbom',
          created: '2024-01-01T00:00:00Z',
          creators: [{ type: 'tool', name: 'test-tool' }],
          spdxId: 'SPDXRef-DOCUMENT',
          dataLicense: 'CC0-1.0',
        },
        components: [
          {
            id: 'comp-1',
            name: 'parent-package',
            type: 'library',
            licenses: [{ category: 'unknown' }],
            hashes: [],
            externalRefs: [],
            customAttributes: [],
            parentIds: [],
            spdxId: 'SPDXRef-Parent',
            downloadLocation: 'NOASSERTION',
          },
          {
            id: 'comp-2',
            name: 'child-package',
            type: 'library',
            licenses: [{ category: 'unknown' }],
            hashes: [],
            externalRefs: [],
            customAttributes: [],
            parentIds: ['comp-1'],
            spdxId: 'SPDXRef-Child',
            downloadLocation: 'NOASSERTION',
          },
        ],
        relationships: [
          {
            sourceId: 'comp-1',
            targetId: 'comp-2',
            type: 'CONTAINS',
            comment: 'Parent contains child',
          },
        ],
      };

      const jsonString = convertToSPDXJSON(sbom);
      const spdxDoc = JSON.parse(jsonString);

      expect(spdxDoc.relationships).toHaveLength(1);
      expect(spdxDoc.relationships[0]).toMatchObject({
        spdxElementId: 'SPDXRef-Parent',
        relationshipType: 'CONTAINS',
        relatedSpdxElement: 'SPDXRef-Child',
        comment: 'Parent contains child',
      });
    });

    it('rawSource を活用して情報損失を防ぐ', () => {
      const rawSource = {
        spdxVersion: 'SPDX-2.3',
        dataLicense: 'CC0-1.0',
        SPDXID: 'SPDXRef-DOCUMENT',
        name: 'Original SBOM',
        documentNamespace: 'https://example.com/original',
        creationInfo: {
          created: '2024-01-01T00:00:00Z',
          creators: ['Tool: original-tool'],
          licenseListVersion: '3.21',
        },
        packages: [
          {
            SPDXID: 'SPDXRef-Package',
            name: 'original-package',
            downloadLocation: 'https://example.com/original.tar.gz',
            filesAnalyzed: true,
            packageVerificationCode: {
              packageVerificationCodeValue: 'original-verification-code',
            },
            licenseConcluded: 'MIT',
            copyrightText: 'Copyright 2024 Original',
          },
        ],
        relationships: [],
      };

      const sbom: UnifiedSBOM = {
        format: 'spdx',
        specVersion: 'SPDX-2.3',
        metadata: {
          name: 'Updated SBOM',
          namespace: 'https://example.com/original',
          created: '2024-01-02T00:00:00Z',
          creators: [{ type: 'tool', name: 'updated-tool' }],
          spdxId: 'SPDXRef-DOCUMENT',
          dataLicense: 'CC0-1.0',
          licenseListVersion: '3.21',
        },
        components: [
          {
            id: 'comp-1',
            name: 'updated-package',
            version: '2.0.0',
            type: 'library',
            licenses: [{ licenseId: 'Apache-2.0', category: 'permissive' }],
            hashes: [],
            externalRefs: [],
            customAttributes: [],
            parentIds: [],
            spdxId: 'SPDXRef-Package',
            downloadLocation: 'https://example.com/updated.tar.gz',
            filesAnalyzed: true,
            verificationCode: 'updated-verification-code',
            licenseConcluded: 'Apache-2.0',
            copyrightText: 'Copyright 2024 Updated',
          },
        ],
        relationships: [],
        rawSource,
      };

      const jsonString = convertToSPDXJSON(sbom);
      const spdxDoc = JSON.parse(jsonString);

      // 更新された値が反映されている
      expect(spdxDoc.name).toBe('Updated SBOM');
      expect(spdxDoc.packages[0].name).toBe('updated-package');
      expect(spdxDoc.packages[0].versionInfo).toBe('2.0.0');
      expect(spdxDoc.packages[0].licenseConcluded).toBe('Apache-2.0');

      // rawSource から保持された値
      expect(spdxDoc.creationInfo.licenseListVersion).toBe('3.21');
      expect(spdxDoc.packages[0].filesAnalyzed).toBe(true);
      expect(spdxDoc.packages[0].packageVerificationCode.packageVerificationCodeValue).toBe(
        'updated-verification-code'
      );
    });

    it('ハッシュ値を正しく変換する', () => {
      const sbom: UnifiedSBOM = {
        format: 'spdx',
        specVersion: 'SPDX-2.3',
        metadata: {
          name: 'Test SBOM',
          namespace: 'https://example.com/test-sbom',
          created: '2024-01-01T00:00:00Z',
          creators: [{ type: 'tool', name: 'test-tool' }],
          spdxId: 'SPDXRef-DOCUMENT',
          dataLicense: 'CC0-1.0',
        },
        components: [
          {
            id: 'comp-1',
            name: 'test-package',
            type: 'library',
            licenses: [{ category: 'unknown' }],
            hashes: [
              { algorithm: 'SHA-256', value: 'abc123' },
              { algorithm: 'SHA-1', value: 'def456' },
            ],
            externalRefs: [],
            customAttributes: [],
            parentIds: [],
            spdxId: 'SPDXRef-Package',
            downloadLocation: 'NOASSERTION',
          },
        ],
        relationships: [],
      };

      const jsonString = convertToSPDXJSON(sbom);
      const spdxDoc = JSON.parse(jsonString);

      expect(spdxDoc.packages[0].checksums).toHaveLength(2);
      expect(spdxDoc.packages[0].checksums[0]).toMatchObject({
        algorithm: 'SHA-256',
        checksumValue: 'abc123',
      });
      expect(spdxDoc.packages[0].checksums[1]).toMatchObject({
        algorithm: 'SHA-1',
        checksumValue: 'def456',
      });
    });
  });
});
