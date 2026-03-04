import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { uploadSBOMFile } from './helpers/test-utils';

test.describe('Integration Tests', () => {
  test('should handle complete workflow: upload SPDX, edit, download', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    // Step 1: Upload SPDX file
    await uploadSBOMFile(page, 'sample-spdx.json');
    await expect(page.locator('text=test-package')).toBeVisible({ timeout: 5000 });

    // Step 2: Edit existing component
    await page.locator('text=test-package').click();
    await expect(page.locator('text=基本情報')).toBeVisible();

    const versionInput = page.locator('label:has-text("バージョン") >> xpath=.. >> input');
    await versionInput.fill('2.0.0');

    // Step 3: Navigate to license tab
    const licenseTab = page.getByRole('main').locator('[role="tab"]:has-text("ライセンス")');
    if ((await licenseTab.count()) > 0) {
      await licenseTab.click();
      await expect(page.getByRole('textbox', { name: 'SPDX License ID' })).toHaveValue('MIT');
    }

    // Step 4: Download edited SBOM
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("ダウンロード")').first().click();
    await page.locator('text=SPDX 形式').click();

    const download = await downloadPromise;
    const downloadsDir = path.join(import.meta.dirname, 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    const downloadPath = path.join(downloadsDir, download.suggestedFilename());
    await download.saveAs(downloadPath);

    expect(fs.existsSync(downloadPath)).toBeTruthy();
    const downloadedContent = JSON.parse(fs.readFileSync(downloadPath, 'utf-8'));
    expect(downloadedContent.spdxVersion).toBe('SPDX-2.3');

    fs.unlinkSync(downloadPath);
  });

  test('should handle complete workflow: upload CycloneDX, edit, download', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    // Step 1: Upload CycloneDX file
    await uploadSBOMFile(page, 'sample-cyclonedx.json');
    await expect(page.locator('text=test-package')).toBeVisible({ timeout: 5000 });

    // Step 2: Open component editor
    await page.locator('text=test-package').click();
    await expect(page.locator('text=基本情報')).toBeVisible();

    // Step 3: Navigate to custom attributes tab
    const customAttrTab = page.locator('[role="tab"]:has-text("カスタム属性")');
    if ((await customAttrTab.count()) > 0) {
      await customAttrTab.click();
      await page.waitForTimeout(500);
    }

    // Step 4: Go back to basic info and edit PURL
    await page.locator('[role="tab"]:has-text("基本情報")').click();
    const purlInput = page.locator('label:has-text("PURL") >> xpath=.. >> input');
    if ((await purlInput.count()) > 0) {
      await purlInput.fill('pkg:npm/test-package@2.0.0');
    }

    // Step 5: Download
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("ダウンロード")').first().click();
    await page.locator('text=CycloneDX 形式').click();

    const download = await downloadPromise;
    const downloadsDir = path.join(import.meta.dirname, 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    const downloadPath = path.join(downloadsDir, download.suggestedFilename());
    await download.saveAs(downloadPath);

    expect(fs.existsSync(downloadPath)).toBeTruthy();
    const downloadedContent = JSON.parse(fs.readFileSync(downloadPath, 'utf-8'));
    expect(downloadedContent.bomFormat).toBe('CycloneDX');

    fs.unlinkSync(downloadPath);
  });

  test('should handle undo/redo operations', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    // Upload file
    await uploadSBOMFile(page, 'sample-spdx.json');
    await expect(page.locator('text=test-package')).toBeVisible({ timeout: 5000 });

    // Edit component
    await page.locator('text=test-package').click();
    const versionInput = page.locator('label:has-text("バージョン") >> xpath=.. >> input');
    const originalValue = await versionInput.inputValue();
    await versionInput.fill('3.0.0');

    // Look for undo button
    const undoButton = page.locator('button[aria-label="元に戻す"]');
    if (await undoButton.isEnabled()) {
      await undoButton.click();
      await page.waitForTimeout(500);

      const restoredValue = await versionInput.inputValue();
      expect(restoredValue).toBe(originalValue);

      // Test redo
      const redoButton = page.locator('button[aria-label="やり直す"]');
      if (await redoButton.isEnabled()) {
        await redoButton.click();
        await page.waitForTimeout(500);

        const redoneValue = await versionInput.inputValue();
        expect(redoneValue).toBe('3.0.0');
      }
    }
  });

  test('should handle relationship management', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    // Upload file
    await uploadSBOMFile(page, 'sample-spdx.json');
    await expect(page.locator('text=test-package')).toBeVisible({ timeout: 5000 });

    // Open component
    await page.locator('text=test-package').click();

    // Navigate to relationships tab
    const relationshipsTab = page.locator('[role="tab"]:has-text("関係")');
    if ((await relationshipsTab.count()) > 0) {
      await relationshipsTab.click();
      await page.waitForTimeout(500);

      // Verify relationships UI is visible
      await expect(page.getByRole('heading', { name: '親コンポーネント' })).toBeVisible();
    }
  });

  test('should handle search and filter in component tree', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    // Upload file
    await uploadSBOMFile(page, 'sample-spdx.json');
    await expect(page.locator('text=test-package')).toBeVisible({ timeout: 5000 });

    // Look for search input
    const searchInput = page.locator('input[placeholder*="検索"]');
    if ((await searchInput.count()) > 0) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);

      // Verify filtered results
      await expect(page.locator('text=test-package')).toBeVisible();
    }
  });

  test('should validate tree view renders correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    await uploadSBOMFile(page, 'sample-spdx.json');
    await expect(page.locator('text=test-package')).toBeVisible({ timeout: 5000 });

    // Verify tree view is present
    const treeView = page.locator('[role="tree"]');
    await expect(treeView).toBeVisible();
  });
});
