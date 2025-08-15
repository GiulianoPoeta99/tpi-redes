// Frontend E2E tests for complete transfer workflows

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('File Transfer Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/File Transfer/);
  });

  test('should complete TCP file transfer workflow', async ({ page }) => {
    // Select transmitter mode
    await page.click('[data-testid="mode-transmitter"]');
    await expect(page.locator('[data-testid="mode-transmitter"]')).toHaveClass(/active/);

    // Configure connection
    await page.fill('[data-testid="target-ip"]', '127.0.0.1');
    await page.fill('[data-testid="port"]', '8080');
    await page.selectOption('[data-testid="protocol"]', 'tcp');

    // Select file
    const testFile = path.join(__dirname, '../test-data/small-test.txt');
    await page.setInputFiles('[data-testid="file-input"]', testFile);

    // Verify file is selected
    await expect(page.locator('[data-testid="selected-file"]')).toContainText('small-test.txt');

    // Start transfer
    await page.click('[data-testid="start-transfer"]');

    // Wait for transfer to start
    await expect(page.locator('[data-testid="transfer-status"]')).toContainText('Transferring');

    // Wait for transfer to complete (with timeout)
    await expect(page.locator('[data-testid="transfer-status"]')).toContainText('Completed', {
      timeout: 30000
    });

    // Verify success notification
    await expect(page.locator('[data-testid="success-notification"]')).toBeVisible();

    // Check transfer details
    await expect(page.locator('[data-testid="bytes-transferred"]')).toContainText('1024');
    await expect(page.locator('[data-testid="transfer-speed"]')).toContainText('MB/s');
  });

  test('should complete UDP file transfer workflow', async ({ page }) => {
    // Select transmitter mode
    await page.click('[data-testid="mode-transmitter"]');

    // Configure connection for UDP
    await page.fill('[data-testid="target-ip"]', '127.0.0.1');
    await page.fill('[data-testid="port"]', '8081');
    await page.selectOption('[data-testid="protocol"]', 'udp');

    // Select file
    const testFile = path.join(__dirname, '../test-data/small-test.txt');
    await page.setInputFiles('[data-testid="file-input"]', testFile);

    // Start transfer
    await page.click('[data-testid="start-transfer"]');

    // Wait for transfer to complete
    await expect(page.locator('[data-testid="transfer-status"]')).toContainText('Completed', {
      timeout: 20000
    });

    // Verify UDP-specific behavior
    await expect(page.locator('[data-testid="protocol-info"]')).toContainText('UDP');
    await expect(page.locator('[data-testid="reliability-info"]')).toContainText('Fire-and-forget');
  });

  test('should handle receiver mode setup', async ({ page }) => {
    // Select receiver mode
    await page.click('[data-testid="mode-receiver"]');
    await expect(page.locator('[data-testid="mode-receiver"]')).toHaveClass(/active/);

    // Configure receiver
    await page.fill('[data-testid="listen-port"]', '9090');
    await page.selectOption('[data-testid="protocol"]', 'tcp');

    // Set output directory
    await page.click('[data-testid="select-output-dir"]');
    // Note: File dialog handling would need additional setup in real tests

    // Start listening
    await page.click('[data-testid="start-listening"]');

    // Verify receiver is listening
    await expect(page.locator('[data-testid="receiver-status"]')).toContainText('Listening');
    await expect(page.locator('[data-testid="listening-port"]')).toContainText('9090');

    // Stop listening
    await page.click('[data-testid="stop-listening"]');
    await expect(page.locator('[data-testid="receiver-status"]')).toContainText('Stopped');
  });

  test('should display transfer progress', async ({ page }) => {
    // Setup for medium file transfer
    await page.click('[data-testid="mode-transmitter"]');
    await page.fill('[data-testid="target-ip"]', '127.0.0.1');
    await page.fill('[data-testid="port"]', '8080');
    await page.selectOption('[data-testid="protocol"]', 'tcp');

    // Select medium file
    const testFile = path.join(__dirname, '../test-data/medium-test.bin');
    await page.setInputFiles('[data-testid="file-input"]', testFile);

    // Start transfer
    await page.click('[data-testid="start-transfer"]');

    // Check progress elements appear
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
    await expect(page.locator('[data-testid="transfer-speed"]')).toBeVisible();
    await expect(page.locator('[data-testid="eta"]')).toBeVisible();

    // Wait for progress updates
    await page.waitForFunction(() => {
      const progressBar = document.querySelector('[data-testid="progress-bar"]') as HTMLElement;
      return progressBar && parseFloat(progressBar.style.width || '0') > 0;
    });

    // Wait for completion
    await expect(page.locator('[data-testid="transfer-status"]')).toContainText('Completed', {
      timeout: 60000
    });
  });

  test('should handle transfer cancellation', async ({ page }) => {
    // Setup for large file transfer
    await page.click('[data-testid="mode-transmitter"]');
    await page.fill('[data-testid="target-ip"]', '127.0.0.1');
    await page.fill('[data-testid="port"]', '8080');

    // Select large file
    const testFile = path.join(__dirname, '../test-data/large-test.bin');
    await page.setInputFiles('[data-testid="file-input"]', testFile);

    // Start transfer
    await page.click('[data-testid="start-transfer"]');

    // Wait for transfer to start
    await expect(page.locator('[data-testid="transfer-status"]')).toContainText('Transferring');

    // Cancel transfer
    await page.click('[data-testid="cancel-transfer"]');

    // Verify cancellation
    await expect(page.locator('[data-testid="transfer-status"]')).toContainText('Cancelled');
    await expect(page.locator('[data-testid="cancel-notification"]')).toBeVisible();
  });

  test('should handle connection errors gracefully', async ({ page }) => {
    // Setup with invalid target
    await page.click('[data-testid="mode-transmitter"]');
    await page.fill('[data-testid="target-ip"]', '192.168.999.999'); // Invalid IP
    await page.fill('[data-testid="port"]', '8080');

    // Select file
    const testFile = path.join(__dirname, '../test-data/small-test.txt');
    await page.setInputFiles('[data-testid="file-input"]', testFile);

    // Start transfer
    await page.click('[data-testid="start-transfer"]');

    // Wait for error
    await expect(page.locator('[data-testid="transfer-status"]')).toContainText('Error', {
      timeout: 10000
    });

    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('connection');
  });

  test('should validate input fields', async ({ page }) => {
    await page.click('[data-testid="mode-transmitter"]');

    // Test invalid IP validation
    await page.fill('[data-testid="target-ip"]', 'invalid-ip');
    await page.blur('[data-testid="target-ip"]');
    await expect(page.locator('[data-testid="ip-error"]')).toBeVisible();

    // Test invalid port validation
    await page.fill('[data-testid="port"]', '99999');
    await page.blur('[data-testid="port"]');
    await expect(page.locator('[data-testid="port-error"]')).toBeVisible();

    // Test valid inputs
    await page.fill('[data-testid="target-ip"]', '127.0.0.1');
    await page.fill('[data-testid="port"]', '8080');
    await expect(page.locator('[data-testid="ip-error"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="port-error"]')).not.toBeVisible();
  });

  test('should persist configuration settings', async ({ page }) => {
    // Configure settings
    await page.click('[data-testid="mode-transmitter"]');
    await page.fill('[data-testid="target-ip"]', '192.168.1.100');
    await page.fill('[data-testid="port"]', '9000');
    await page.selectOption('[data-testid="protocol"]', 'udp');

    // Reload page
    await page.reload();

    // Verify settings are restored
    await expect(page.locator('[data-testid="mode-transmitter"]')).toHaveClass(/active/);
    await expect(page.locator('[data-testid="target-ip"]')).toHaveValue('192.168.1.100');
    await expect(page.locator('[data-testid="port"]')).toHaveValue('9000');
    await expect(page.locator('[data-testid="protocol"]')).toHaveValue('udp');
  });

  test('should display transfer history', async ({ page }) => {
    // Complete a transfer first
    await page.click('[data-testid="mode-transmitter"]');
    await page.fill('[data-testid="target-ip"]', '127.0.0.1');
    await page.fill('[data-testid="port"]', '8080');

    const testFile = path.join(__dirname, '../test-data/small-test.txt');
    await page.setInputFiles('[data-testid="file-input"]', testFile);
    await page.click('[data-testid="start-transfer"]');

    await expect(page.locator('[data-testid="transfer-status"]')).toContainText('Completed', {
      timeout: 30000
    });

    // Navigate to history
    await page.click('[data-testid="history-tab"]');

    // Verify history entry
    await expect(page.locator('[data-testid="history-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="history-entry"]').first()).toContainText('small-test.txt');
    await expect(page.locator('[data-testid="history-entry"]').first()).toContainText('Completed');

    // Check history details
    await page.click('[data-testid="history-entry"]').first();
    await expect(page.locator('[data-testid="history-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="history-protocol"]')).toContainText('TCP');
    await expect(page.locator('[data-testid="history-size"]')).toContainText('1024');
  });

  test('should handle system notifications', async ({ page, context }) => {
    // Grant notification permission
    await context.grantPermissions(['notifications']);

    // Enable notifications in settings
    await page.click('[data-testid="settings-tab"]');
    await page.check('[data-testid="enable-notifications"]');

    // Complete a transfer
    await page.click('[data-testid="transfer-tab"]');
    await page.click('[data-testid="mode-transmitter"]');
    await page.fill('[data-testid="target-ip"]', '127.0.0.1');
    await page.fill('[data-testid="port"]', '8080');

    const testFile = path.join(__dirname, '../test-data/small-test.txt');
    await page.setInputFiles('[data-testid="file-input"]', testFile);
    await page.click('[data-testid="start-transfer"]');

    // Wait for completion and notification
    await expect(page.locator('[data-testid="transfer-status"]')).toContainText('Completed', {
      timeout: 30000
    });

    // Note: Testing actual system notifications requires additional setup
    // This test verifies the notification settings are available
    await expect(page.locator('[data-testid="notification-sent"]')).toBeVisible();
  });
});