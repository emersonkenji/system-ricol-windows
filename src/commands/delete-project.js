const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getProjectPaths } = require('../utils/paths-config');
const { deleteDirectory } = require('../utils/file-operations');
const { detectOS } = require('../utils/detect-os');

const deleteProject = async () => {
  const paths = getProjectPaths();
  const projectsPath = paths.projectsDir;

  try {
    // Verifica se a pasta de projetos existe
    if (!fs.existsSync(projectsPath)) {
      console.error(`Pasta de projetos não encontrada em ${projectsPath}`);
      process.exit(1);
    }

    // Lista todos os projetos disponíveis
    const allDirs = fs.readdirSync(projectsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .filter(dirent => {
        const dockerFile = path.join(projectsPath, dirent.name, 'docker-compose.yml');
        return fs.existsSync(dockerFile);
      })
      .map(dirent => dirent.name);

    if (allDirs.length === 0) {
      console.error(`Nenhum projeto WordPress encontrado em ${projectsPath}`);
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

    const projectPath = path.join(projectsPath, projectToDelete);

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

    // Remove a pasta do projeto usando nossa função cross-platform
    console.log('Removendo arquivos do projeto...');
    deleteDirectory(projectPath);

    console.log(`\nProjeto "${projectToDelete}" foi deletado com sucesso!`);

  } catch (error) {
    console.error('Erro ao deletar projeto:', error.message);
    process.exit(1);
  }
};

module.exports = deleteProject;