import { detectFormat } from './formatDetector';

describe('formatDetector', () => {
  describe('detectFormat', () => {
    describe('CycloneDX detection', () => {
      it('should detect CycloneDX JSON format', () => {
        const cyclonedxData = {
          bomFormat: 'CycloneDX',
          specVersion: '1.4',
          version: 1,
          components: [],
        };

        const result = detectFormat(cyclonedxData);

        expect(result.format).toBe('cyclonedx');
        expect(result.specVersion).toBe('1.4');
      });

      it('should detect CycloneDX without specVersion', () => {
        const cyclonedxData = {
          bomFormat: 'CycloneDX',
          components: [],
        };

        const result = detectFormat(cyclonedxData);

        expect(result.format).toBe('cyclonedx');
        expect(result.specVersion).toBeUndefined();
      });

      it('should detect CycloneDX from JSON string', () => {
        const jsonString = JSON.stringify({
          bomFormat: 'CycloneDX',
          specVersion: '1.4',
        });

        const result = detectFormat(jsonString);

        expect(result.format).toBe('cyclonedx');
        expect(result.specVersion).toBe('1.4');
      });
    });

    describe('SPDX detection', () => {
      it('should detect SPDX JSON format with SPDXVersion', () => {
        const spdxData = {
          SPDXVersion: 'SPDX-2.3',
          dataLicense: 'CC0-1.0',
          SPDXID: 'SPDXRef-DOCUMENT',
          name: 'Test Document',
        };

        const result = detectFormat(spdxData);

        expect(result.format).toBe('spdx');
        expect(result.specVersion).toBe('SPDX-2.3');
      });

      it('should detect SPDX JSON format with lowercase spdxVersion', () => {
        const spdxData = {
          spdxVersion: 'SPDX-2.3',
          dataLicense: 'CC0-1.0',
        };

        const result = detectFormat(spdxData);

        expect(result.format).toBe('spdx');
        expect(result.specVersion).toBe('SPDX-2.3');
      });

      it('should detect SPDX tag-value format', () => {
        const tagValueContent = `SPDXVersion: SPDX-2.3
DataLicense: CC0-1.0
SPDXID: SPDXRef-DOCUMENT
DocumentName: Test Document
DocumentNamespace: https://example.com/test
Creator: Tool: test-tool`;

        const result = detectFormat(tagValueContent);

        expect(result.format).toBe('spdx');
        expect(result.specVersion).toBe('SPDX-2.3');
      });

      it('should detect SPDX tag-value format with SPDXID', () => {
        const tagValueContent = `SPDXID: SPDXRef-DOCUMENT
SPDXVersion: SPDX-2.2`;

        const result = detectFormat(tagValueContent);

        expect(result.format).toBe('spdx');
        expect(result.specVersion).toBe('SPDX-2.2');
      });

      it('should detect SPDX from JSON string', () => {
        const jsonString = JSON.stringify({
          SPDXVersion: 'SPDX-2.3',
          SPDXID: 'SPDXRef-DOCUMENT',
        });

        const result = detectFormat(jsonString);

        expect(result.format).toBe('spdx');
        expect(result.specVersion).toBe('SPDX-2.3');
      });
    });

    describe('unknown format detection', () => {
      it('should return unknown for empty object', () => {
        const result = detectFormat({});

        expect(result.format).toBe('unknown');
        expect(result.specVersion).toBeUndefined();
      });

      it('should return unknown for null', () => {
        const result = detectFormat(null);

        expect(result.format).toBe('unknown');
      });

      it('should return unknown for undefined', () => {
        const result = detectFormat(undefined);

        expect(result.format).toBe('unknown');
      });

      it('should return unknown for invalid JSON string', () => {
        const result = detectFormat('not a valid json or sbom');

        expect(result.format).toBe('unknown');
      });

      it('should return unknown for object without format indicators', () => {
        const data = {
          name: 'Some Document',
          version: '1.0',
          components: [],
        };

        const result = detectFormat(data);

        expect(result.format).toBe('unknown');
      });

      it('should return unknown for non-CycloneDX bomFormat value', () => {
        const data = {
          bomFormat: 'SomeOtherFormat',
          specVersion: '1.0',
        };

        const result = detectFormat(data);

        expect(result.format).toBe('unknown');
      });
    });

    describe('edge cases', () => {
      it('should handle object with both SPDX and CycloneDX fields (CycloneDX takes precedence)', () => {
        const data = {
          bomFormat: 'CycloneDX',
          specVersion: '1.4',
          SPDXVersion: 'SPDX-2.3',
        };

        const result = detectFormat(data);

        expect(result.format).toBe('cyclonedx');
        expect(result.specVersion).toBe('1.4');
      });

      it('should handle malformed JSON string gracefully', () => {
        const malformedJson = '{ "bomFormat": "CycloneDX", invalid }';

        const result = detectFormat(malformedJson);

        expect(result.format).toBe('unknown');
      });

      it('should handle number input', () => {
        const result = detectFormat(123 as unknown);

        expect(result.format).toBe('unknown');
      });

      it('should handle array input', () => {
        const result = detectFormat([{ bomFormat: 'CycloneDX' }] as unknown);

        expect(result.format).toBe('unknown');
      });
    });
  });
});
