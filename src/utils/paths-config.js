const path = require('path');
const { detectOS, normalizeSlashes } = require('./detect-os');

function getProjectPaths() {
  const homeDir = require('os').homedir();
  const os = detectOS();
  
  // Define a pasta base para todo o sistema
  const baseDir = normalizeSlashes(path.join(homeDir, 'ricol-sites'));
  
  // Todos os outros caminhos são relativos à pasta base
  return {
    baseDir: baseDir,
    projectsDir: normalizeSlashes(path.join(baseDir, 'sites')),
    templatesDir: normalizeSlashes(path.join(baseDir, 'templates')),
    globalDir: normalizeSlashes(path.join(baseDir, 'global')),
    logsDir: normalizeSlashes(path.join(baseDir, 'logs')),
    binDir: normalizeSlashes(path.join(baseDir, 'bin'))
  };
}

module.exports = {
  getProjectPaths
};
