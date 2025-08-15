// Global setup for E2E tests
// Starts backend services and prepares test environment

import { chromium, FullConfig } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

let backendProcess: ChildProcess | null = null;

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up E2E test environment...');

  // Create test directories
  const testDataDir = path.join(__dirname, '../../test-data');
  await fs.mkdir(testDataDir, { recursive: true });

  // Create test files
  await createTestFiles(testDataDir);

  // Start backend in test mode
  await startBackendService();

  // Wait for services to be ready
  await waitForServices();

  console.log('✅ E2E test environment ready');
}

async function createTestFiles(testDataDir: string) {
  console.log('📁 Creating test files...');

  const testFiles = [
    { name: 'small-test.txt', size: 1024, content: 'text' },
    { name: 'medium-test.bin', size: 100 * 1024, content: 'binary' },
    { name: 'large-test.bin', size: 10 * 1024 * 1024, content: 'binary' },
  ];

  for (const file of testFiles) {
    const filePath = path.join(testDataDir, file.name);
    
    if (file.content === 'text') {
      const content = 'Test file content. '.repeat(file.size / 18);
      await fs.writeFile(filePath, content.slice(0, file.size));
    } else {
      // Create binary file
      const buffer = Buffer.alloc(file.size);
      for (let i = 0; i < file.size; i++) {
        buffer[i] = i % 256;
      }
      await fs.writeFile(filePath, buffer);
    }
  }

  console.log(`✅ Created ${testFiles.length} test files`);
}

async function startBackendService() {
  console.log('🔧 Starting backend service...');

  return new Promise<void>((resolve, reject) => {
    // Start backend in CLI mode for testing
    backendProcess = spawn('cargo', ['run', '--release', '--', 'receive', '--port', '8080'], {
      cwd: path.join(__dirname, '../../../backend'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        RUST_LOG: 'info',
        FILE_TRANSFER_TEST_MODE: '1',
      },
    });

    let output = '';

    backendProcess.stdout?.on('data', (data) => {
      output += data.toString();
      if (output.includes('Listening on')) {
        console.log('✅ Backend service started');
        resolve();
      }
    });

    backendProcess.stderr?.on('data', (data) => {
      console.error('Backend stderr:', data.toString());
    });

    backendProcess.on('error', (error) => {
      console.error('Failed to start backend:', error);
      reject(error);
    });

    backendProcess.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Backend exited with code ${code}`);
        reject(new Error(`Backend process failed with exit code ${code}`));
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        console.error('Backend startup timeout');
        backendProcess.kill();
        reject(new Error('Backend startup timeout'));
      }
    }, 30000);
  });
}

async function waitForServices() {
  console.log('⏳ Waiting for services to be ready...');

  // Wait for Tauri dev server
  const browser = await chromium.launch();
  const page = await browser.newPage();

  let retries = 30;
  while (retries > 0) {
    try {
      await page.goto('http://localhost:1420', { timeout: 5000 });
      const title = await page.title();
      if (title.includes('File Transfer')) {
        console.log('✅ Frontend service ready');
        break;
      }
    } catch (error) {
      // Service not ready yet
    }

    retries--;
    if (retries === 0) {
      throw new Error('Frontend service failed to start');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  await browser.close();

  // Test backend connectivity
  try {
    const response = await fetch('http://localhost:8080/health');
    if (response.ok) {
      console.log('✅ Backend service ready');
    }
  } catch (error) {
    console.warn('⚠️ Backend health check failed, but continuing...');
  }
}

export default globalSetup;