const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const stop = async () => {
  const userDir = require('os').homedir();
  const meusSitesPath = path.join(userDir, 'meus-sites');

  try {
    // Lista todos os projetos disponíveis
    const allDirs = fs.readdirSync(meusSitesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .filter(dirent => {
        const dockerFile = path.join(meusSitesPath, dirent.name, 'docker-compose.yml');
        return fs.existsSync(dockerFile);
      })
      .map(dirent => dirent.name);

    if (allDirs.length === 0) {
      console.error('Nenhum projeto WordPress encontrado!');
      process.exit(1);
    }

    // Pergunta qual projeto parar
    const { projectToStop } = await inquirer.prompt([
      {
        type: 'list',
        name: 'projectToStop',
        message: 'Selecione o projeto que deseja parar:',
        choices: allDirs
      }
    ]);

    const projectPath = path.join(meusSitesPath, projectToStop);

    // Para os containers
    console.log(`\nParando o projeto ${projectToStop}...`);
    execSync('docker compose down', {
      cwd: projectPath,
      stdio: 'inherit'
    });

    console.log('\nProjeto parado com sucesso!');

  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
};

module.exports = stop; 