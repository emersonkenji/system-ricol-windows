const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const deleteProject = async () => {
  const userDir = require('os').homedir();
  const meusSitesPath = path.join(userDir, 'meus-sites');

  try {
    // Verifica se a pasta meus-sites existe
    if (!fs.existsSync(meusSitesPath)) {
      console.error(`Pasta meus-sites não encontrada em ${meusSitesPath}`);
      process.exit(1);
    }

    // Lista todos os projetos disponíveis
    const allDirs = fs.readdirSync(meusSitesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .filter(dirent => {
        const dockerFile = path.join(meusSitesPath, dirent.name, 'docker-compose.yml');
        return fs.existsSync(dockerFile);
      })
      .map(dirent => dirent.name);

    if (allDirs.length === 0) {
      console.error(`Nenhum projeto WordPress encontrado em ${meusSitesPath}`);
      process.exit(1);
    }

    // Pergunta qual projeto deletar
    const { projectToDelete } = await inquirer.prompt([
      {
        type: 'list',
        name: 'projectToDelete',
        message: 'Selecione o projeto que deseja deletar:',
        choices: allDirs
      }
    ]);

    // Confirmação adicional
    const { confirmDelete } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmDelete',
        message: `Tem certeza que deseja deletar o projeto "${projectToDelete}"? Esta ação não pode ser desfeita!`,
        default: false
      }
    ]);

    if (!confirmDelete) {
      console.log('Operação cancelada.');
      process.exit(0);
    }

    const projectPath = path.join(meusSitesPath, projectToDelete);

    // Para os containers se estiverem rodando
    console.log('Parando containers do projeto...');
    try {
      execSync('docker compose down', {
        cwd: projectPath,
        stdio: 'inherit'
      });
    } catch (error) {
      // Ignora erros aqui, pois os containers podem não estar rodando
    }

    // Remove a pasta do projeto
    console.log('Removendo arquivos do projeto...');
    execSync(`rm -rf "${projectPath}"`);

    console.log(`\nProjeto "${projectToDelete}" foi deletado com sucesso!`);

  } catch (error) {
    console.error('Erro ao deletar projeto:', error.message);
    process.exit(1);
  }
};

module.exports = deleteProject; 