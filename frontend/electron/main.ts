import { type ChildProcessWithoutNullStreams, exec, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, ipcMain, shell } from 'electron';

const require = createRequire(import.meta.url);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;
const backendBinaryName =
  process.platform === 'win32' ? 'tpi-redes-backend.exe' : 'tpi-redes-backend';
const packagedBackendDirName = 'backend-runtime';
const appDataRoot = path.join(os.homedir(), '.tpi-redes');
const receivedFilesDir = path.join(appDataRoot, 'received_files');

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcessWithoutNullStreams | null = null;

interface BackendInvocation {
  command: string;
  baseArgs: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.maximize();
};

function getReceivedFilesDir(): string {
  fs.mkdirSync(receivedFilesDir, { recursive: true });
  return receivedFilesDir;
}

function getBackendInvocation(): BackendInvocation {
  if (isDev) {
    const backendDir = path.resolve(__dirname, '../../backend');
    const srcDir = path.join(backendDir, 'src');
    const pythonPath = path.join(backendDir, '.venv/bin/python');

    return {
      command: pythonPath,
      baseArgs: ['-m', 'tpi_redes.cli.main'],
      cwd: backendDir,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        PYTHONPATH: srcDir,
      },
    };
  }

  const backendDir = ensurePackagedBackendRuntime();
  const backendExecutable = path.join(backendDir, backendBinaryName);

  return {
    command: backendExecutable,
    baseArgs: [],
    cwd: appDataRoot,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1',
    },
  };
}

