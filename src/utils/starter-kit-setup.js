const { execSync } = require('child_process');
const path = require('path');

async function setupStarterKit(projectPath) {
  try {
    const command = `laravel new ${path.basename(projectPath)} --no-interaction`;
    
    console.log(`Executando: ${command}`);
    execSync(command, { 
      cwd: path.dirname(projectPath),
      stdio: 'inherit' 
    });

    console.log('Projeto Laravel básico criado com sucesso!');
  } catch (error) {
    console.error('Erro ao criar projeto Laravel:', error.message);
    throw error;
  }
}

module.exports = { setupStarterKit };