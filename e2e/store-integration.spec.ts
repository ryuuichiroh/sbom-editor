/**
 * ストア連携 E2E テスト
 *
 * 実際の sbom-store (localhost:3000) に接続して、
 * 接続設定・保存・読み込み・フィルタリング・上書き確認・承認済み保護の
 * 一連のフローをテストします。
 *
 * 前提条件:
 * - sbom-store が localhost:3000 で起動していること
 * - sbom-editor の dev サーバーが localhost:5173 で起動していること
 */
import { test, expect, Page } from '@playwright/test';
import { uploadSBOMFile } from './helpers/test-utils';

const STORE_URL = 'http://localhost:3000';

/** テスト用のユニークな名前を生成 */
function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now().toString()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** API 経由で SBOM を作成する */
async function apiCreateSbom(data: {
  name: string;
  version: string;
  format: string;
  content: object;
  tags?: string[];
}): Promise<any> {
  const res = await fetch(`${STORE_URL}/api/sboms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok)
    throw new Error(`Failed to create SBOM: ${res.status.toString()} ${await res.text()}`);
  return res.json();
}

/** API 経由で SBOM を削除する（承認済みの場合は先に承認解除） */
async function apiDeleteSbom(name: string, version: string): Promise<void> {
  // まず承認解除を試みる
  await fetch(
    `${STORE_URL}/api/sboms/${encodeURIComponent(name)}/${encodeURIComponent(version)}/approve`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: false }),
    }
  );
  // 削除
  await fetch(`${STORE_URL}/api/sboms/${encodeURIComponent(name)}/${encodeURIComponent(version)}`, {
    method: 'DELETE',
  });
}

/** API 経由で SBOM を承認する */
async function apiApproveSbom(name: string, version: string): Promise<void> {
  const res = await fetch(
    `${STORE_URL}/api/sboms/${encodeURIComponent(name)}/${encodeURIComponent(version)}/approve`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: true }),
    }
  );
  if (!res.ok) throw new Error(`Failed to approve SBOM: ${res.status.toString()}`);
}

/** 最小限の SPDX UnifiedSBOM コンテンツ */
function minimalSpdxContent(name: string) {
  return {
    format: 'spdx',
    specVersion: 'SPDX-2.3',
    metadata: {
      name,
      spdxId: 'SPDXRef-DOCUMENT',
      dataLicense: 'CC0-1.0',
      namespace: `https://example.com/${name}`,
      created: '2025-01-01T00:00:00Z',
      creators: [{ type: 'tool', name: 'e2e-test' }],
    },
    components: [
      {
        id: 'SPDXRef-Package-1',
        name,
        version: '1.0.0',
        type: 'library',
        spdxId: 'SPDXRef-Package-1',
        downloadLocation: 'https://example.com/pkg.tar.gz',
        filesAnalyzed: false,
        licenseConcluded: 'MIT',
        licenseDeclared: 'MIT',
        copyrightText: 'Copyright 2025 Test',
        licenses: [{ licenseId: 'MIT', category: 'permissive' }],
        customAttributes: [],
        hashes: [],
        externalRefs: [],
        parentIds: [],
      },
    ],
    relationships: [],
  };
}

/**
 * ページ遷移前に localStorage をセットしてから goto する。
 * これにより、初回マウント時にストアボタンが表示される。
 */
async function gotoWithStore(page: Page) {
  await page.addInitScript((url) => {
    localStorage.setItem('sbomStoreUrl', url);
  }, STORE_URL);

  await page.goto('/');
  await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('button:has-text("ストアから読み込み")')).toBeVisible({
    timeout: 5000,
  });
}

// ============================================================
// 10.2 接続設定のテスト
// ============================================================