function ensurePackagedBackendRuntime(): string {
  const targetDir = path.join(appDataRoot, packagedBackendDirName);
  const targetExecutable = path.join(targetDir, backendBinaryName);
  const markerPath = path.join(targetDir, '.source-version');
  const sourceDir = path.join(process.resourcesPath, 'backend');
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Packaged backend directory not found: ${sourceDir}`);
  }

  const sourceExecutable = path.join(sourceDir, backendBinaryName);
  const sourceStat = fs.statSync(sourceExecutable);
  const sourceVersion = `${app.getVersion()}-${process.arch}-${sourceStat.size}-${sourceStat.mtimeMs}`;

  const markerMatches =
    fs.existsSync(markerPath) && fs.readFileSync(markerPath, 'utf8').trim() === sourceVersion;

  if (fs.existsSync(targetExecutable) && markerMatches) {
    return targetDir;
  }

  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });
  fs.writeFileSync(markerPath, sourceVersion, 'utf8');

  if (fs.existsSync(targetExecutable)) {
    fs.chmodSync(targetExecutable, 0o755);
  }

  return targetDir;
}

function ensureBackendInvocation(): BackendInvocation {
  const invocation = getBackendInvocation();

  if (!fs.existsSync(invocation.command)) {
    throw new Error(`Backend executable not found: ${invocation.command}`);
  }

  return invocation;
}

function spawnBackendOnce(commandArgs: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    let invocation: BackendInvocation;

    try {
      invocation = ensureBackendInvocation();
    } catch (error) {
      reject(error);
      return;
    }

    const args = [...invocation.baseArgs, ...commandArgs];
    const child = spawn(invocation.command, args, {
      cwd: invocation.cwd,
      env: invocation.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(`Command failed (${code}): ${commandArgs.join(' ')}\n${stderr || stdout}`),
        );
        return;
      }
      resolve(stdout);
    });
  });
}

// IPC Handlers for backend CLI
ipcMain.handle('start-server', async (_event, args) => {
  const saveDir = getReceivedFilesDir();
  const cmdArgs = [
    'start-server',
    '--port',
    String(args.port),
    '--protocol',
    String(args.protocol),
    '--save-dir',
    saveDir,
  ];

  if (args.sniff) cmdArgs.push('--sniff');
  if (args.interface) cmdArgs.push('--interface', String(args.interface));

  return spawnManagedBackendProcess(cmdArgs);
});

ipcMain.handle('send-files', async (_event, args) => {
  const cmdArgs = [
    'send-file',
    ...(args.files as string[]),
    '--ip',
    String(args.ip),
    '--port',
    String(args.port),
    '--protocol',
    String(args.protocol),
  ];

  if (args.sniff) cmdArgs.push('--sniff');
  if (args.interface) cmdArgs.push('--interface', String(args.interface));
  if (args.delay) cmdArgs.push('--delay', String(args.delay));
  if (args.chunkSize) cmdArgs.push('--chunk-size', String(args.chunkSize));

  return spawnManagedBackendProcess(cmdArgs);
});

ipcMain.handle('start-proxy', async (_event, args) => {
  const cmdArgs = [
    'start-proxy',
    '--listen-port',
    String(args.listenPort),
    '--target-ip',
    String(args.targetIp),
    '--target-port',
    String(args.targetPort),
    '--corruption-rate',
    String(args.corruptionRate),
  ];

  if (args.interfaceName) cmdArgs.push('--interface', String(args.interfaceName));
  if (args.protocol) cmdArgs.push('--protocol', String(args.protocol));

  return spawnManagedBackendProcess(cmdArgs);
});

ipcMain.handle('scan-network', async () => {
  const output = await spawnBackendOnce(['scan-network']);

  try {
    const match = output.match(/\[.*\]/s);
    if (match) {
      return JSON.parse(match[0]);
    }
    return [];
  } catch {
    return [];
  }
});

ipcMain.handle('stop-process', async () => {
  if (backendProcess) {
    console.log('Stopping backend process via IPC...');
    const pid = backendProcess.pid;
    if (pid) {
      await killProcessTree(pid);
    }
    backendProcess = null;
  }
  return true;
});

ipcMain.handle('get-interfaces', async () => {
  try {
    const output = await spawnBackendOnce(['list-interfaces']);
    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
});

ipcMain.handle('get-local-ip', () => {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
});

// File Explorer IPCs
ipcMain.handle('get-downloads-dir', () => {
  return getReceivedFilesDir();
});

ipcMain.handle('list-files', async (_event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) return [];

    const files = await fs.promises.readdir(dirPath);
    const stats = await Promise.all(
      files.map(async (file) => {
        try {
          const fullPath = path.join(dirPath, file);
          const stat = await fs.promises.stat(fullPath);
          if (stat.isFile() && !file.endsWith('.sha256')) {
            return {
              name: file,
              size: stat.size,
              mtime: stat.mtimeMs,
              path: fullPath,
            };
          }
        } catch {
          return null;
        }
        return null;
      }),
    );

    return stats.filter(Boolean);
  } catch (error) {
    console.error('List files error:', error);
    return [];
  }
});

ipcMain.handle('open-path', async (_event, filePath) => {
  await shell.openPath(filePath);
});

ipcMain.handle('open-folder', async (_event, filePath) => {
  shell.showItemInFolder(filePath);
});

ipcMain.handle('verify-file', async (_event, filePath) => {
  try {
    const hashFile = `${filePath}.sha256`;
    if (!fs.existsSync(hashFile)) {
      return { valid: false, error: 'No .sha256 file found' };
    }

    const expectedHash = (await fs.promises.readFile(hashFile, 'utf8')).trim();

    const fileBuffer = await fs.promises.readFile(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const actualHash = hashSum.digest('hex');

    return {
      valid: actualHash === expectedHash,
      actual: actualHash,
      expected: expectedHash,
    };
    // biome-ignore lint/suspicious/noExplicitAny: Error handling
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
});

function spawnManagedBackendProcess(commandArgs: string[]) {
  if (backendProcess) {
    console.log('Killing existing backend process...');
    const pid = backendProcess.pid;
    if (pid) {
      killProcessTree(pid);
    }
    backendProcess = null;
  }

  const invocation = ensureBackendInvocation();
  const args = [...invocation.baseArgs, ...commandArgs];

  console.log(`Spawning backend: ${invocation.command} ${args.join(' ')}`);

  backendProcess = spawn(invocation.command, args, {
    cwd: invocation.cwd,
    env: invocation.env,
  });

  backendProcess.on('error', (error) => {
    if (mainWindow) {
      mainWindow.webContents.send('python-log', `Backend spawn error: ${String(error)}`);
    }
  });

  backendProcess.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
    console.log(`Backend process exited with code ${code} and signal ${signal}`);
    if (mainWindow) {
      mainWindow.webContents.send('process-exit', { code, signal: signal ?? '' });
    }
    backendProcess = null;
  });

  backendProcess.stdout.on('data', (data: Buffer) => {
    const str = data.toString();
    const lines = str.split('\n');

    lines.forEach((line: string) => {
      if (!line.trim()) return;

      try {
        const json = JSON.parse(line);
        const items = Array.isArray(json) ? json : [json];

        items.forEach((item: { type?: string }) => {
          if (item.type === 'WINDOW_UPDATE') {
            if (mainWindow) mainWindow.webContents.send('window-update', item);
          } else if (item.type === 'STATS') {
            if (mainWindow) mainWindow.webContents.send('stats-update', item);
          } else if (item.type === 'PACKET_CAPTURE') {
            if (mainWindow) mainWindow.webContents.send('packet-capture', item);
          } else if (item.type === 'SNIFFER_ERROR') {
            if (mainWindow) mainWindow.webContents.send('sniffer-error', item);
          }
        });
      } catch {
        // Not JSON, treat as normal log.
      }

      if (mainWindow) {
        mainWindow.webContents.send('python-log', line);
      }
    });
  });

  backendProcess.stderr.on('data', (data: Buffer) => {
    if (mainWindow) {
      mainWindow.webContents.send('python-log', data.toString());
    }
  });

  backendProcess.on('close', (code: number | null) => {
    if (mainWindow) {
      mainWindow.webContents.send('python-log', `Process exited with code ${code}`);
    }
    backendProcess = null;
  });

  return 'Process started';
}

app.on('ready', () => {
  fs.mkdirSync(appDataRoot, { recursive: true });
  getReceivedFilesDir();
  if (!isDev) {
    ensurePackagedBackendRuntime();
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

async function killProcessTree(pid: number) {
  return new Promise<void>((resolve) => {
    if (!pid) return resolve();

    exec(`pkill -P ${pid}`, () => {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        // Ignore if already dead.
      }
      resolve();
    });
  });
}

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
