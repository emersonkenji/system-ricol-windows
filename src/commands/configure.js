const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getProjectPaths } = require('../utils/paths-config');
const { copyDirectory, setPermissions } = require('../utils/file-operations');
const { detectOS, normalizeSlashes } = require('../utils/detect-os');

const configureEnvironment = async () => {
  const paths = getProjectPaths();
  const rootDir = path.join(__dirname, '..', '..');
  const os = detectOS();

  // Usa os utilitários de caminho
  const normalizedPaths = Object.entries(paths).reduce((acc, [key, value]) => {
    acc[key] = normalizeSlashes(value);
    return acc;
  }, {});

  try {
    // Verifica se o Docker está instalado
    try {
      execSync('docker --version', { stdio: 'ignore' });
    } catch (error) {
      console.error('Docker não está instalado! Por favor, instale primeiro.');
      if (os === 'windows') {
        console.log('Você pode baixar o Docker Desktop em: https://www.docker.com/products/docker-desktop');
      }
      process.exit(1);
    }

    // Cria os diretórios necessários
    console.log('Criando estrutura de diretórios...');
    [
      paths.baseDir,
      paths.projectsDir,
      paths.globalDir,
      paths.templatesDir,
      paths.logsDir,
      paths.binDir
    ].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Diretório criado: ${dir}`);
      }
    });

    // Verifica e copia os templates
    const wpSource = path.join(rootDir, 'ricol-stack-wp-nginx');
    const laravelSource = path.join(rootDir, 'ricol-stack-laravel-nginx');
    const globalSource = path.join(rootDir, 'ricol-global-docker-local-ssl');

    if (!fs.existsSync(wpSource)) {
      console.error(`Template WordPress não encontrado em: ${wpSource}`);
      process.exit(1);
    }

    if (!fs.existsSync(laravelSource)) {
      console.error(`Template Laravel não encontrado em: ${laravelSource}`);
      process.exit(1);
    }

    if (!fs.existsSync(globalSource)) {
      console.error(`Template Global não encontrado em: ${globalSource}`);
      process.exit(1);
    }

    // Copia os templates
    console.log('\nCopiando templates e configurações...');
    
    const wpDest = path.join(paths.templatesDir, 'wordpress');
    const laravelDest = path.join(paths.templatesDir, 'laravel');
    
    copyDirectory(wpSource, wpDest);
    copyDirectory(laravelSource, laravelDest);
    copyDirectory(globalSource, paths.globalDir);

    setPermissions(paths.templatesDir);
    setPermissions(paths.globalDir);

    // Cria as redes do Docker
    console.log('\nConfigurando redes Docker...');
    try {
      execSync('docker network create sr-reverse-proxy', { stdio: 'ignore' });
      console.log('Rede sr-reverse-proxy criada.');
    } catch (error) {
      console.log('Rede sr-reverse-proxy já existe.');
    }

    try {
      execSync('docker network create --subnet=10.0.120.0/24 --gateway=10.0.120.1 sr-public_network', { stdio: 'ignore' });
      console.log('Rede sr-public_network criada.');
    } catch (error) {
      console.log('Rede sr-public_network já existe.');
    }

    console.log('\nConfiguração concluída com sucesso!');
    console.log('\nEstrutura criada:');
    console.log(`Diretório base: ${paths.baseDir}`);
    console.log('├── sites/      (seus projetos)');
    console.log('├── global/     (ambiente global)');
    console.log('├── templates/  (templates de projetos)');
    console.log('├── logs/       (logs do sistema)');
    console.log('└── bin/        (binários e utilitários)');
    
    console.log('\nPróximos passos:');
    console.log('1. Execute "system-ricol global-start" para iniciar o ambiente global');
    console.log('2. Execute "system-ricol create" para criar um novo projeto');

  } catch (error) {
    console.error('Erro durante a configuração:', error.message);
    process.exit(1);
  }
};

module.exports = configureEnvironment;
