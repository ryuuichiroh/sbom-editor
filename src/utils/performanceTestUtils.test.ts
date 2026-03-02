/**
 * パフォーマンステストユーティリティのテスト
 */

import {
  generateLargeSBOM,
  measureRenderTime,
  runPerformanceBenchmark,
} from './performanceTestUtils';

describe('performanceTestUtils', () => {
  // console.warn をモックしてテストログを抑制
  beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {
      // テスト中は console.warn を無視
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('generateLargeSBOM', () => {
    it('指定した数のコンポーネントを生成する', () => {
      const sbom = generateLargeSBOM(100, 'cyclonedx', false);
      expect(sbom.components).toHaveLength(100);
    });

    it('CycloneDX フォーマットで生成する', () => {
      const sbom = generateLargeSBOM(10, 'cyclonedx', false);
      expect(sbom.format).toBe('cyclonedx');
      expect(sbom.specVersion).toBe('1.4');
      expect(sbom.components[0].bomRef).toBeDefined();
      expect(sbom.components[0].purl).toBeDefined();
    });

    it('SPDX フォーマットで生成する', () => {
      const sbom = generateLargeSBOM(10, 'spdx', false);
      expect(sbom.format).toBe('spdx');
      expect(sbom.specVersion).toBe('SPDX-2.3');
      expect(sbom.components[0].spdxId).toBeDefined();
      expect(sbom.components[0].downloadLocation).toBeDefined();
    });

    it('親子階層を生成する', () => {
      const sbom = generateLargeSBOM(100, 'cyclonedx', true);

      // 最初の10%はルート（親なし）
      const rootCount = Math.floor(100 * 0.1);
      const rootComponents = sbom.components.slice(0, rootCount);
      rootComponents.forEach((component) => {
        expect(component.parentIds).toHaveLength(0);
      });

      // 残りは子（親あり）
      const childComponents = sbom.components.slice(rootCount);
      childComponents.forEach((component) => {
        expect(component.parentIds.length).toBeGreaterThan(0);
      });
    });

    it('フラット構造を生成する', () => {
      const sbom = generateLargeSBOM(50, 'cyclonedx', false);
      sbom.components.forEach((component) => {
        expect(component.parentIds).toHaveLength(0);
      });
    });

    it('各コンポーネントに必須フィールドが含まれる', () => {
      const sbom = generateLargeSBOM(10, 'cyclonedx', false);
      sbom.components.forEach((component) => {
        expect(component.id).toBeDefined();
        expect(component.name).toBeDefined();
        expect(component.version).toBeDefined();
        expect(component.type).toBeDefined();
        expect(component.licenses).toHaveLength(1);
        expect(component.hashes).toHaveLength(1);
      });
    });
  });

  describe('measureRenderTime', () => {
    it('処理時間を測定する', () => {
      const renderTime = measureRenderTime(() => {
        // 軽い処理
        let _sum = 0;
        for (let i = 0; i < 1000; i++) {
          _sum += i;
        }
      });

      expect(renderTime).toBeGreaterThanOrEqual(0);
      expect(renderTime).toBeLessThan(100); // 100ms 未満であるべき
    });
  });

  describe('runPerformanceBenchmark', () => {
    it('複数のコンポーネント数でベンチマークを実行する', () => {
      const results = runPerformanceBenchmark([10, 20, 50], 'cyclonedx');

      expect(results).toHaveLength(3);
      expect(results[0].componentCount).toBe(10);
      expect(results[1].componentCount).toBe(20);
      expect(results[2].componentCount).toBe(50);

      results.forEach((result) => {
        expect(result.renderTime).toBeGreaterThanOrEqual(0);
        expect(result.timestamp).toBeDefined();
      });
    });
  });

  describe('大規模 SBOM パフォーマンス', () => {
    it('1000 コンポーネントを妥当な時間で生成する', () => {
      const startTime = performance.now();
      const sbom = generateLargeSBOM(1000, 'cyclonedx', true);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(sbom.components).toHaveLength(1000);
      expect(duration).toBeLessThan(5000); // 5秒未満
    });

    it('2000 コンポーネントを生成できる', () => {
      const sbom = generateLargeSBOM(2000, 'cyclonedx', true);
      expect(sbom.components).toHaveLength(2000);
    });
  });
});
