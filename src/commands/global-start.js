const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getProjectPaths } = require('../utils/paths-config');

const globalStart = async () => {
  const paths = getProjectPaths();
  const globalPath = paths.globalDir;

  try {
    // Verifica se o Docker está instalado
    try {
      execSync('docker --version');
    } catch (error) {
      console.error('Docker não está instalado! Por favor, instale primeiro.');
      process.exit(1);
    }

    // Verifica se a pasta global existe
    if (!fs.existsSync(globalPath)) {
      console.error('Ambiente global não encontrado!');
      console.error('Execute primeiro: system-ricol config');
      process.exit(1);
    }

    // Verifica se as redes necessárias existem
    try {
      execSync('docker network inspect sr-reverse-proxy', { stdio: 'ignore' });
    } catch (error) {
      console.log('Criando rede sr-reverse-proxy...');
      execSync('docker network create sr-reverse-proxy');
    }

    try {
      execSync('docker network inspect sr-public_network', { stdio: 'ignore' });
    } catch (error) {
      console.log('Criando rede sr-public_network...');
      execSync('docker network create --subnet=10.0.120.0/24 --gateway=10.0.120.1 sr-public_network');
    }

    // Inicia os containers
    console.log('Iniciando ambiente global...');
    execSync('docker compose up -d', {
      cwd: globalPath,
      stdio: 'inherit'
    });

    console.log('\nAguardando containers inicializarem...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Verifica o status
    const containersStatus = execSync('docker compose ps', {
      cwd: globalPath,
      encoding: 'utf-8'
    });

    console.log('\nStatus dos containers:');
    console.log(containersStatus);

    if (containersStatus.toLowerCase().includes('exit')) {
      console.error('\nAlguns containers não iniciaram corretamente!');
      process.exit(1);
    }

    console.log('\nAmbiente global iniciado com sucesso!');

  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
};

module.exports = globalStart;