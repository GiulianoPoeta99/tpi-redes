"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    electron_1.app.quit();
}
let mainWindow = null;
let pythonProcess = null;
const createWindow = () => {
    // Create the browser window.
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
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
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
};
// IPC Handlers for Python CLI
electron_1.ipcMain.handle('start-server', async (event, args) => {
    // args: { port, protocol, saveDir, sniff }
    const cmdArgs = ['start-server', '--port', args.port, '--protocol', args.protocol, '--save-dir', args.saveDir];
    if (args.sniff)
        cmdArgs.push('--sniff');
    return spawnPythonProcess(cmdArgs);
});
electron_1.ipcMain.handle('send-file', async (event, args) => {
    // args: { file, ip, port, protocol, sniff }
    const cmdArgs = ['send-file', '--file', args.file, '--ip', args.ip, '--port', args.port, '--protocol', args.protocol];
    if (args.sniff)
        cmdArgs.push('--sniff');
    return spawnPythonProcess(cmdArgs);
});
function spawnPythonProcess(args) {
    if (pythonProcess) {
        pythonProcess.kill();
    }
    // Path to python venv. Adjust as needed for dev/prod.
    // In dev, we assume we are in frontend/ and backend is in ../backend
    const pythonPath = path_1.default.resolve(__dirname, '../../backend/venv/bin/python');
    const scriptPath = path_1.default.resolve(__dirname, '../../backend/src/tpi_redes/cli/main.py');
    console.log(`Spawning: ${pythonPath} ${scriptPath} ${args.join(' ')}`);
    pythonProcess = (0, child_process_1.spawn)(pythonPath, [scriptPath, ...args]);
    pythonProcess.stdout.on('data', (data) => {
        if (mainWindow) {
            mainWindow.webContents.send('python-log', data.toString());
        }
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
    return "Process started";
}
electron_1.app.on('ready', createWindow);
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
