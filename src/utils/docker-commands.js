const { execSync } = require('child_process');

function getDockerCommand() {
  try {
    // Tenta o novo comando primeiro
    execSync('docker compose version', { stdio: 'ignore' });
    return 'docker compose';
  } catch (error) {
    // Fallback para o comando antigo
    return 'docker-compose';
  }
}

module.exports = {
  getDockerCommand
};
