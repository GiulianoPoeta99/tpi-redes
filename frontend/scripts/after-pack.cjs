const fs = require('node:fs');
const path = require('node:path');

exports.default = async function afterPack(context) {
  const binaryName = process.platform === 'win32' ? 'tpi-redes-backend.exe' : 'tpi-redes-backend';
  const backendBinary = path.join(context.appOutDir, 'resources', 'backend', binaryName);

  if (!fs.existsSync(backendBinary)) {
    return;
  }

  try {
    fs.chmodSync(backendBinary, 0o755);
  } catch (error) {
    console.warn('Could not chmod backend binary:', error);
  }
};
