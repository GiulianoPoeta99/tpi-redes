import { createRequire } from 'node:module';
import { spawn } from 'child_process';
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
const require = createRequire(import.meta.url);
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let mainWindow = null;
let pythonProcess = null;
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
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
};
// IPC Handlers for Python CLI
ipcMain.handle('start-server', async (event, args) => {
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
    if (args.sniff)
        cmdArgs.push('--sniff');
    return spawnPythonProcess(cmdArgs);
});
ipcMain.handle('send-file', async (event, args) => {
    // args: { file, ip, port, protocol, sniff }
    const cmdArgs = [
        'send-file',
        '--file',
        args.file,
        '--ip',
        args.ip,
        '--port',
        args.port,
        '--protocol',
        args.protocol,
    ];
    if (args.sniff)
        cmdArgs.push('--sniff');
    return spawnPythonProcess(cmdArgs);
});
ipcMain.handle('start-proxy', async (event, args) => {
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
                }
                else {
                    console.log('No JSON found in scan output', output);
                    resolve([]);
                }
            }
            catch (e) {
                console.error('Failed to parse scan output:', output);
                resolve([]);
            }
        });
    });
});
import { exec } from 'child_process';
ipcMain.handle('stop-process', async () => {
    if (pythonProcess) {
        console.log('Stopping python process via IPC...');
        await killProcessTree(pythonProcess.pid);
        pythonProcess = null;
    }
    return true;
});
// Helper to get local IP
import os from 'os';
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
function spawnPythonProcess(args) {
    // Kill existing process if running
    if (pythonProcess) {
        console.log('Killing existing python process...');
        killProcessTree(pythonProcess.pid);
        pythonProcess = null;
    }
    // Path to python venv. Adjust for uv (.venv)
    const backendDir = path.resolve(__dirname, '../../backend');
    const pythonPath = path.join(backendDir, '.venv/bin/python');
    // Run as module
    const moduleName = 'tpi_redes.cli.main';
    console.log(`Spawning: ${pythonPath} -m ${moduleName} ${args.join(' ')}`);
    // Spawn with stdio pipe
    pythonProcess = spawn(pythonPath, ['-m', moduleName, ...args], {
        cwd: backendDir,
    }); // Removed env modification that might cause issues
    pythonProcess.on('exit', (code, signal) => {
        console.log(`Python process exited with code ${code} and signal ${signal}`);
        pythonProcess = null;
    });
    pythonProcess.stdout.on('data', (data) => {
        const str = data.toString();
        const lines = str.split('\n');
        lines.forEach((line) => {
            if (!line.trim())
                return;
            try {
                const json = JSON.parse(line);
                if (json.type === 'WINDOW_UPDATE') {
                    if (mainWindow) {
                        mainWindow.webContents.send('window-update', json);
                    }
                    return;
                }
                if (json.type === 'STATS') {
                    if (mainWindow) {
                        mainWindow.webContents.send('stats-update', json);
                    }
                    return;
                }
                if (json.type === 'PACKET_CAPTURE') {
                    if (mainWindow) {
                        mainWindow.webContents.send('packet-capture', json);
                    }
                    return;
                }
            }
            catch (e) {
                // Not JSON, treat as normal log
            }
            if (mainWindow) {
                mainWindow.webContents.send('python-log', line);
            }
        });
    });
    pythonProcess.stderr.on('data', (data) => {
        if (mainWindow) {
            mainWindow.webContents.send('python-log', `ERROR: ${data.toString()}`);
        }
    });
    pythonProcess.on('close', (code) => {
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
async function killProcessTree(pid) {
    return new Promise((resolve) => {
        if (!pid)
            return resolve();
        // Command to kill children then parent
        // pkill -P <pid> kills children
        exec(`pkill -P ${pid}`, (err) => {
            // Then kill parent
            try {
                process.kill(pid, 'SIGKILL'); // Force kill parent
            }
            catch (e) {
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
