import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { app, BrowserWindow, ipcMain, shell } from 'electron';

const require = createRequire(import.meta.url);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
// biome-ignore lint/suspicious/noExplicitAny: Python process
let pythonProcess: any = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // In production, load the index.html.
  // In development, load the Vite dev server URL.
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

// IPC Handlers for Python CLI
ipcMain.handle('start-server', async (_event, args) => {
  // args: { port, protocol, saveDir, sniff }
  const cmdArgs = [
    'start-server',
    '--port',
    args.port,
    '--protocol',
    args.protocol,
    '--save-dir',
    args.saveDir,
  ];
  if (args.sniff) cmdArgs.push('--sniff');
  if (args.interface) cmdArgs.push('--interface', args.interface);

  return spawnPythonProcess(cmdArgs);
});

ipcMain.handle('send-files', async (_event, args) => {
  // args: { files: string[], ip, port, protocol, sniff, delay }
  const cmdArgs = [
    'send-file',
    ...args.files,
    '--ip',
    args.ip,
    '--port',
    args.port,
    '--protocol',
    args.protocol,
  ];
  if (args.sniff) cmdArgs.push('--sniff');
  if (args.interface) cmdArgs.push('--interface', args.interface);
  if (args.delay) cmdArgs.push('--delay', args.delay.toString());
  if (args.chunkSize) cmdArgs.push('--chunk-size', args.chunkSize.toString());

  return spawnPythonProcess(cmdArgs);
});

ipcMain.handle('start-proxy', async (_event, args) => {
  // args: { listenPort, targetIp, targetPort, corruptionRate }
  const cmdArgs = [
    'start-proxy',
    '--listen-port',
    args.listenPort,
    '--target-ip',
    args.targetIp,
    '--target-port',
    args.targetPort,
    '--corruption-rate',
    args.corruptionRate,
  ];
  return spawnPythonProcess(cmdArgs);
});

// Ephemeral command handler (doesn't kill main process)
ipcMain.handle('scan-network', async () => {
  return new Promise((resolve, reject) => {
    const backendDir = path.resolve(__dirname, '../../backend');
    const srcDir = path.join(backendDir, 'src');
    const pythonPath = path.join(backendDir, '.venv/bin/python');
    const moduleName = 'tpi_redes.cli.main';

    // Use execFile or spawn for one-off
    const child = spawn(pythonPath, ['-m', moduleName, 'scan-network'], {
      cwd: backendDir,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        PYTHONPATH: srcDir, // Ensure src is in python path
      },
    });

    let output = '';
    child.stdout.on('data', (d) => {
      output += d.toString();
    });
    child.stderr.on('data', (d) => console.error(`Scan stderr: ${d}`));

    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`Scan failed with code ${code}. Output: ${output}`);
        return reject(new Error(`Scan exited with code ${code}`));
      }
      try {
        // Parse lines, find JSON
        const match = output.match(/\[.*\]/s);
        if (match) {
          resolve(JSON.parse(match[0]));
        } else {
          console.log('No JSON found in scan output', output);
          resolve([]);
        }
      } catch (_e) {
        console.error('Failed to parse scan output:', output);
        resolve([]);
      }
    });
  });
});

import { exec } from 'node:child_process';

ipcMain.handle('stop-process', async () => {
  if (pythonProcess) {
    console.log('Stopping python process via IPC...');
    await killProcessTree(pythonProcess.pid);
    pythonProcess = null;
  }
  return true;
});

// Helper to get local IP
import os from 'node:os';

ipcMain.handle('get-interfaces', async () => {
  return new Promise((resolve) => {
    const backendDir = path.resolve(__dirname, '../../backend');
    const srcDir = path.join(backendDir, 'src');
    const pythonPath = path.join(backendDir, '.venv/bin/python');
    const moduleName = 'tpi_redes.cli.main';

    const child = spawn(pythonPath, ['-m', moduleName, 'list-interfaces'], {
      cwd: backendDir,
      env: { ...process.env, PYTHONPATH: srcDir },
    });

    let output = '';
    child.stdout.on('data', (d) => {
      output += d.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) return resolve([]);
      try {
        resolve(JSON.parse(output));
      } catch {
        resolve([]);
      }
    });
  });
});

ipcMain.handle('get-local-ip', () => {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
});

// File Explorer IPCs
ipcMain.handle('get-downloads-dir', () => {
  return path.resolve(__dirname, '../../backend/received_files');
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
  } catch (e) {
    console.error('List files error:', e);
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
    if (!fs.existsSync(hashFile)) return { valid: false, error: 'No .sha256 file found' };

    const expectedHash = (await fs.promises.readFile(hashFile, 'utf8')).trim();

    // Calculate actual hash
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
  } catch (e: any) {
    return { valid: false, error: e.message };
  }
});

function spawnPythonProcess(args: string[]) {
  // Kill existing process if running
  if (pythonProcess) {
    console.log('Killing existing python process...');
    killProcessTree(pythonProcess.pid);
    pythonProcess = null;
  }

  // Path to python venv. Adjust for uv (.venv)
  const backendDir = path.resolve(__dirname, '../../backend');
  const srcDir = path.join(backendDir, 'src');
  const pythonPath = path.join(backendDir, '.venv/bin/python');

  // Run as module
  const moduleName = 'tpi_redes.cli.main';

  console.log(`Spawning: ${pythonPath} -m ${moduleName} ${args.join(' ')}`);

  // Spawn with stdio pipe

  pythonProcess = spawn(pythonPath, ['-m', moduleName, ...args], {
    cwd: backendDir,
    env: {
      ...process.env,
      PYTHONPATH: srcDir,
      PYTHONUNBUFFERED: '1',
    },
  });

  pythonProcess.on('exit', (code: number, signal: string) => {
    console.log(`Python process exited with code ${code} and signal ${signal}`);
    pythonProcess = null;
  });

  // biome-ignore lint/suspicious/noExplicitAny: Stream data
  pythonProcess.stdout.on('data', (data: any) => {
    const str = data.toString();
    const lines = str.split('\n');

    lines.forEach((line: string) => {
      if (!line.trim()) return;

      try {
        const json = JSON.parse(line);
        const items = Array.isArray(json) ? json : [json];

        // biome-ignore lint/suspicious/noExplicitAny: Parsed JSON
        items.forEach((item: any) => {
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
      } catch (_e) {
        // Not JSON, treat as normal log
      }

      if (mainWindow) {
        mainWindow.webContents.send('python-log', line);
      }
    });
  });

  // biome-ignore lint/suspicious/noExplicitAny: Stream data
  pythonProcess.stderr.on('data', (data: any) => {
    if (mainWindow) {
      mainWindow.webContents.send('python-log', data.toString());
    }
  });

  pythonProcess.on('close', (code: number | null) => {
    if (mainWindow) {
      mainWindow.webContents.send('python-log', `Process exited with code ${code}`);
    }
    pythonProcess = null;
  });

  return 'Process started';
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Helper to kill process tree on Linux
async function killProcessTree(pid: number) {
  return new Promise<void>((resolve) => {
    if (!pid) return resolve();
    // Command to kill children then parent
    // pkill -P <pid> kills children
    exec(`pkill -P ${pid}`, (_err) => {
      // Then kill parent
      try {
        process.kill(pid, 'SIGKILL'); // Force kill parent
      } catch (_e) {
        // Ignore if already dead
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
