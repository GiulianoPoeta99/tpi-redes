// Global teardown for E2E tests
// Cleans up backend services and test environment

import { promises as fs } from 'fs';
import path from 'path';

async function globalTeardown() {
  console.log('🧹 Cleaning up E2E test environment...');

  // Kill backend process if it's still running
  if (process.env.BACKEND_PID) {
    try {
      process.kill(parseInt(process.env.BACKEND_PID));
      console.log('✅ Backend process terminated');
    } catch (error) {
      console.warn('⚠️ Failed to kill backend process:', error);
    }
  }

  // Clean up test files
  try {
    const testDataDir = path.join(__dirname, '../../test-data');
    await fs.rmdir(testDataDir, { recursive: true });
    console.log('✅ Test files cleaned up');
  } catch (error) {
    console.warn('⚠️ Failed to clean up test files:', error);
  }

  // Clean up test results
  try {
    const testResultsDir = path.join(__dirname, '../../test-results');
    // Keep test results but clean up temporary files
    const tempFiles = await fs.readdir(testResultsDir).catch(() => []);
    for (const file of tempFiles) {
      if (file.startsWith('temp-') || file.endsWith('.tmp')) {
        await fs.unlink(path.join(testResultsDir, file));
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to clean up temporary test files:', error);
  }

  console.log('✅ E2E test environment cleaned up');
}

export default globalTeardown;