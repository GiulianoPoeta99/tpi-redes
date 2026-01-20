import { dialog } from 'electron';
import { exec } from 'node:child_process';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Check if Npcap is installed on Windows by checking the registry
 */
export async function isNpcapInstalled(): Promise<boolean> {
  if (process.platform !== 'win32') {
    // On non-Windows, assume libpcap is available
    return true;
  }

  try {
    // Check Windows registry for Npcap installation
    const { stdout } = await execAsync(
      'reg query "HKLM\\SOFTWARE\\Npcap" /ve',
    );
    return stdout.includes('Npcap');
  } catch (_error) {
    // Also check for WinPcap as fallback
    try {
      const { stdout } = await execAsync(
        'reg query "HKLM\\SOFTWARE\\WinPcap" /ve',
      );
      return stdout.includes('WinPcap');
    } catch (_err) {
      return false;
    }
  }
}

/**
 * Get the path to the bundled Npcap installer
 */
function getNpcapInstallerPath(): string {
  // In development
  if (process.env.NODE_ENV === 'development') {
    return path.join(__dirname, '..', 'installers', 'npcap-installer.exe');
  }
  
  // In production (bundled with electron-builder)
  return path.join(process.resourcesPath, 'npcap-installer.exe');
}

/**
 * Download Npcap installer if not bundled
 */
async function downloadNpcapInstaller(savePath: string): Promise<boolean> {
  // Npcap download URL (using the OEM version if available, or latest version)
  // Note: For production, you should bundle the installer or use Npcap OEM license
  const NPCAP_DOWNLOAD_URL = 'https://npcap.com/dist/npcap-1.79.exe';

  return new Promise((resolve) => {
    const file = fs.createWriteStream(savePath);
    
    https.get(NPCAP_DOWNLOAD_URL, (response) => {
      if (response.statusCode !== 200) {
        console.error(`Failed to download Npcap: ${response.statusCode}`);
        resolve(false);
        return;
      }

      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', (err) => {
      fs.unlink(savePath, () => {});
      console.error('Error downloading Npcap:', err);
      resolve(false);
    });
  });
}

/**
 * Install Npcap on Windows
 */
export async function installNpcap(): Promise<{ success: boolean; message: string }> {
  if (process.platform !== 'win32') {
    return {
      success: false,
      message: 'Npcap installation is only supported on Windows',
    };
  }

  // Check if already installed
  if (await isNpcapInstalled()) {
    return {
      success: true,
      message: 'Npcap is already installed',
    };
  }

  // Show dialog to user
  const result = await dialog.showMessageBox({
    type: 'warning',
    title: 'Npcap Required',
    message: 'Packet capture requires Npcap',
    detail:
      'Npcap is required for packet sniffing functionality. Would you like to install it now?\n\n' +
      'The Npcap installer will open with its setup wizard. ' +
      'Follow the on-screen instructions to complete the installation.\n\n' +
      'Note: Administrator privileges are required.',
    buttons: ['Install Npcap', 'Skip', 'More Info'],
    defaultId: 0,
    cancelId: 1,
  });

  if (result.response === 2) {
    // More Info - open Npcap website
    const { shell } = require('electron');
    await shell.openExternal('https://npcap.com/');
    return {
      success: false,
      message: 'User requested more information',
    };
  }

  if (result.response === 1) {
    // User chose to skip
    return {
      success: false,
      message: 'User declined Npcap installation',
    };
  }

  // Get installer path
  let installerPath = getNpcapInstallerPath();

  // Check if installer exists
  if (!fs.existsSync(installerPath)) {
    console.log('Npcap installer not found in bundle, attempting download...');
    
    const tempPath = path.join(process.env.TEMP || '/tmp', 'npcap-installer.exe');
    const downloaded = await downloadNpcapInstaller(tempPath);
    
    if (!downloaded) {
      return {
        success: false,
        message: 'Failed to download Npcap installer',
      };
    }
    
    installerPath = tempPath;
  }

  // Run installer with administrator privileges
  try {
    // On Windows, execute installer interactively (NOT silent)
    // Silent installation (/S) is only available in Npcap OEM version
    // We launch the installer GUI and let the user complete it
    
    await execAsync(`powershell -Command "Start-Process '${installerPath}' -Verb RunAs -Wait"`);

    // Wait a bit for installation to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify installation
    if (await isNpcapInstalled()) {
      return {
        success: true,
        message: 'Npcap installed successfully',
      };
    }
    
    return {
      success: false,
      message: 'Npcap installation was not completed. Please install it manually.',
    };
  } catch (error) {
    console.error('Error installing Npcap:', error);
    return {
      success: false,
      message: `Failed to launch Npcap installer: ${error}`,
    };
  }
}

/**
 * Show a dialog prompting the user to install Npcap
 */
export async function promptNpcapInstallation(): Promise<boolean> {
  try {
    const result = await installNpcap();
    
    if (result.success) {
      await dialog.showMessageBox({
        type: 'info',
        title: 'Success',
        message: 'Npcap installed successfully',
        detail: 'You can now use packet capture features. You may need to restart the application.',
      });
      return true;
    }
    
    if (result.message !== 'User declined Npcap installation') {
      await dialog.showMessageBox({
        type: 'warning',
        title: 'Npcap Not Installed',
        message: 'Packet capture features will be disabled',
        detail: result.message + '\n\nYou can install Npcap manually from https://npcap.com/',
      });
    }
    
    return false;
  } catch (error) {
    console.error('Error in promptNpcapInstallation:', error);
    // Don't show error dialog, just log it
    // App should continue working without packet capture
    return false;
  }
}
