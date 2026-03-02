/**
 * CycloneDX パーサーの単体テスト
 */

import { describe, it, expect } from '@jest/globals';
import { parseCycloneDXJSON, parseCycloneDXXML } from './cyclonedxParser';

describe('CycloneDX Parser', () => {
  describe('parseCycloneDXJSON', () => {
    it('should parse a minimal CycloneDX JSON document', () => {
      const cdxJson = JSON.stringify({
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        serialNumber: 'urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79',
        version: 1,
        metadata: {
          timestamp: '2024-01-01T00:00:00Z',
          tools: [
            {
              vendor: 'Test Vendor',
              name: 'test-tool',
              version: '1.0.0',
            },
          ],
        },
        components: [],
      });

      const result = parseCycloneDXJSON(cdxJson);

      expect(result.format).toBe('cyclonedx');
      expect(result.specVersion).toBe('1.4');
      expect(result.metadata.serialNumber).toBe('urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79');
      expect(result.metadata.bomVersion).toBe(1);
      expect(result.metadata.created).toBe('2024-01-01T00:00:00Z');
      expect(result.metadata.creators).toHaveLength(1);
      expect(result.metadata.creators[0].type).toBe('tool');
      expect(result.metadata.creators[0].name).toBe('Test Vendor test-tool');
      expect(result.metadata.creators[0].version).toBe('1.0.0');
      expect(result.components).toHaveLength(0);
    });

    it('should parse CycloneDX document with components', () => {
      const cdxJson = JSON.stringify({
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        serialNumber: 'urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79',
        version: 1,
        metadata: {
          timestamp: '2024-01-01T00:00:00Z',
          tools: [{ name: 'test-tool', version: '1.0.0' }],
        },
        components: [
          {
            type: 'library',
            'bom-ref': 'pkg:npm/lodash@4.17.21',
            name: 'lodash',
            version: '4.17.21',
            purl: 'pkg:npm/lodash@4.17.21',
            licenses: [
              {
                license: {
                  id: 'MIT',
                },
              },
            ],
            hashes: [
              {
                alg: 'SHA-256',
                content: 'abc123def456',
              },
            ],
          },
        ],
      });

      const result = parseCycloneDXJSON(cdxJson);

      expect(result.components).toHaveLength(1);
      const component = result.components[0];
      expect(component.name).toBe('lodash');
      expect(component.version).toBe('4.17.21');
      expect(component.type).toBe('library');
      expect(component.bomRef).toBe('pkg:npm/lodash@4.17.21');
      expect(component.purl).toBe('pkg:npm/lodash@4.17.21');
      expect(component.licenses).toHaveLength(1);
      expect(component.licenses[0].licenseId).toBe('MIT');
      expect(component.hashes).toHaveLength(1);
      expect(component.hashes[0].algorithm).toBe('SHA-256');
      expect(component.hashes[0].value).toBe('abc123def456');
    });

    it('should parse multiple creators (tools and authors)', () => {
      const cdxJson = JSON.stringify({
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        serialNumber: 'urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79',
        version: 1,
        metadata: {
          timestamp: '2024-01-01T00:00:00Z',
          tools: [
            { vendor: 'ACME', name: 'scanner', version: '2.5.1' },
            { name: 'analyzer', version: '1.2.0' },
          ],
          authors: [
            { name: 'John Doe', email: 'john@example.com' },
            { name: 'Jane Smith', email: 'jane@example.com' },
          ],
        },
        components: [],
      });

      const result = parseCycloneDXJSON(cdxJson);

      expect(result.metadata.creators).toHaveLength(4);
      expect(result.metadata.creators[0].type).toBe('tool');
      expect(result.metadata.creators[0].name).toBe('ACME scanner');
      expect(result.metadata.creators[0].version).toBe('2.5.1');
      expect(result.metadata.creators[1].type).toBe('tool');
      expect(result.metadata.creators[1].name).toBe('analyzer');
      expect(result.metadata.creators[2].type).toBe('person');
      expect(result.metadata.creators[2].name).toBe('John Doe');
      expect(result.metadata.creators[2].email).toBe('john@example.com');
      expect(result.metadata.creators[3].type).toBe('person');
      expect(result.metadata.creators[3].name).toBe('Jane Smith');
    });

    it('should handle component with external references and supplier', () => {
      const cdxJson = JSON.stringify({
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        serialNumber: 'urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79',
        version: 1,
        metadata: {
          timestamp: '2024-01-01T00:00:00Z',
          tools: [{ name: 'test-tool', version: '1.0.0' }],
        },
        components: [
          {
            type: 'library',
            'bom-ref': 'pkg:npm/express@4.18.2',
            name: 'express',
            version: '4.18.2',
            group: 'expressjs',
            purl: 'pkg:npm/express@4.18.2',
            cpe: 'cpe:2.3:a:expressjs:express:4.18.2:*:*:*:*:*:*:*',
            description: 'Fast, unopinionated, minimalist web framework',
            supplier: {
              name: 'Express Team',
              url: ['https://expressjs.com'],
              contact: [{ name: 'Support', email: 'team@expressjs.com' }],
            },
            externalReferences: [
              {
                type: 'website',
                url: 'https://expressjs.com',
              },
              {
                type: 'vcs',
                url: 'https://github.com/expressjs/express',
              },
            ],
            licenses: [{ license: { id: 'MIT' } }],
          },
        ],
      });

      const result = parseCycloneDXJSON(cdxJson);

      const component = result.components[0];
      expect(component.name).toBe('express');
      expect(component.group).toBe('expressjs');
      expect(component.purl).toBe('pkg:npm/express@4.18.2');
      expect(component.cpe).toBe('cpe:2.3:a:expressjs:express:4.18.2:*:*:*:*:*:*:*');
      expect(component.description).toBe('Fast, unopinionated, minimalist web framework');
      expect(component.supplier).toBeDefined();
      expect(component.supplier?.name).toBe('Express Team');
      expect(component.supplier?.email).toBe('team@expressjs.com');
      expect(component.supplier?.url).toEqual(['https://expressjs.com']);
      expect(component.externalRefs).toHaveLength(2);
      expect(component.externalRefs[0].type).toBe('website');
      expect(component.externalRefs[0].locator).toBe('https://expressjs.com');
    });

    it('should handle dependencies and set parent-child relationships', () => {
      const cdxJson = JSON.stringify({
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        serialNumber: 'urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79',
        version: 1,
        metadata: {
          timestamp: '2024-01-01T00:00:00Z',
          tools: [{ name: 'test-tool', version: '1.0.0' }],
        },
        components: [
          {
            type: 'library',
            'bom-ref': 'pkg:npm/parent@1.0.0',
            name: 'parent-package',
            version: '1.0.0',
          },
          {
            type: 'library',
            'bom-ref': 'pkg:npm/child@1.0.0',
            name: 'child-package',
            version: '1.0.0',
          },
        ],
        dependencies: [
          {
            ref: 'pkg:npm/child@1.0.0',
            dependsOn: ['pkg:npm/parent@1.0.0'],
          },
        ],
      });

      const result = parseCycloneDXJSON(cdxJson);

      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0].type).toBe('dependsOn');

      const childComponent = result.components.find((c) => c.name === 'child-package');
      expect(childComponent).toBeDefined();
      expect(childComponent?.parentIds).toHaveLength(1);

      const parentComponent = result.components.find((c) => c.name === 'parent-package');
      expect(parentComponent).toBeDefined();
      expect(childComponent?.parentIds[0]).toBe(parentComponent?.id);
    });

    it('should normalize component types correctly', () => {
      const types = [
        { cdxType: 'application', expectedType: 'application' },
        { cdxType: 'framework', expectedType: 'framework' },
        { cdxType: 'library', expectedType: 'library' },
        { cdxType: 'container', expectedType: 'container' },
        { cdxType: 'operating-system', expectedType: 'operating-system' },
        { cdxType: 'device', expectedType: 'device' },
        { cdxType: 'firmware', expectedType: 'firmware' },
        { cdxType: 'file', expectedType: 'file' },
        { cdxType: 'other', expectedType: 'other' },
        { cdxType: undefined, expectedType: 'library' },
        { cdxType: 'INVALID', expectedType: 'library' },
      ];

      types.forEach(({ cdxType, expectedType }) => {
        const cdxJson = JSON.stringify({
          bomFormat: 'CycloneDX',
          specVersion: '1.4',
          serialNumber: 'urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79',
          version: 1,
          metadata: {
            timestamp: '2024-01-01T00:00:00Z',
            tools: [{ name: 'test-tool', version: '1.0.0' }],
          },
          components: [
            {
              type: cdxType,
              'bom-ref': 'test-ref',
              name: 'test-component',
            },
          ],
        });

        const result = parseCycloneDXJSON(cdxJson);
        expect(result.components[0].type).toBe(expectedType);
      });
    });

    it('should handle license expressions and multiple licenses', () => {
      const cdxJson = JSON.stringify({
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        serialNumber: 'urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79',
        version: 1,
        metadata: {
          timestamp: '2024-01-01T00:00:00Z',
          tools: [{ name: 'test-tool', version: '1.0.0' }],
        },
        components: [
          {
            type: 'library',
            'bom-ref': 'dual-license',
            name: 'dual-license-package',
            licenses: [
              {
                expression: 'MIT OR Apache-2.0',
              },
            ],
          },
          {
            type: 'library',
            'bom-ref': 'custom-license',
            name: 'custom-license-package',
            licenses: [
              {
                license: {
                  name: 'Custom License',
                  url: 'https://example.com/license',
                  text: {
                    content: 'License text here',
                  },
                },
              },
            ],
          },
          {
            type: 'library',
            'bom-ref': 'no-license',
            name: 'no-license-package',
          },
        ],
      });

      const result = parseCycloneDXJSON(cdxJson);

      const dualLicenseComponent = result.components[0];
      expect(dualLicenseComponent.licenses).toHaveLength(1);
      expect(dualLicenseComponent.licenses[0].expression).toBe('MIT OR Apache-2.0');
      expect(dualLicenseComponent.licenses[0].licenseId).toBeUndefined();

      const customLicenseComponent = result.components[1];
      expect(customLicenseComponent.licenses).toHaveLength(1);
      expect(customLicenseComponent.licenses[0].licenseName).toBe('Custom License');
      expect(customLicenseComponent.licenses[0].url).toBe('https://example.com/license');
      expect(customLicenseComponent.licenses[0].text).toBe('License text here');

      const noLicenseComponent = result.components[2];
      expect(noLicenseComponent.licenses).toHaveLength(1);
      expect(noLicenseComponent.licenses[0].category).toBe('unknown');
    });

    it('should handle hash algorithms correctly', () => {
      const cdxJson = JSON.stringify({
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        serialNumber: 'urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79',
        version: 1,
        metadata: {
          timestamp: '2024-01-01T00:00:00Z',
          tools: [{ name: 'test-tool', version: '1.0.0' }],
        },
        components: [
          {
            type: 'library',
            'bom-ref': 'test-ref',
            name: 'test-component',
            hashes: [
              { alg: 'MD5', content: 'md5hash' },
              { alg: 'SHA-1', content: 'sha1hash' },
              { alg: 'SHA-256', content: 'sha256hash' },
              { alg: 'SHA1', content: 'sha1hash2' },
              { alg: 'SHA256', content: 'sha256hash2' },
              { alg: 'INVALID', content: 'invalidhash' },
            ],
          },
        ],
      });

      const result = parseCycloneDXJSON(cdxJson);

      const component = result.components[0];
      expect(component.hashes).toHaveLength(5);
      expect(component.hashes[0].algorithm).toBe('MD5');
      expect(component.hashes[1].algorithm).toBe('SHA-1');
      expect(component.hashes[2].algorithm).toBe('SHA-256');
      expect(component.hashes[3].algorithm).toBe('SHA-1');
      expect(component.hashes[4].algorithm).toBe('SHA-256');
    });

    it('should handle properties (cdxProperties)', () => {
      const cdxJson = JSON.stringify({
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        serialNumber: 'urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79',
        version: 1,
        metadata: {
          timestamp: '2024-01-01T00:00:00Z',
          tools: [{ name: 'test-tool', version: '1.0.0' }],
          properties: [
            { name: 'internal:project', value: 'test-project' },
            { name: 'internal:team', value: 'platform' },
          ],
        },
        components: [
          {
            type: 'library',
            'bom-ref': 'test-ref',
            name: 'test-component',
            properties: [
              { name: 'custom:attr1', value: 'value1' },
              { name: 'custom:attr2', value: 'value2' },
            ],
          },
        ],
      });

      const result = parseCycloneDXJSON(cdxJson);

      expect(result.metadata.properties).toHaveLength(2);
      expect(result.metadata.properties?.[0].name).toBe('internal:project');
      expect(result.metadata.properties?.[0].value).toBe('test-project');
      expect(result.metadata.properties?.[0].valueType).toBe('string');

      const component = result.components[0];
      expect(component.cdxProperties).toHaveLength(2);
      expect(component.cdxProperties?.[0].name).toBe('custom:attr1');
      expect(component.cdxProperties?.[0].value).toBe('value1');
      expect(component.customAttributes).toHaveLength(0);
    });

    it('should handle component scope', () => {
      const cdxJson = JSON.stringify({
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        serialNumber: 'urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79',
        version: 1,
        metadata: {
          timestamp: '2024-01-01T00:00:00Z',
          tools: [{ name: 'test-tool', version: '1.0.0' }],
        },
        components: [
          {
            type: 'library',
            'bom-ref': 'required-ref',
            name: 'required-component',
            scope: 'required',
          },
          {
            type: 'library',
            'bom-ref': 'optional-ref',
            name: 'optional-component',
            scope: 'optional',
          },
          {
            type: 'library',
            'bom-ref': 'excluded-ref',
            name: 'excluded-component',
            scope: 'excluded',
          },
        ],
      });

      const result = parseCycloneDXJSON(cdxJson);

      expect(result.components[0].scope).toBe('required');
      expect(result.components[1].scope).toBe('optional');
      expect(result.components[2].scope).toBe('excluded');
    });

    it('should handle metadata component and supplier', () => {
      const cdxJson = JSON.stringify({
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        serialNumber: 'urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79',
        version: 1,
        metadata: {
          timestamp: '2024-01-01T00:00:00Z',
          tools: [{ name: 'test-tool', version: '1.0.0' }],
          component: {
            type: 'application',
            name: 'My Application',
            version: '1.0.0',
          },
          supplier: {
            name: 'ACME Corp',
            url: ['https://acme.com', 'https://acme.org'],
            contact: [{ name: 'Support', email: 'support@acme.com', phone: '+1-555-1234' }],
          },
        },
        components: [],
      });

      const result = parseCycloneDXJSON(cdxJson);

      expect(result.metadata.name).toBe('My Application');
      expect(result.metadata.supplier).toBeDefined();
      expect(result.metadata.supplier?.name).toBe('ACME Corp');
      expect(result.metadata.supplier?.url).toEqual(['https://acme.com', 'https://acme.org']);
      expect(result.metadata.supplier?.email).toBe('support@acme.com');
    });

    it('should handle BOM-level licenses', () => {
      const cdxJson = JSON.stringify({
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        serialNumber: 'urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79',
        version: 1,
        metadata: {
          timestamp: '2024-01-01T00:00:00Z',
          tools: [{ name: 'test-tool', version: '1.0.0' }],
          licenses: [{ license: { id: 'CC0-1.0' } }, { expression: 'MIT OR Apache-2.0' }],
        },
        components: [],
      });

      const result = parseCycloneDXJSON(cdxJson);

      expect(result.metadata.licenses).toHaveLength(2);
      expect(result.metadata.licenses?.[0].licenseId).toBe('CC0-1.0');
      expect(result.metadata.licenses?.[1].expression).toBe('MIT OR Apache-2.0');
    });
  });

  describe('parseCycloneDXXML', () => {
    it('should parse a minimal CycloneDX XML document', () => {
      const cdxXml = `<?xml version="1.0" encoding="UTF-8"?>
<bom xmlns="http://cyclonedx.org/schema/bom/1.4" version="1" serialNumber="urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79">
  <metadata>
    <timestamp>2024-01-01T00:00:00Z</timestamp>
    <tools>
      <tool>
        <vendor>Test Vendor</vendor>
        <name>test-tool</name>
        <version>1.0.0</version>
      </tool>
    </tools>
  </metadata>
  <components>
  </components>
</bom>`;

      const result = parseCycloneDXXML(cdxXml);

      expect(result.format).toBe('cyclonedx');
      expect(result.metadata.serialNumber).toBe('urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79');
      expect(result.metadata.created).toBe('2024-01-01T00:00:00Z');
      expect(result.metadata.creators).toHaveLength(1);
      expect(result.metadata.creators[0].type).toBe('tool');
      expect(result.metadata.creators[0].name).toBe('Test Vendor test-tool');
      expect(result.components).toHaveLength(0);
    });

    it('should parse XML document with components', () => {
      const cdxXml = `<?xml version="1.0" encoding="UTF-8"?>
<bom xmlns="http://cyclonedx.org/schema/bom/1.4" version="1" serialNumber="urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79">
  <metadata>
    <timestamp>2024-01-01T00:00:00Z</timestamp>
    <tools>
      <tool>
        <name>test-tool</name>
        <version>1.0.0</version>
      </tool>
    </tools>
  </metadata>
  <components>
    <component type="library" bom-ref="pkg:npm/lodash@4.17.21">
      <name>lodash</name>
      <version>4.17.21</version>
      <purl>pkg:npm/lodash@4.17.21</purl>
      <licenses>
        <license>
          <id>MIT</id>
        </license>
      </licenses>
      <hashes>
        <hash alg="SHA-256">abc123def456</hash>
      </hashes>
    </component>
  </components>
</bom>`;

      const result = parseCycloneDXXML(cdxXml);

      expect(result.components).toHaveLength(1);
      const component = result.components[0];
      expect(component.name).toBe('lodash');
      expect(component.version).toBe('4.17.21');
      expect(component.type).toBe('library');
      expect(component.bomRef).toBe('pkg:npm/lodash@4.17.21');
      expect(component.purl).toBe('pkg:npm/lodash@4.17.21');
      expect(component.licenses).toHaveLength(1);
      expect(component.licenses[0].licenseId).toBe('MIT');
      expect(component.hashes).toHaveLength(1);
      expect(component.hashes[0].algorithm).toBe('SHA-256');
    });

    it('should parse XML with authors and multiple tools', () => {
      const cdxXml = `<?xml version="1.0" encoding="UTF-8"?>
<bom xmlns="http://cyclonedx.org/schema/bom/1.4" version="1" serialNumber="urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79">
  <metadata>
    <timestamp>2024-01-01T00:00:00Z</timestamp>
    <tools>
      <tool>
        <vendor>ACME</vendor>
        <name>scanner</name>
        <version>2.5.1</version>
      </tool>
      <tool>
        <name>analyzer</name>
        <version>1.2.0</version>
      </tool>
    </tools>
    <authors>
      <author>
        <name>John Doe</name>
        <email>john@example.com</email>
      </author>
      <author>
        <name>Jane Smith</name>
        <email>jane@example.com</email>
      </author>
    </authors>
  </metadata>
  <components>
  </components>
</bom>`;

      const result = parseCycloneDXXML(cdxXml);

      expect(result.metadata.creators).toHaveLength(4);
      expect(result.metadata.creators[0].type).toBe('tool');
      expect(result.metadata.creators[0].name).toBe('ACME scanner');
      expect(result.metadata.creators[1].name).toBe('analyzer');
      expect(result.metadata.creators[2].type).toBe('person');
      expect(result.metadata.creators[2].name).toBe('John Doe');
      expect(result.metadata.creators[3].name).toBe('Jane Smith');
    });

    it('should parse XML with component details', () => {
      const cdxXml = `<?xml version="1.0" encoding="UTF-8"?>
<bom xmlns="http://cyclonedx.org/schema/bom/1.4" version="1" serialNumber="urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79">
  <metadata>
    <timestamp>2024-01-01T00:00:00Z</timestamp>
    <tools>
      <tool>
        <name>test-tool</name>
        <version>1.0.0</version>
      </tool>
    </tools>
  </metadata>
  <components>
    <component type="library" bom-ref="pkg:npm/express@4.18.2">
      <name>express</name>
      <version>4.18.2</version>
      <group>expressjs</group>
      <purl>pkg:npm/express@4.18.2</purl>
      <cpe>cpe:2.3:a:expressjs:express:4.18.2:*:*:*:*:*:*:*</cpe>
      <description>Fast, unopinionated, minimalist web framework</description>
      <scope>required</scope>
      <author>TJ Holowaychuk</author>
      <publisher>Express Team</publisher>
      <copyright>Copyright (c) 2009-2014 TJ Holowaychuk</copyright>
      <supplier>
        <name>Express Team</name>
        <url>https://expressjs.com</url>
        <contact>
          <name>Support</name>
          <email>team@expressjs.com</email>
        </contact>
      </supplier>
      <licenses>
        <license>
          <id>MIT</id>
        </license>
      </licenses>
      <hashes>
        <hash alg="SHA-256">abc123def456</hash>
        <hash alg="SHA-1">789ghi012jkl</hash>
      </hashes>
      <externalReferences>
        <reference type="website">
          <url>https://expressjs.com</url>
        </reference>
        <reference type="vcs">
          <url>https://github.com/expressjs/express</url>
        </reference>
      </externalReferences>
      <properties>
        <property name="custom:attr1">value1</property>
        <property name="custom:attr2">value2</property>
      </properties>
    </component>
  </components>
</bom>`;

      const result = parseCycloneDXXML(cdxXml);

      const component = result.components[0];
      expect(component.name).toBe('express');
      expect(component.version).toBe('4.18.2');
      expect(component.group).toBe('expressjs');
      expect(component.purl).toBe('pkg:npm/express@4.18.2');
      expect(component.cpe).toBe('cpe:2.3:a:expressjs:express:4.18.2:*:*:*:*:*:*:*');
      expect(component.description).toBe('Fast, unopinionated, minimalist web framework');
      expect(component.scope).toBe('required');
      expect(component.author).toBe('TJ Holowaychuk');
      expect(component.publisher).toBe('Express Team');
      expect(component.copyrightText).toBe('Copyright (c) 2009-2014 TJ Holowaychuk');
      expect(component.supplier?.name).toBe('Express Team');
      expect(component.supplier?.email).toBe('team@expressjs.com');
      expect(component.hashes).toHaveLength(2);
      expect(component.externalRefs).toHaveLength(2);
      expect(component.cdxProperties).toHaveLength(2);
    });

    it('should parse XML with license expressions', () => {
      const cdxXml = `<?xml version="1.0" encoding="UTF-8"?>
<bom xmlns="http://cyclonedx.org/schema/bom/1.4" version="1" serialNumber="urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79">
  <metadata>
    <timestamp>2024-01-01T00:00:00Z</timestamp>
    <tools>
      <tool>
        <name>test-tool</name>
        <version>1.0.0</version>
      </tool>
    </tools>
  </metadata>
  <components>
    <component type="library" bom-ref="dual-license">
      <name>dual-license-package</name>
      <licenses>
        <license>
          <expression>MIT OR Apache-2.0</expression>
        </license>
      </licenses>
    </component>
    <component type="library" bom-ref="custom-license">
      <name>custom-license-package</name>
      <licenses>
        <license>
          <name>Custom License</name>
          <url>https://example.com/license</url>
        </license>
      </licenses>
    </component>
  </components>
</bom>`;

      const result = parseCycloneDXXML(cdxXml);

      expect(result.components[0].licenses[0].expression).toBe('MIT OR Apache-2.0');
      expect(result.components[1].licenses[0].licenseName).toBe('Custom License');
      expect(result.components[1].licenses[0].url).toBe('https://example.com/license');
    });

    it('should parse XML with dependencies', () => {
      const cdxXml = `<?xml version="1.0" encoding="UTF-8"?>
<bom xmlns="http://cyclonedx.org/schema/bom/1.4" version="1" serialNumber="urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79">
  <metadata>
    <timestamp>2024-01-01T00:00:00Z</timestamp>
    <tools>
      <tool>
        <name>test-tool</name>
        <version>1.0.0</version>
      </tool>
    </tools>
  </metadata>
  <components>
    <component type="library" bom-ref="pkg:npm/parent@1.0.0">
      <name>parent-package</name>
      <version>1.0.0</version>
    </component>
    <component type="library" bom-ref="pkg:npm/child@1.0.0">
      <name>child-package</name>
      <version>1.0.0</version>
    </component>
  </components>
  <dependencies>
    <dependency ref="pkg:npm/child@1.0.0">
      <dependency ref="pkg:npm/parent@1.0.0"/>
    </dependency>
  </dependencies>
</bom>`;

      const result = parseCycloneDXXML(cdxXml);

      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0].type).toBe('dependsOn');

      const childComponent = result.components.find((c) => c.name === 'child-package');
      expect(childComponent?.parentIds).toHaveLength(1);
    });

    it('should parse XML with metadata component and supplier', () => {
      const cdxXml = `<?xml version="1.0" encoding="UTF-8"?>
<bom xmlns="http://cyclonedx.org/schema/bom/1.4" version="1" serialNumber="urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79">
  <metadata>
    <timestamp>2024-01-01T00:00:00Z</timestamp>
    <tools>
      <tool>
        <name>test-tool</name>
        <version>1.0.0</version>
      </tool>
    </tools>
    <component type="application">
      <name>My Application</name>
      <version>1.0.0</version>
    </component>
    <supplier>
      <name>ACME Corp</name>
      <url>https://acme.com</url>
      <url>https://acme.org</url>
      <contact>
        <name>Support</name>
        <email>support@acme.com</email>
      </contact>
    </supplier>
  </metadata>
  <components>
  </components>
</bom>`;

      const result = parseCycloneDXXML(cdxXml);

      expect(result.metadata.name).toBe('My Application');
      expect(result.metadata.supplier?.name).toBe('ACME Corp');
      expect(result.metadata.supplier?.url).toEqual(['https://acme.com', 'https://acme.org']);
      expect(result.metadata.supplier?.email).toBe('support@acme.com');
    });

    it('should parse XML with metadata properties and licenses', () => {
      const cdxXml = `<?xml version="1.0" encoding="UTF-8"?>
<bom xmlns="http://cyclonedx.org/schema/bom/1.4" version="1" serialNumber="urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79">
  <metadata>
    <timestamp>2024-01-01T00:00:00Z</timestamp>
    <tools>
      <tool>
        <name>test-tool</name>
        <version>1.0.0</version>
      </tool>
    </tools>
    <licenses>
      <license>
        <id>CC0-1.0</id>
      </license>
    </licenses>
    <properties>
      <property name="internal:project">test-project</property>
      <property name="internal:team">platform</property>
    </properties>
  </metadata>
  <components>
  </components>
</bom>`;

      const result = parseCycloneDXXML(cdxXml);

      expect(result.metadata.licenses).toHaveLength(1);
      expect(result.metadata.licenses?.[0].licenseId).toBe('CC0-1.0');
      expect(result.metadata.properties).toHaveLength(2);
      expect(result.metadata.properties?.[0].name).toBe('internal:project');
      expect(result.metadata.properties?.[0].value).toBe('test-project');
    });

    it('should throw error for invalid XML', () => {
      const invalidXml = `<?xml version="1.0" encoding="UTF-8"?>
<bom xmlns="http://cyclonedx.org/schema/bom/1.4">
  <metadata>
    <timestamp>2024-01-01T00:00:00Z</timestamp>
    <tools>
      <tool>
        <name>test-tool</name>
      </tool>
    <!-- Missing closing tag -->
  </metadata>
</bom>`;

      expect(() => parseCycloneDXXML(invalidXml)).toThrow('XML parse error');
    });
  });
});
