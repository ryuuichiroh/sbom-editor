import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { uploadSBOMFile } from './helpers/test-utils';

test.describe('CycloneDX Workflow', () => {
  test('should upload, edit, and download CycloneDX file', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    await uploadSBOMFile(page, 'sample-cyclonedx.json');
    await expect(page.locator('text=test-package')).toBeVisible({ timeout: 5000 });

    // Verify component appears in tree view
    await expect(page.locator('[role="tree"]')).toBeVisible();

    // Click on the component to open editor
    await page.locator('text=test-package').click();
    await expect(page.locator('text=基本情報')).toBeVisible();

    // Edit component version
    const versionInput = page.locator('label:has-text("バージョン") >> xpath=.. >> input');
    await versionInput.fill('2.0.0');

    // Download the edited SBOM
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
    expect(downloadedContent.components).toBeDefined();

    const updatedComponent = downloadedContent.components.find((comp: any) => comp.name === 'test-package');
    expect(updatedComponent).toBeDefined();
    expect(updatedComponent.version).toBe('2.0.0');

    fs.unlinkSync(downloadPath);
  });

  test('should validate required CycloneDX fields', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    await uploadSBOMFile(page, 'sample-cyclonedx.json');
    await expect(page.locator('text=test-package')).toBeVisible({ timeout: 5000 });

    await page.locator('text=test-package').click();
    await expect(page.locator('text=基本情報')).toBeVisible();

    // Verify CycloneDX-specific fields are present
    const bomRefLabel = page.locator('label:has-text("BOM Ref")');
    await expect(bomRefLabel).toBeVisible();
  });

  test('should handle CycloneDX component types', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    await uploadSBOMFile(page, 'sample-cyclonedx.json');
    await expect(page.locator('text=test-package')).toBeVisible({ timeout: 5000 });

    await page.locator('text=test-package').click();
    await expect(page.locator('text=基本情報')).toBeVisible();

    // Check if type field shows "library" in the tree chip
    await expect(page.locator('text=library').first()).toBeVisible();
  });

  test('should handle CycloneDX custom properties', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    await uploadSBOMFile(page, 'sample-cyclonedx.json');
    await expect(page.locator('text=test-package')).toBeVisible({ timeout: 5000 });

    await page.locator('text=test-package').click();

    // Navigate to custom attributes tab
    const customAttrTab = page.locator('[role="tab"]:has-text("カスタム属性")');
    if (await customAttrTab.count() > 0) {
      await customAttrTab.click();
      await page.waitForTimeout(500);
    }
  });

  test('should handle CycloneDX license information', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    await uploadSBOMFile(page, 'sample-cyclonedx.json');
    await expect(page.locator('text=test-package')).toBeVisible({ timeout: 5000 });

    // Click on component to open editor
    await page.locator('text=test-package').click();

    // Navigate to license tab
    const licenseTab = page.locator('[role="tab"]:has-text("ライセンス")');
    if (await licenseTab.count() > 0) {
      await licenseTab.click();
      // MIT is inside the SPDX License ID textbox
      await expect(page.getByRole('textbox', { name: 'SPDX License ID' })).toHaveValue('MIT');
    }
  });
});
