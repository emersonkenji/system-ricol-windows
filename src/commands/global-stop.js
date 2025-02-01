const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const globalStop = async () => {
  const userDir = require('os').homedir();
  const globalPath = path.join(userDir, 'ricol-global-docker-local-ssl');

  try {
    // Verifica se a pasta global existe
    if (!fs.existsSync(globalPath)) {
      console.error('Pasta ricol-global-docker-local-ssl não encontrada!');
      console.error('Execute primeiro: system-ricol config');
      process.exit(1);
    }

    // Para os containers
    console.log('Parando containers...');
    execSync('docker compose down', {
      cwd: globalPath,
      stdio: 'inherit'
    });

    console.log('\nTodos os containers foram parados com sucesso!');

  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
};

module.exports = globalStop; 