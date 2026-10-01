const { unlink } = require('node:fs/promises');
const { join } = require('node:path');

// A custom electronDist can retain Electron's default shell. Electron loads
// default_app.asar before app.asar, so remove it before creating the ZIP.
module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;
  try {
    await unlink(join(context.appOutDir, 'resources', 'default_app.asar'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
};
