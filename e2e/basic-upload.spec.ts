import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Basic Upload Test', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');

    // Wait for the app to load
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    // Verify upload button exists
    await expect(page.locator('button:has-text("アップロード")')).toBeVisible();
  });

  test('should open upload dialog', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    // Click upload button
    await page.locator('button:has-text("アップロード")').first().click();

    // Verify dialog opens - use role selector to be more specific
    await expect(page.getByRole('heading', { name: 'SBOM ファイルをアップロード' })).toBeVisible();
    await expect(page.locator('text=ファイルをドラッグ&ドロップ')).toBeVisible();
  });

  test('should upload SPDX file', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    // Click upload button to open dialog
    await page.locator('button:has-text("アップロード")').first().click();
    await expect(page.getByRole('heading', { name: 'SBOM ファイルをアップロード' })).toBeVisible();

    // Upload file using the hidden input
    const fileInput = page.locator('input#file-input');
    const spdxFilePath = path.join(import.meta.dirname, 'fixtures', 'sample-spdx.json');
    await fileInput.setInputFiles(spdxFilePath);

    // Wait for dialog to close (file is processed)
    await expect(
      page.getByRole('heading', { name: 'SBOM ファイルをアップロード' })
    ).not.toBeVisible({ timeout: 5000 });

    // Verify component appears in tree view
    await expect(page.locator('text=test-package')).toBeVisible({ timeout: 5000 });
  });
});
