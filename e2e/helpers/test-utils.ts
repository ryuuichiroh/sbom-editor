import { Page, expect } from '@playwright/test';
import path from 'path';

/**
 * E2E テスト用のヘルパー関数
 */

/**
 * SBOM ファイルをアップロードする（ダイアログを開いてからアップロード）
 */
export async function uploadSBOMFile(page: Page, filename: string): Promise<void> {
  // アップロードダイアログを開く
  await page.locator('button:has-text("アップロード")').first().click();
  await expect(page.getByRole('heading', { name: 'SBOM ファイルをアップロード' })).toBeVisible();

  // ファイルをアップロード
  const fileInput = page.locator('input#file-input');
  const filePath = path.join(import.meta.dirname, '..', 'fixtures', filename);
  await fileInput.setInputFiles(filePath);

  // ダイアログが閉じるのを待つ
  await expect(page.getByRole('heading', { name: 'SBOM ファイルをアップロード' })).not.toBeVisible({ timeout: 5000 });
}

/**
 * コンポーネントがツリービューに表示されるまで待機する
 */
export async function waitForComponentInTree(page: Page, componentName: string): Promise<void> {
  await expect(page.locator(`text=${componentName}`)).toBeVisible({ timeout: 5000 });
}

/**
 * コンポーネントエディタを開く
 */
export async function openComponentEditor(page: Page, componentName: string): Promise<void> {
  await page.locator(`text=${componentName}`).click();
  await expect(page.locator('text=基本情報')).toBeVisible();
}

/**
 * タブを切り替える
 */
export async function switchTab(page: Page, tabName: string): Promise<void> {
  const tab = page.getByRole('main').locator(`button:has-text("${tabName}")`).or(page.getByRole('main').locator(`[role="tab"]:has-text("${tabName}")`));
  if (await tab.count() > 0) {
    await tab.click();
  }
}
