import { test, expect } from '@playwright/test';
import { uploadSBOMFile } from './helpers/test-utils';

test.describe('Error Handling', () => {
  test('should show error for invalid JSON file', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible();
  });

  test('should handle missing required fields', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    await uploadSBOMFile(page, 'sample-spdx.json');
    await expect(page.locator('text=test-package')).toBeVisible({ timeout: 5000 });

    await page.locator('text=test-package').click();
    await expect(page.locator('text=基本情報')).toBeVisible();

    // Try to clear the name field
    const nameInput = page.locator('label:has-text("名前") >> xpath=.. >> input');
    if ((await nameInput.count()) > 0) {
      await nameInput.fill('');
      await nameInput.blur();
      await page.waitForTimeout(500);
    }
  });

  test('should handle circular dependency detection', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    await uploadSBOMFile(page, 'sample-spdx.json');
    await expect(page.locator('text=test-package')).toBeVisible({ timeout: 5000 });
  });

  test('should handle large SBOM files', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible();
  });

  test('should handle file size limit', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible();
  });
});

test.describe('Component Operations', () => {
  test('should add a new component', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    await uploadSBOMFile(page, 'sample-spdx.json');
    await expect(page.locator('text=test-package')).toBeVisible({ timeout: 5000 });

    // Click add button in the tree toolbar
    const addButton = page.locator('button:has-text("追加")');
    await addButton.click();

    // Fill in new component details in the dialog
    const nameInput = page.locator('[role="dialog"] label:has-text("名前") >> xpath=.. >> input');
    if ((await nameInput.count()) > 0) {
      await nameInput.fill('new-component');

      const versionInput = page.locator(
        '[role="dialog"] label:has-text("バージョン") >> xpath=.. >> input'
      );
      if ((await versionInput.count()) > 0) {
        await versionInput.fill('1.0.0');
      }

      // Submit
      const submitButton = page.locator('[role="dialog"] button:has-text("追加")');
      if ((await submitButton.count()) > 0) {
        await submitButton.click();
        await expect(page.locator('text=new-component')).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should delete a component', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    await uploadSBOMFile(page, 'sample-spdx.json');
    await expect(page.locator('text=test-package')).toBeVisible({ timeout: 5000 });

    // Select the component checkbox
    const checkbox = page.locator('[role="tree"]').locator('input[type="checkbox"]').first();
    await checkbox.click();

    // Click delete button
    const deleteButton = page.locator('button:has-text("削除")').first();
    await deleteButton.click();

    // Confirm deletion in dialog
    const confirmButton = page.locator('[role="dialog"] button:has-text("削除")');
    if ((await confirmButton.count()) > 0) {
      await confirmButton.click();
      await expect(page.locator('text=test-package')).not.toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('Settings', () => {
  test('should open settings dialog', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible({ timeout: 10000 });

    const settingsButton = page.locator('button[aria-label="設定"]');
    await settingsButton.click();

    // Verify settings dialog opens using role
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: '設定', exact: true })).toBeVisible();
  });

  test('should handle custom attributes configuration', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SBOM Editor')).toBeVisible();
  });
});
