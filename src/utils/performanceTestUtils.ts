/**
 * パフォーマンステスト用ユーティリティ
 * 大規模 SBOM（1000+ コンポーネント）を生成してパフォーマンスを検証する
 */

import type { UnifiedSBOM, Component, ComponentType, ComponentLicense } from '../types/unified';

const componentTypes: ComponentType[] = [
  'library',
  'framework',
  'application',
  'container',
  'operating-system',
  'device',
  'firmware',
  'file',
  'other',
];

const licenseIds = [
  'MIT',
  'Apache-2.0',
  'GPL-3.0-only',
  'BSD-3-Clause',
  'ISC',
  'LGPL-2.1-only',
  'MPL-2.0',
];

/**
 * ランダムな要素を配列から選択
 */
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * ランダムなバージョン番号を生成
 */
function generateVersion(): string {
  const major = Math.floor(Math.random() * 10);
  const minor = Math.floor(Math.random() * 20);
  const patch = Math.floor(Math.random() * 50);
  return `${major.toString()}.${minor.toString()}.${patch.toString()}`;
}

/**
 * ランダムなライセンスを生成
 */
function generateLicense(): ComponentLicense {
  const licenseId = randomChoice(licenseIds);
  return {
    licenseId,
    category: 'permissive', // 簡略化のため固定
  };
}

/**
 * 大規模 SBOM を生成する
 * @param componentCount コンポーネント数（デフォルト: 1000）
 * @param format SBOM フォーマット（デフォルト: 'cyclonedx'）
 * @param withHierarchy 親子階層を生成するか（デフォルト: true）
 */
export function generateLargeSBOM(
  componentCount = 1000,
  format: 'spdx' | 'cyclonedx' = 'cyclonedx',
  withHierarchy = true
): UnifiedSBOM {
  const components: Component[] = [];

  // コンポーネントを生成
  for (let i = 0; i < componentCount; i++) {
    const type = randomChoice(componentTypes);
    const name = `component-${i.toString()}`;
    const version = generateVersion();

    const component: Component = {
      id: crypto.randomUUID(),
      name,
      version,
      type,
      description: `Test component ${i.toString()} for performance testing`,
      licenses: [generateLicense()],
      hashes: [
        {
          algorithm: 'SHA-256',
          value: crypto.randomUUID().replace(/-/g, ''),
        },
      ],
      externalRefs: [],
      customAttributes: [],
      parentIds: [],
    };

    // フォーマット固有フィールド
    if (format === 'spdx') {
      component.spdxId = `SPDXRef-${name}`;
      component.downloadLocation = 'NOASSERTION';
      component.filesAnalyzed = false;
    } else {
      component.bomRef = crypto.randomUUID();
      component.purl = `pkg:npm/${name}@${version}`;
    }

    components.push(component);
  }

  // 親子階層を生成（オプション）
  if (withHierarchy && components.length > 1) {
    // 最初の10%をルートコンポーネントとし、残りを子として配置
    const rootCount = Math.max(1, Math.floor(componentCount * 0.1));
    const rootComponents = components.slice(0, rootCount);
    const childComponents = components.slice(rootCount);

    // 各子コンポーネントにランダムな親を割り当て
    childComponents.forEach((child) => {
      const parent = randomChoice(rootComponents);
      child.parentIds = [parent.id];
    });
  }

  // SBOM を構築
  const sbom: UnifiedSBOM = {
    format,
    specVersion: format === 'spdx' ? 'SPDX-2.3' : '1.4',
    metadata: {
      name: `performance-test-${componentCount.toString()}`,
      namespace: `https://example.com/sbom/${crypto.randomUUID()}`,
      created: new Date().toISOString(),
      creators: [
        {
          type: 'tool',
          name: 'SBOM Editor Performance Test',
          version: '1.0.0',
        },
      ],
    },
    components,
    relationships: [],
  };

  return sbom;
}

/**
 * パフォーマンス測定結果
 */
export interface PerformanceMetrics {
  componentCount: number;
  renderTime: number;
  memoryUsage?: number;
  timestamp: string;
}

/**
 * レンダリングパフォーマンスを測定
 * @param callback 測定対象の処理
 * @returns 実行時間（ミリ秒）
 */
export function measureRenderTime(callback: () => void): number {
  const startTime = performance.now();
  callback();
  const endTime = performance.now();
  return endTime - startTime;
}

/**
 * メモリ使用量を取得（利用可能な場合）
 * @returns メモリ使用量（MB）または undefined
 */
export function getMemoryUsage(): number | undefined {
  if ('memory' in performance && performance.memory) {
    const memory = performance.memory as {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
    return memory.usedJSHeapSize / 1024 / 1024; // MB に変換
  }
  return undefined;
}

/**
 * パフォーマンステスト結果をコンソールに出力
 */
export function logPerformanceMetrics(metrics: PerformanceMetrics): void {
  console.warn('🚀 Performance Metrics');

  console.warn(`Component Count: ${metrics.componentCount.toString()}`);

  console.warn(`Render Time: ${metrics.renderTime.toFixed(2)}ms`);
  if (metrics.memoryUsage !== undefined) {
    console.warn(`Memory Usage: ${metrics.memoryUsage.toFixed(2)}MB`);
  }

  console.warn(`Timestamp: ${metrics.timestamp}`);
}

/**
 * パフォーマンスベンチマークを実行
 * @param componentCounts テストするコンポーネント数の配列
 * @param format SBOM フォーマット
 * @returns パフォーマンスメトリクスの配列
 */
export function runPerformanceBenchmark(
  componentCounts: number[] = [100, 500, 1000, 2000],
  format: 'spdx' | 'cyclonedx' = 'cyclonedx'
): PerformanceMetrics[] {
  const results: PerformanceMetrics[] = [];

  console.warn('📊 Starting Performance Benchmark...');

  componentCounts.forEach((count) => {
    console.warn(`\nTesting with ${count.toString()} components...`);

    const renderTime = measureRenderTime(() => {
      generateLargeSBOM(count, format);
    });

    const metrics: PerformanceMetrics = {
      componentCount: count,
      renderTime,
      memoryUsage: getMemoryUsage(),
      timestamp: new Date().toISOString(),
    };

    logPerformanceMetrics(metrics);
    results.push(metrics);
  });

  console.warn('\n✅ Benchmark Complete!');
  return results;
}
