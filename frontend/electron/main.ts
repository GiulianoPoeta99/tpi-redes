import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { spawn } from 'child_process';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let pythonProcess: any = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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
ipcMain.handle('start-server', async (event, args) => {
    // args: { port, protocol, saveDir, sniff }
    const cmdArgs = ['start-server', '--port', args.port, '--protocol', args.protocol, '--save-dir', args.saveDir];
    if (args.sniff) cmdArgs.push('--sniff');
    
    return spawnPythonProcess(cmdArgs);
});

ipcMain.handle('send-file', async (event, args) => {
    // args: { file, ip, port, protocol, sniff }
    const cmdArgs = ['send-file', '--file', args.file, '--ip', args.ip, '--port', args.port, '--protocol', args.protocol];
    if (args.sniff) cmdArgs.push('--sniff');

    return spawnPythonProcess(cmdArgs);
});

function spawnPythonProcess(args: string[]) {
    if (pythonProcess) {
        pythonProcess.kill();
    }

    // Path to python venv. Adjust for uv (.venv)
    const backendDir = path.resolve(__dirname, '../../backend');
    const pythonPath = path.join(backendDir, '.venv/bin/python');
    
    // Run as module
    const moduleName = 'tpi_redes.cli.main';

    console.log(`Spawning: ${pythonPath} -m ${moduleName} ${args.join(' ')}`);

    pythonProcess = spawn(pythonPath, ['-m', moduleName, ...args], {
        cwd: backendDir,
        env: { ...process.env, PYTHONPATH: 'src' }
    });

    pythonProcess.stdout.on('data', (data: any) => {
        const str = data.toString();
        const lines = str.split('\n');
        
        lines.forEach((line: string) => {
            if (!line.trim()) return;
            
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
            } catch (e) {
                // Not JSON, treat as normal log
            }

            if (mainWindow) {
                mainWindow.webContents.send('python-log', line);
            }
        });
    });

    pythonProcess.stderr.on('data', (data: any) => {
        if (mainWindow) {
            mainWindow.webContents.send('python-log', `ERROR: ${data.toString()}`);
        }
    });

    pythonProcess.on('close', (code: any) => {
        if (mainWindow) {
            mainWindow.webContents.send('python-log', `Process exited with code ${code}`);
        }
        pythonProcess = null;
    });

    return "Process started";
}


app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
