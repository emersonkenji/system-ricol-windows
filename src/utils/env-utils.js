const fs = require('fs');
const path = require('path');

/**
 * Cria um arquivo .env para o projeto
 * @param {string} projectPath - Caminho do diretório do projeto
 * @param {string} projectUrl - URL do projeto (ex: projeto.dev.localhost)
 * @param {string} composeProjectName - Nome do projeto para o Docker Compose
 * @param {Object} additionalVars - Variáveis adicionais para incluir no arquivo .env (opcional)
 */
function createEnvFile(projectPath, projectUrl, composeProjectName, additionalVars = {}) {
  try {
    // Variáveis básicas para todos os projetos
    let envContent = `SITE_URL=${projectUrl}\nCOMPOSE_PROJECT_NAME=${composeProjectName}\n`;
    
    // Adiciona variáveis extras se fornecidas
    if (additionalVars && typeof additionalVars === 'object') {
      Object.entries(additionalVars).forEach(([key, value]) => {
        envContent += `${key}=${value}\n`;
      });
    }
    
    // Escreve o arquivo .env
    const envPath = path.join(projectPath, '.env');
    fs.writeFileSync(envPath, envContent);
    
    console.log(`Arquivo .env criado em: ${envPath}`);
    return true;
  } catch (error) {
    console.error(`Erro ao criar arquivo .env: ${error.message}`);
    return false;
  }
}

module.exports = {
  createEnvFile
};
