const os = require('os');
const path = require('path');

function detectOS() {
  const platform = os.platform();
  if (platform === 'win32') return 'windows';
  if (platform === 'darwin') return 'mac';
  return 'linux';
}

function getHomeDir() {
  // Garante que o diretório home seja encontrado corretamente em qualquer SO
  return require('os').homedir();
}

function normalizeSlashes(filePath) {
  // Garante que as barras estejam no formato correto para cada SO
  return filePath.replace(/\\/g, '/');
}

module.exports = {
  detectOS,
  getHomeDir,
  normalizeSlashes
};
