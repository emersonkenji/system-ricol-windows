const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');

const start = async () => {
  const userDir = require('os').homedir();
  const meusSitesPath = path.join(userDir, 'meus-sites');
  const globalPath = path.join(userDir, 'ricol-global-docker-local-ssl');

  try {
    // Verifica se o ambiente global está rodando corretamente
    console.log('Verificando ambiente global...');
    let trafikRunning = false;
    let mariadbRunning = false;

    try {
      const globalStatus = execSync('docker ps --format "{{.Names}}"', {
        encoding: 'utf-8'
      });

      trafikRunning = globalStatus.includes('traefik');
      mariadbRunning = globalStatus.includes('mariadb');

      if (!trafikRunning || !mariadbRunning) {
        console.log('Serviços globais não estão rodando corretamente:');
        console.log(`Traefik: ${trafikRunning ? 'Rodando' : 'Parado'}`);
        console.log(`MariaDB: ${mariadbRunning ? 'Rodando' : 'Parado'}`);
        console.log('\nIniciando ambiente global...');

        execSync('docker compose up -d', {
          cwd: globalPath,
          stdio: 'inherit'
        });

        // Aguarda 10 segundos para os containers inicializarem
        console.log('\nAguardando inicialização do ambiente global...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Verifica novamente o status
        const newStatus = execSync('docker ps --format "{{.Names}}"', {
          encoding: 'utf-8'
        });

        trafikRunning = newStatus.includes('traefik');
        mariadbRunning = newStatus.includes('mariadb');

        if (!trafikRunning || !mariadbRunning) {
          console.error('Erro: Não foi possível iniciar todos os serviços globais!');
          process.exit(1);
        }

        console.log('\nAmbiente global iniciado com sucesso!');
      } else {
        console.log('Ambiente global está rodando corretamente.');
      }
    } catch (error) {
      console.error('Erro ao verificar ambiente global:', error.message);
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
      console.error('Nenhum projeto WordPress encontrado!');
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

    const projectPath = path.join(meusSitesPath, projectToStart);

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

    // // Lê o arquivo .env e pega a URL
    const envPath = path.join(projectPath, '.env');
    if (fs.existsSync(envPath)) {
      const envConfig = dotenv.parse(fs.readFileSync(envPath));
      const siteUrl = envConfig.SITE_URL || 'SITE_URL não definida no arquivo .env';
      console.log(`\nSITE_URL do projeto: https://${siteUrl}`);
    } else {
      console.log('\nArquivo .env não encontrado no projeto.');
    }

  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
};

module.exports = start;