test.describe('Store Integration - 接続設定', () => {
  test('should configure store URL in settings and test connection', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    // 設定ダイアログを開く
    await page.locator('button[aria-label="設定"]').click();
    await expect(page.getByRole('heading', { name: '設定', exact: true })).toBeVisible();

    // ストア URL を入力
    const urlInput = page.locator('label:has-text("sbom-store URL") >> xpath=.. >> input');
    await urlInput.fill(STORE_URL);

    // 接続テストボタンをクリック
    await page.locator('button:has-text("接続テスト")').click();

    // 成功メッセージを確認
    await expect(page.locator('text=接続に成功しました')).toBeVisible({ timeout: 5000 });

    // ダイアログを閉じる
    await page.locator('button:has-text("閉じる")').click();

    // ストア連携ボタンが表示されることを確認
    await expect(page.locator('button:has-text("ストアから読み込み")')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator('button:has-text("ストアへ保存")')).toBeVisible();
  });
});

// ============================================================
// 10.3 SBOM 保存のテスト
// ============================================================

test.describe('Store Integration - SBOM 保存', () => {
  const testNames: string[] = [];

  test.afterEach(async () => {
    // テストで作成した SBOM をクリーンアップ
    for (const name of testNames) {
      await apiDeleteSbom(name, '1.0.0').catch(() => {
        // Ignore deletion errors during cleanup
      });
    }
    testNames.length = 0;
  });

  test('should save SBOM to store', async ({ page }) => {
    await gotoWithStore(page);

    // SBOM をアップロード
    await uploadSBOMFile(page, 'sample-spdx.json');
    await expect(page.locator('text=test-package')).toBeVisible({ timeout: 5000 });

    const testName = uniqueName('e2e-save');
    testNames.push(testName);

    // 「ストアへ保存」ボタンをクリック
    await page.locator('button:has-text("ストアへ保存")').click();
    await expect(page.getByRole('heading', { name: 'ストアへ保存' })).toBeVisible();

    // 名前とバージョンを入力
    const nameInput = page.locator('[role="dialog"] label:has-text("名前") >> xpath=.. >> input');
    await nameInput.fill(testName);

    const versionInput = page.locator(
      '[role="dialog"] label:has-text("バージョン") >> xpath=.. >> input'
    );
    await versionInput.fill('1.0.0');

    // 保存ボタンをクリック
    await page.locator('[role="dialog"] button:has-text("保存")').click();

    // 成功メッセージを確認
    await expect(page.locator('text=SBOM を保存しました')).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================
// 10.4 SBOM 読み込みのテスト
// ============================================================

test.describe('Store Integration - SBOM 読み込み', () => {
  let testName: string;

  test.beforeEach(async () => {
    testName = uniqueName('e2e-load');
    await apiCreateSbom({
      name: testName,
      version: '1.0.0',
      format: 'spdx',
      content: minimalSpdxContent(testName),
      tags: ['e2e-test'],
    });
  });

  test.afterEach(async () => {
    await apiDeleteSbom(testName, '1.0.0').catch(() => {
      // Ignore deletion errors during cleanup
    });
  });

  test('should load SBOM from store and display in editor', async ({ page }) => {
    await gotoWithStore(page);

    // 「ストアから読み込み」ボタンをクリック
    await page.locator('button:has-text("ストアから読み込み")').click();
    await expect(page.getByRole('heading', { name: 'ストアから読み込み' })).toBeVisible();

    // SBOM 一覧が表示されることを確認（テストで作成した SBOM を検索）
    const nameSearchInput = page.locator(
      '[role="dialog"] label:has-text("名前で検索") >> xpath=.. >> input'
    );
    await nameSearchInput.fill(testName);
    await page.locator('[role="dialog"] button:has-text("検索")').click();

    await expect(page.locator(`td:has-text("${testName}")`)).toBeVisible({ timeout: 10000 });

    // 「読み込み」ボタンをクリック
    const targetRow = page.locator('tr', { has: page.locator(`td:has-text("${testName}")`) });
    await targetRow.locator('button:has-text("読み込み")').click();

    // ダイアログが閉じることを確認
    await expect(page.getByRole('heading', { name: 'ストアから読み込み' })).not.toBeVisible({
      timeout: 5000,
    });

    // 読み込んだ SBOM がエディタに反映されることを確認
    await expect(page.locator(`text=${testName}`).first()).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// 10.5 フィルタリングのテスト
// ============================================================

test.describe('Store Integration - フィルタリング', () => {
  let baseName: string;
  let nameA: string;
  let nameB: string;

  test.beforeAll(async () => {
    baseName = uniqueName('e2e-filter');
    nameA = `${baseName}-alpha`;
    nameB = `${baseName}-beta`;

    // 2 つの SBOM を作成（1 つは承認済み）
    await apiCreateSbom({
      name: nameA,
      version: '1.0.0',
      format: 'spdx',
      content: minimalSpdxContent(nameA),
      tags: ['e2e-filter'],
    });
    await apiCreateSbom({
      name: nameB,
      version: '1.0.0',
      format: 'spdx',
      content: minimalSpdxContent(nameB),
      tags: ['e2e-filter'],
    });
    // nameB を承認
    await apiApproveSbom(nameB, '1.0.0');
  });

  test.afterAll(async () => {
    await apiDeleteSbom(nameA, '1.0.0').catch(() => {
      // Ignore deletion errors during cleanup
    });
    await apiDeleteSbom(nameB, '1.0.0').catch(() => {
      // Ignore deletion errors during cleanup
    });
  });

  test('should filter SBOMs by name', async ({ page }) => {
    await gotoWithStore(page);

    // ダイアログを開く
    await page.locator('button:has-text("ストアから読み込み")').click();
    await expect(page.getByRole('heading', { name: 'ストアから読み込み' })).toBeVisible();

    // baseName で検索（alpha と beta の両方がヒットするはず）
    const nameSearchInput = page.locator(
      '[role="dialog"] label:has-text("名前で検索") >> xpath=.. >> input'
    );
    await nameSearchInput.fill(baseName);
    await page.locator('[role="dialog"] button:has-text("検索")').click();

    await expect(page.locator(`td:has-text("${nameA}")`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`td:has-text("${nameB}")`)).toBeVisible();

    // alpha だけに絞り込み
    await nameSearchInput.fill(nameA);
    await page.locator('[role="dialog"] button:has-text("検索")').click();

    await expect(page.locator(`td:has-text("${nameA}")`)).toBeVisible({ timeout: 10000 });
    // beta は表示されないことを確認
    await expect(page.locator(`td:has-text("${nameB}")`)).not.toBeVisible({ timeout: 3000 });
  });

  test('should filter SBOMs by approved status', async ({ page }) => {
    await gotoWithStore(page);

    // ダイアログを開く
    await page.locator('button:has-text("ストアから読み込み")').click();
    await expect(page.getByRole('heading', { name: 'ストアから読み込み' })).toBeVisible();

    // baseName で検索して両方表示
    const nameSearchInput = page.locator(
      '[role="dialog"] label:has-text("名前で検索") >> xpath=.. >> input'
    );
    await nameSearchInput.fill(baseName);
    await page.locator('[role="dialog"] button:has-text("検索")').click();
    await expect(page.locator(`td:has-text("${nameA}")`)).toBeVisible({ timeout: 10000 });

    // 承認済みのみチェックボックスをクリック
    await page.locator('[role="dialog"] label:has-text("承認済みのみ")').click();
    await page.locator('[role="dialog"] button:has-text("検索")').click();

    // 承認済みの nameB のみ表示されることを確認
    await expect(page.locator(`td:has-text("${nameB}")`)).toBeVisible({ timeout: 10000 });
    // 未承認の nameA は表示されない
    await expect(page.locator(`td:has-text("${nameA}")`)).not.toBeVisible({ timeout: 3000 });
  });
});

// ============================================================
// 10.6 上書き確認のテスト
// ============================================================

test.describe('Store Integration - 上書き確認', () => {
  let testName: string;

  test.beforeEach(async () => {
    testName = uniqueName('e2e-overwrite');
    // 既存の SBOM を作成
    await apiCreateSbom({
      name: testName,
      version: '1.0.0',
      format: 'spdx',
      content: minimalSpdxContent(testName),
    });
  });

  test.afterEach(async () => {
    await apiDeleteSbom(testName, '1.0.0').catch(() => {
      // Ignore deletion errors during cleanup
    });
  });

  test('should show overwrite confirmation on 409 conflict', async ({ page }) => {
    await gotoWithStore(page);

    // SBOM をアップロード
    await uploadSBOMFile(page, 'sample-spdx.json');
    await expect(page.locator('text=test-package')).toBeVisible({ timeout: 5000 });

    // 「ストアへ保存」ボタンをクリック
    await page.locator('button:has-text("ストアへ保存")').click();
    await expect(page.getByRole('heading', { name: 'ストアへ保存' })).toBeVisible();

    // 既存と同じ名前・バージョンを入力
    const nameInput = page.locator('[role="dialog"] label:has-text("名前") >> xpath=.. >> input');
    await nameInput.fill(testName);
    const versionInput = page.locator(
      '[role="dialog"] label:has-text("バージョン") >> xpath=.. >> input'
    );
    await versionInput.fill('1.0.0');

    // 保存ボタンをクリック → 409 Conflict
    await page.locator('[role="dialog"] button:has-text("保存")').click();

    // 上書き確認メッセージが表示されることを確認
    await expect(
      page.locator('text=同じ名前とバージョンの SBOM が既に存在します。上書きしますか？')
    ).toBeVisible({ timeout: 10000 });

    // 上書きボタンをクリック
    await page.locator('[role="dialog"] button:has-text("上書き")').click();

    // 成功メッセージを確認
    await expect(page.locator('text=SBOM を上書き保存しました')).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================
// 10.7 承認済み SBOM 保護のテスト
// ============================================================

test.describe('Store Integration - 承認済み SBOM 保護', () => {
  let testName: string;

  test.beforeEach(async () => {
    testName = uniqueName('e2e-approved');
    // 承認済み SBOM を作成
    await apiCreateSbom({
      name: testName,
      version: '1.0.0',
      format: 'spdx',
      content: minimalSpdxContent(testName),
    });
    await apiApproveSbom(testName, '1.0.0');
  });

  test.afterEach(async () => {
    await apiDeleteSbom(testName, '1.0.0').catch(() => {
      // Ignore deletion errors during cleanup
    });
  });

  test('should show error when trying to overwrite approved SBOM', async ({ page }) => {
    await gotoWithStore(page);

    // SBOM をアップロード
    await uploadSBOMFile(page, 'sample-spdx.json');
    await expect(page.locator('text=test-package')).toBeVisible({ timeout: 5000 });

    // 「ストアへ保存」ボタンをクリック
    await page.locator('button:has-text("ストアへ保存")').click();
    await expect(page.getByRole('heading', { name: 'ストアへ保存' })).toBeVisible();

    // 承認済み SBOM と同じ名前・バージョンを入力
    const nameInput = page.locator('[role="dialog"] label:has-text("名前") >> xpath=.. >> input');
    await nameInput.fill(testName);
    const versionInput = page.locator(
      '[role="dialog"] label:has-text("バージョン") >> xpath=.. >> input'
    );
    await versionInput.fill('1.0.0');

    // 保存ボタンをクリック → 409 Conflict
    await page.locator('[role="dialog"] button:has-text("保存")').click();

    // 上書き確認が表示される（409 は approvedConflict ではない）
    await expect(
      page.locator('text=同じ名前とバージョンの SBOM が既に存在します。上書きしますか？')
    ).toBeVisible({ timeout: 10000 });

    // 上書きボタンをクリック → PUT で 403 が返る
    await page.locator('[role="dialog"] button:has-text("上書き")').click();

    // 承認済みエラーメッセージが表示されることを確認
    await expect(
      page
        .locator('[role="dialog"]')
        .locator('[role="alert"]')
        .filter({
          hasText:
            'この SBOM は承認済みのため更新できません。別の名前またはバージョンで保存してください。',
        })
        .first()
    ).toBeVisible({ timeout: 10000 });

    // 上書き確認は消えていることを確認
    await expect(
      page.locator('text=同じ名前とバージョンの SBOM が既に存在します。上書きしますか？')
    ).not.toBeVisible();
  });
});
