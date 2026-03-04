import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { uploadSBOMFile } from './helpers/test-utils';

test.describe('SPDX Workflow', () => {
  test('should upload, edit, and download SPDX file', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    // Upload SPDX file
    await uploadSBOMFile(page, 'sample-spdx.json');

    // Wait for file to be parsed and loaded
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

    // Select original format from menu
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
    expect(downloadedContent.packages).toBeDefined();

    const updatedPackage = downloadedContent.packages.find(
      (pkg: any) => pkg.name === 'test-package'
    );
    expect(updatedPackage).toBeDefined();
    expect(updatedPackage.versionInfo).toBe('2.0.0');

    fs.unlinkSync(downloadPath);
  });

  test('should validate required SPDX fields', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    await uploadSBOMFile(page, 'sample-spdx.json');
    await expect(page.locator('text=test-package')).toBeVisible({ timeout: 5000 });

    await page.locator('text=test-package').click();
    await expect(page.locator('text=基本情報')).toBeVisible();

    // Verify SPDX-specific fields are present
    const spdxIdLabel = page.locator('label:has-text("SPDX ID")');
    await expect(spdxIdLabel).toBeVisible();
  });

  test('should handle SPDX license information', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    await uploadSBOMFile(page, 'sample-spdx.json');
    await expect(page.locator('text=test-package')).toBeVisible({ timeout: 5000 });

    // Click on component to open editor
    await page.locator('text=test-package').click();

    // Navigate to license tab
    const licenseTab = page.getByRole('main').locator('[role="tab"]:has-text("ライセンス")');
    if ((await licenseTab.count()) > 0) {
      await licenseTab.click();
      // MIT is inside the SPDX License ID textbox
      await expect(page.getByRole('textbox', { name: 'SPDX License ID' })).toHaveValue('MIT');
    }
  });
});
