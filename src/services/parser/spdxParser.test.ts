/**
 * SPDX パーサーの単体テスト
 */

import { describe, it, expect } from '@jest/globals';
import { parseSPDXJSON, parseSPDXTagValue, parseSPDXYAML } from './spdxParser';

describe('SPDX Parser', () => {
  describe('parseSPDXJSON', () => {
    it('should parse a minimal SPDX JSON document', () => {
      const spdxJson = JSON.stringify({
        spdxVersion: 'SPDX-2.3',
        dataLicense: 'CC0-1.0',
        SPDXID: 'SPDXRef-DOCUMENT',
        name: 'Test Document',
        documentNamespace: 'https://example.com/test-doc',
        creationInfo: {
          created: '2024-01-01T00:00:00Z',
          creators: ['Tool: test-tool-1.0'],
        },
        packages: [],
      });

      const result = parseSPDXJSON(spdxJson);

      expect(result.format).toBe('spdx');
      expect(result.specVersion).toBe('SPDX-2.3');
      expect(result.metadata.name).toBe('Test Document');
      expect(result.metadata.namespace).toBe('https://example.com/test-doc');
      expect(result.metadata.spdxId).toBe('SPDXRef-DOCUMENT');
      expect(result.metadata.dataLicense).toBe('CC0-1.0');
      expect(result.metadata.created).toBe('2024-01-01T00:00:00Z');
      expect(result.metadata.creators).toHaveLength(1);
      expect(result.metadata.creators[0].type).toBe('tool');
      expect(result.metadata.creators[0].name).toBe('test-tool');
      expect(result.metadata.creators[0].version).toBe('1.0');
      expect(result.components).toHaveLength(0);
    });

    it('should parse SPDX document with packages', () => {
      const spdxJson = JSON.stringify({
        spdxVersion: 'SPDX-2.3',
        dataLicense: 'CC0-1.0',
        SPDXID: 'SPDXRef-DOCUMENT',
        name: 'Test Document',
        documentNamespace: 'https://example.com/test-doc',
        creationInfo: {
          created: '2024-01-01T00:00:00Z',
          creators: ['Tool: test-tool-1.0'],
        },
        packages: [
          {
            SPDXID: 'SPDXRef-Package1',
            name: 'lodash',
            versionInfo: '4.17.21',
            downloadLocation: 'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz',
            filesAnalyzed: false,
            licenseConcluded: 'MIT',
            licenseDeclared: 'MIT',
            copyrightText: 'Copyright JS Foundation',
            primaryPackagePurpose: 'LIBRARY',
          },
        ],
      });

      const result = parseSPDXJSON(spdxJson);

      expect(result.components).toHaveLength(1);
      const component = result.components[0];
      expect(component.name).toBe('lodash');
      expect(component.version).toBe('4.17.21');
      expect(component.type).toBe('library');
      expect(component.spdxId).toBe('SPDXRef-Package1');
      expect(component.downloadLocation).toBe(
        'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz'
      );
      expect(component.filesAnalyzed).toBe(false);
      expect(component.licenseConcluded).toBe('MIT');
      expect(component.licenseDeclared).toBe('MIT');
      expect(component.copyrightText).toBe('Copyright JS Foundation');
      expect(component.primaryPackagePurpose).toBe('LIBRARY');
      expect(component.licenses).toHaveLength(1);
      expect(component.licenses[0].expression).toBe('MIT');
      expect(component.licenses[0].licenseId).toBe('MIT');
    });

    it('should parse multiple creators with different types', () => {
      const spdxJson = JSON.stringify({
        spdxVersion: 'SPDX-2.3',
        dataLicense: 'CC0-1.0',
        SPDXID: 'SPDXRef-DOCUMENT',
        name: 'Test Document',
        documentNamespace: 'https://example.com/test-doc',
        creationInfo: {
          created: '2024-01-01T00:00:00Z',
          creators: [
            'Person: John Doe (john@example.com)',
            'Organization: ACME Corp',
            'Tool: scanner-2.5.1',
          ],
        },
        packages: [],
      });

      const result = parseSPDXJSON(spdxJson);

      expect(result.metadata.creators).toHaveLength(3);
      expect(result.metadata.creators[0].type).toBe('person');
      expect(result.metadata.creators[0].name).toBe('John Doe');
      expect(result.metadata.creators[0].email).toBe('john@example.com');
      expect(result.metadata.creators[1].type).toBe('organization');
      expect(result.metadata.creators[1].name).toBe('ACME Corp');
      expect(result.metadata.creators[2].type).toBe('tool');
      expect(result.metadata.creators[2].name).toBe('scanner');
      expect(result.metadata.creators[2].version).toBe('2.5.1');
    });

    it('should handle package with checksums and external references', () => {
      const spdxJson = JSON.stringify({
        spdxVersion: 'SPDX-2.3',
        dataLicense: 'CC0-1.0',
        SPDXID: 'SPDXRef-DOCUMENT',
        name: 'Test Document',
        documentNamespace: 'https://example.com/test-doc',
        creationInfo: {
          created: '2024-01-01T00:00:00Z',
          creators: ['Tool: test-tool-1.0'],
        },
        packages: [
          {
            SPDXID: 'SPDXRef-Package1',
            name: 'express',
            versionInfo: '4.18.2',
            downloadLocation: 'https://registry.npmjs.org/express/-/express-4.18.2.tgz',
            filesAnalyzed: false,
            checksums: [
              { algorithm: 'SHA256', checksumValue: 'abc123def456' },
              { algorithm: 'SHA1', checksumValue: '789ghi012jkl' },
            ],
            externalRefs: [
              {
                referenceCategory: 'PACKAGE-MANAGER',
                referenceType: 'purl',
                referenceLocator: 'pkg:npm/express@4.18.2',
              },
              {
                referenceCategory: 'SECURITY',
                referenceType: 'cpe23Type',
                referenceLocator: 'cpe:2.3:a:expressjs:express:4.18.2:*:*:*:*:*:*:*',
              },
            ],
            licenseConcluded: 'MIT',
            supplier: 'Organization: Express Team (team@expressjs.com)',
          },
        ],
      });

      const result = parseSPDXJSON(spdxJson);

      const component = result.components[0];
      expect(component.hashes).toHaveLength(2);
      expect(component.hashes[0].algorithm).toBe('SHA-256');
      expect(component.hashes[0].value).toBe('abc123def456');
      expect(component.hashes[1].algorithm).toBe('SHA-1');
      expect(component.hashes[1].value).toBe('789ghi012jkl');

      expect(component.externalRefs).toHaveLength(2);
      expect(component.externalRefs[0].category).toBe('PACKAGE-MANAGER');
      expect(component.externalRefs[0].type).toBe('purl');
      expect(component.externalRefs[0].locator).toBe('pkg:npm/express@4.18.2');

      expect(component.supplier).toBeDefined();
      expect(component.supplier?.name).toBe('Express Team');
      expect(component.supplier?.email).toBe('team@expressjs.com');
    });

    it('should handle relationships and set parent-child relationships', () => {
      const spdxJson = JSON.stringify({
        spdxVersion: 'SPDX-2.3',
        dataLicense: 'CC0-1.0',
        SPDXID: 'SPDXRef-DOCUMENT',
        name: 'Test Document',
        documentNamespace: 'https://example.com/test-doc',
        creationInfo: {
          created: '2024-01-01T00:00:00Z',
          creators: ['Tool: test-tool-1.0'],
        },
        packages: [
          {
            SPDXID: 'SPDXRef-Parent',
            name: 'parent-package',
            downloadLocation: 'NOASSERTION',
            filesAnalyzed: false,
          },
          {
            SPDXID: 'SPDXRef-Child',
            name: 'child-package',
            downloadLocation: 'NOASSERTION',
            filesAnalyzed: false,
          },
        ],
        relationships: [
          {
            spdxElementId: 'SPDXRef-Parent',
            relationshipType: 'CONTAINS',
            relatedSpdxElement: 'SPDXRef-Child',
          },
        ],
      });

      const result = parseSPDXJSON(spdxJson);

      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0].type).toBe('CONTAINS');

      const childComponent = result.components.find((c) => c.name === 'child-package');
      expect(childComponent).toBeDefined();
      expect(childComponent?.parentIds).toHaveLength(1);

      const parentComponent = result.components.find((c) => c.name === 'parent-package');
      expect(parentComponent).toBeDefined();
      expect(childComponent?.parentIds[0]).toBe(parentComponent?.id);
    });

    it('should map PrimaryPackagePurpose to ComponentType correctly', () => {
      const purposes = [
        { purpose: 'APPLICATION', expectedType: 'application' },
        { purpose: 'FRAMEWORK', expectedType: 'framework' },
        { purpose: 'LIBRARY', expectedType: 'library' },
        { purpose: 'CONTAINER', expectedType: 'container' },
        { purpose: 'OPERATING-SYSTEM', expectedType: 'operating-system' },
        { purpose: 'DEVICE', expectedType: 'device' },
        { purpose: 'FIRMWARE', expectedType: 'firmware' },
        { purpose: 'FILE', expectedType: 'file' },
        { purpose: 'SOURCE', expectedType: 'other' },
        { purpose: 'ARCHIVE', expectedType: 'other' },
        { purpose: 'INSTALL', expectedType: 'other' },
        { purpose: 'OTHER', expectedType: 'other' },
      ];

      purposes.forEach(({ purpose, expectedType }) => {
        const spdxJson = JSON.stringify({
          spdxVersion: 'SPDX-2.3',
          dataLicense: 'CC0-1.0',
          SPDXID: 'SPDXRef-DOCUMENT',
          name: 'Test Document',
          documentNamespace: 'https://example.com/test-doc',
          creationInfo: {
            created: '2024-01-01T00:00:00Z',
            creators: ['Tool: test-tool-1.0'],
          },
          packages: [
            {
              SPDXID: 'SPDXRef-Package1',
              name: 'test-package',
              downloadLocation: 'NOASSERTION',
              filesAnalyzed: false,
              primaryPackagePurpose: purpose,
            },
          ],
        });

        const result = parseSPDXJSON(spdxJson);
        expect(result.components[0].type).toBe(expectedType);
        expect(result.components[0].primaryPackagePurpose).toBe(purpose);
      });
    });

    it('should handle license expressions and NOASSERTION', () => {
      const spdxJson = JSON.stringify({
        spdxVersion: 'SPDX-2.3',
        dataLicense: 'CC0-1.0',
        SPDXID: 'SPDXRef-DOCUMENT',
        name: 'Test Document',
        documentNamespace: 'https://example.com/test-doc',
        creationInfo: {
          created: '2024-01-01T00:00:00Z',
          creators: ['Tool: test-tool-1.0'],
        },
        packages: [
          {
            SPDXID: 'SPDXRef-Package1',
            name: 'dual-license-package',
            downloadLocation: 'NOASSERTION',
            filesAnalyzed: false,
            licenseConcluded: 'MIT OR Apache-2.0',
          },
          {
            SPDXID: 'SPDXRef-Package2',
            name: 'no-license-package',
            downloadLocation: 'NOASSERTION',
            filesAnalyzed: false,
            licenseConcluded: 'NOASSERTION',
          },
        ],
      });

      const result = parseSPDXJSON(spdxJson);

      const dualLicenseComponent = result.components[0];
      expect(dualLicenseComponent.licenses).toHaveLength(1);
      expect(dualLicenseComponent.licenses[0].expression).toBe('MIT OR Apache-2.0');
      expect(dualLicenseComponent.licenses[0].licenseId).toBeUndefined();

      const noLicenseComponent = result.components[1];
      expect(noLicenseComponent.licenses).toHaveLength(1);
      expect(noLicenseComponent.licenses[0].category).toBe('unknown');
    });
  });

  describe('parseSPDXTagValue', () => {
    it('should parse a minimal SPDX tag-value document', () => {
      const tagValue = `
SPDXVersion: SPDX-2.3
DataLicense: CC0-1.0
SPDXID: SPDXRef-DOCUMENT
DocumentName: Test Document
DocumentNamespace: https://example.com/test-doc
Creator: Tool: test-tool-1.0
Created: 2024-01-01T00:00:00Z
      `.trim();

      const result = parseSPDXTagValue(tagValue);

      expect(result.format).toBe('spdx');
      expect(result.specVersion).toBe('SPDX-2.3');
      expect(result.metadata.name).toBe('Test Document');
      expect(result.metadata.namespace).toBe('https://example.com/test-doc');
      expect(result.metadata.dataLicense).toBe('CC0-1.0');
      expect(result.metadata.created).toBe('2024-01-01T00:00:00Z');
      expect(result.metadata.creators).toHaveLength(1);
      expect(result.metadata.creators[0].type).toBe('tool');
    });

    it('should parse tag-value document with packages', () => {
      const tagValue = `
SPDXVersion: SPDX-2.3
DataLicense: CC0-1.0
SPDXID: SPDXRef-DOCUMENT
DocumentName: Test Document
DocumentNamespace: https://example.com/test-doc
Creator: Tool: test-tool-1.0
Created: 2024-01-01T00:00:00Z

PackageName: lodash
SPDXID: SPDXRef-Package1
PackageVersion: 4.17.21
PackageDownloadLocation: https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz
FilesAnalyzed: false
PackageLicenseConcluded: MIT
PackageLicenseDeclared: MIT
PackageCopyrightText: Copyright JS Foundation
PrimaryPackagePurpose: LIBRARY
      `.trim();

      const result = parseSPDXTagValue(tagValue);

      expect(result.components).toHaveLength(1);
      const component = result.components[0];
      expect(component.name).toBe('lodash');
      expect(component.version).toBe('4.17.21');
      expect(component.spdxId).toBe('SPDXRef-Package1');
      expect(component.downloadLocation).toBe(
        'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz'
      );
      expect(component.filesAnalyzed).toBe(false);
      expect(component.type).toBe('library');
      expect(component.licenseConcluded).toBe('MIT');
      expect(component.copyrightText).toBe('Copyright JS Foundation');
    });

    it('should parse tag-value with multi-line text fields', () => {
      const tagValue = `
SPDXVersion: SPDX-2.3
DataLicense: CC0-1.0
SPDXID: SPDXRef-DOCUMENT
DocumentName: Test Document
DocumentNamespace: https://example.com/test-doc
Creator: Tool: test-tool-1.0
Created: 2024-01-01T00:00:00Z

PackageName: test-package
SPDXID: SPDXRef-Package1
PackageDownloadLocation: NOASSERTION
FilesAnalyzed: false
PackageDescription: <text>
This is a multi-line
package description
with multiple lines.
</text>
PackageCopyrightText: <text>
Copyright (c) 2024 Test Corp
All rights reserved.
</text>
      `.trim();

      const result = parseSPDXTagValue(tagValue);

      const component = result.components[0];
      expect(component.description).toBe(
        'This is a multi-line\npackage description\nwith multiple lines.'
      );
      expect(component.copyrightText).toBe('Copyright (c) 2024 Test Corp\nAll rights reserved.');
    });

    it('should parse tag-value with checksums and external references', () => {
      const tagValue = `
SPDXVersion: SPDX-2.3
DataLicense: CC0-1.0
SPDXID: SPDXRef-DOCUMENT
DocumentName: Test Document
DocumentNamespace: https://example.com/test-doc
Creator: Tool: test-tool-1.0
Created: 2024-01-01T00:00:00Z

PackageName: express
SPDXID: SPDXRef-Package1
PackageVersion: 4.18.2
PackageDownloadLocation: https://registry.npmjs.org/express/-/express-4.18.2.tgz
FilesAnalyzed: false
PackageChecksum: SHA256: abc123def456
PackageChecksum: SHA1: 789ghi012jkl
ExternalRef: PACKAGE-MANAGER purl pkg:npm/express@4.18.2
ExternalRef: SECURITY cpe23Type cpe:2.3:a:expressjs:express:4.18.2:*:*:*:*:*:*:*
PackageLicenseConcluded: MIT
      `.trim();

      const result = parseSPDXTagValue(tagValue);

      const component = result.components[0];
      expect(component.hashes).toHaveLength(2);
      expect(component.hashes[0].algorithm).toBe('SHA-256');
      expect(component.hashes[0].value).toBe('abc123def456');
      expect(component.hashes[1].algorithm).toBe('SHA-1');
      expect(component.hashes[1].value).toBe('789ghi012jkl');

      expect(component.externalRefs).toHaveLength(2);
      expect(component.externalRefs[0].category).toBe('PACKAGE-MANAGER');
      expect(component.externalRefs[0].type).toBe('purl');
      expect(component.externalRefs[0].locator).toBe('pkg:npm/express@4.18.2');
    });

    it('should parse tag-value with relationships', () => {
      const tagValue = `
SPDXVersion: SPDX-2.3
DataLicense: CC0-1.0
SPDXID: SPDXRef-DOCUMENT
DocumentName: Test Document
DocumentNamespace: https://example.com/test-doc
Creator: Tool: test-tool-1.0
Created: 2024-01-01T00:00:00Z

PackageName: parent-package
SPDXID: SPDXRef-Parent
PackageDownloadLocation: NOASSERTION
FilesAnalyzed: false

PackageName: child-package
SPDXID: SPDXRef-Child
PackageDownloadLocation: NOASSERTION
FilesAnalyzed: false

Relationship: SPDXRef-Parent CONTAINS SPDXRef-Child
      `.trim();

      const result = parseSPDXTagValue(tagValue);

      expect(result.components).toHaveLength(2);
      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0].type).toBe('CONTAINS');

      const childComponent = result.components.find((c) => c.name === 'child-package');
      expect(childComponent?.parentIds).toHaveLength(1);
    });
  });

  describe('parseSPDXYAML', () => {
    it('should parse a minimal SPDX YAML document', () => {
      const yamlContent = `
spdxVersion: SPDX-2.3
dataLicense: CC0-1.0
SPDXID: SPDXRef-DOCUMENT
name: Test Document
documentNamespace: https://example.com/test-doc
creationInfo:
  created: '2024-01-01T00:00:00Z'
  creators:
    - 'Tool: test-tool-1.0'
packages: []
      `.trim();

      const result = parseSPDXYAML(yamlContent);

      expect(result.format).toBe('spdx');
      expect(result.specVersion).toBe('SPDX-2.3');
      expect(result.metadata.name).toBe('Test Document');
      expect(result.metadata.namespace).toBe('https://example.com/test-doc');
      expect(result.metadata.dataLicense).toBe('CC0-1.0');
      expect(result.metadata.created).toBe('2024-01-01T00:00:00Z');
      expect(result.metadata.creators).toHaveLength(1);
    });

    it('should parse YAML document with packages', () => {
      const yamlContent = `
spdxVersion: SPDX-2.3
dataLicense: CC0-1.0
SPDXID: SPDXRef-DOCUMENT
name: Test Document
documentNamespace: https://example.com/test-doc
creationInfo:
  created: '2024-01-01T00:00:00Z'
  creators:
    - 'Tool: test-tool-1.0'
packages:
  - SPDXID: SPDXRef-Package1
    name: lodash
    versionInfo: 4.17.21
    downloadLocation: https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz
    filesAnalyzed: false
    licenseConcluded: MIT
    licenseDeclared: MIT
    copyrightText: Copyright JS Foundation
    primaryPackagePurpose: LIBRARY
      `.trim();

      const result = parseSPDXYAML(yamlContent);

      expect(result.components).toHaveLength(1);
      const component = result.components[0];
      expect(component.name).toBe('lodash');
      expect(component.version).toBe('4.17.21');
      expect(component.type).toBe('library');
      expect(component.spdxId).toBe('SPDXRef-Package1');
      expect(component.licenseConcluded).toBe('MIT');
    });

    it('should parse YAML with checksums and external references', () => {
      const yamlContent = `
spdxVersion: SPDX-2.3
dataLicense: CC0-1.0
SPDXID: SPDXRef-DOCUMENT
name: Test Document
documentNamespace: https://example.com/test-doc
creationInfo:
  created: '2024-01-01T00:00:00Z'
  creators:
    - 'Tool: test-tool-1.0'
packages:
  - SPDXID: SPDXRef-Package1
    name: express
    versionInfo: 4.18.2
    downloadLocation: https://registry.npmjs.org/express/-/express-4.18.2.tgz
    filesAnalyzed: false
    checksums:
      - algorithm: SHA256
        checksumValue: abc123def456
      - algorithm: SHA1
        checksumValue: 789ghi012jkl
    externalRefs:
      - referenceCategory: PACKAGE-MANAGER
        referenceType: purl
        referenceLocator: pkg:npm/express@4.18.2
      - referenceCategory: SECURITY
        referenceType: cpe23Type
        referenceLocator: 'cpe:2.3:a:expressjs:express:4.18.2:*:*:*:*:*:*:*'
    licenseConcluded: MIT
    supplier: 'Organization: Express Team (team@expressjs.com)'
      `.trim();

      const result = parseSPDXYAML(yamlContent);

      const component = result.components[0];
      expect(component.hashes).toHaveLength(2);
      expect(component.hashes[0].algorithm).toBe('SHA-256');
      expect(component.hashes[1].algorithm).toBe('SHA-1');

      expect(component.externalRefs).toHaveLength(2);
      expect(component.externalRefs[0].category).toBe('PACKAGE-MANAGER');
      expect(component.externalRefs[1].category).toBe('SECURITY');

      expect(component.supplier?.name).toBe('Express Team');
      expect(component.supplier?.email).toBe('team@expressjs.com');
    });

    it('should parse YAML with relationships', () => {
      const yamlContent = `
spdxVersion: SPDX-2.3
dataLicense: CC0-1.0
SPDXID: SPDXRef-DOCUMENT
name: Test Document
documentNamespace: https://example.com/test-doc
creationInfo:
  created: '2024-01-01T00:00:00Z'
  creators:
    - 'Tool: test-tool-1.0'
packages:
  - SPDXID: SPDXRef-Parent
    name: parent-package
    downloadLocation: NOASSERTION
    filesAnalyzed: false
  - SPDXID: SPDXRef-Child
    name: child-package
    downloadLocation: NOASSERTION
    filesAnalyzed: false
relationships:
  - spdxElementId: SPDXRef-Parent
    relationshipType: CONTAINS
    relatedSpdxElement: SPDXRef-Child
      `.trim();

      const result = parseSPDXYAML(yamlContent);

      expect(result.components).toHaveLength(2);
      expect(result.relationships).toHaveLength(1);

      const childComponent = result.components.find((c) => c.name === 'child-package');
      expect(childComponent?.parentIds).toHaveLength(1);
    });

    it('should throw error for invalid YAML', () => {
      const invalidYaml = `
spdxVersion: SPDX-2.3
  - invalid: structure
    - nested: badly
      `.trim();

      expect(() => parseSPDXYAML(invalidYaml)).toThrow('Failed to parse SPDX YAML');
    });
  });
});
