const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getProjectPaths } = require('../utils/paths-config');
const dotenv = require('dotenv');
const { detectOS, normalizeSlashes } = require('../utils/detect-os');

const start = async () => {
  const paths = getProjectPaths();
  const projectsPath = paths.projectsDir;

  try {
    // Lista todos os projetos disponíveis
    const allDirs = fs.readdirSync(projectsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .filter(dirent => {
        const dockerFile = path.join(projectsPath, dirent.name, 'docker-compose.yml');
        return fs.existsSync(dockerFile);
      })
      .map(dirent => dirent.name);

    if (allDirs.length === 0) {
      console.error('Nenhum projeto encontrado!');
      console.log(`Verifique se existem projetos em: ${projectsPath}`);
      console.log('Para criar um novo projeto, use: system-ricol create');
      process.exit(1);
    }

    // Pergunta qual projeto iniciar
    const { projectToStart } = await inquirer.prompt([
      {
        type: 'list',
        name: 'projectToStart',
        message: 'Selecione o projeto que deseja iniciar:',
        choices: allDirs
      }
    ]);

    // Ajusta os caminhos para o SO atual
    const projectPath = normalizeSlashes(path.join(projectsPath, projectToStart));

    // Verifica se o ambiente global está rodando
    console.log('\nVerificando ambiente global...');
    try {
      const globalContainers = execSync('docker ps --format "{{.Names}}"', {
        encoding: 'utf-8'
      });

      const trafikRunning = globalContainers.includes('traefik');
      const mariadbRunning = globalContainers.includes('mariadb');

      if (!trafikRunning || !mariadbRunning) {
        console.log('Serviços globais não estão rodando corretamente:');
        console.log(`Traefik: ${trafikRunning ? 'Rodando' : 'Parado'}`);
        console.log(`MariaDB: ${mariadbRunning ? 'Rodando' : 'Parado'}`);
        console.log('\nIniciando ambiente global...');

        execSync('docker compose up -d', {
          cwd: paths.globalDir,
          stdio: 'inherit'
        });
        
        console.log('\nAguardando inicialização do ambiente global...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.log('Ambiente global está rodando corretamente.');
      }
    } catch (error) {
      console.error('Erro ao verificar ambiente global:', error.message);
      process.exit(1);
    }

    // Inicia os containers
    console.log(`\nIniciando o projeto ${projectToStart}...`);
    execSync('docker compose up -d', {
      cwd: projectPath,
      stdio: 'inherit'
    });

    // Verifica o status
    console.log('\nVerificando status dos containers...');
    const containersStatus = execSync('docker compose ps', {
      cwd: projectPath,
      encoding: 'utf-8'
    });

    if (containersStatus.toLowerCase().includes('exit')) {
      console.error('\nAlguns containers não iniciaram corretamente:');
      console.log(containersStatus);
      process.exit(1);
    }

    console.log('\nProjeto iniciado com sucesso!');
    console.log('\nStatus dos containers:');
    console.log(containersStatus);

    // Lê o arquivo .env e pega a URL
    const envPath = path.join(projectPath, '.env');
    if (fs.existsSync(envPath)) {
      const envConfig = dotenv.parse(fs.readFileSync(envPath));
      const siteUrl = envConfig.SITE_URL || 'SITE_URL não definida no arquivo .env';
      console.log(`\nURL do projeto: https://${siteUrl}`);
    } else {
      console.log('\nArquivo .env não encontrado no projeto.');
    }

  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
};

module.exports = start;