const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const globalStart = async () => {
  const userDir = require('os').homedir();
  const globalPath = path.join(userDir, 'ricol-global-docker-local-ssl');

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
      console.error('Pasta ricol-global-docker-local-ssl não encontrada!');
      console.error('Execute primeiro: system-ricol config');
      process.exit(1);
    }

    // Verifica se a rede sr-reverse-proxy existe, se não, cria
    try {
      execSync('docker network inspect sr-reverse-proxy', { stdio: 'ignore' });
      console.log('Rede sr-reverse-proxy já existe.');
    } catch (error) {
      console.log('Criando rede sr-reverse-proxy...');
      execSync('docker network create sr-reverse-proxy');
      console.log('Rede sr-reverse-proxy criada com sucesso.');
    }

    // Verifica se a rede sr-sr-public_network existe, se não, cria
    try {
      execSync('docker network inspect sr-public_network', { stdio: 'ignore' });
      console.log('Rede sr-public_network já existe.');
    } catch (error) {
      console.log('Criando rede sr-public_network...');
      execSync('docker network create --subnet=10.0.120.0/24 --gateway=10.0.120.1 sr-public_network');
      console.log('Rede sr-public_network criada com sucesso.');
    }

    // Inicia os containers
    console.log('\nIniciando containers globais...');
    try {
      execSync('docker compose up -d --force-recreate', {
        cwd: globalPath,
        stdio: 'inherit'
      });
    } catch (error) {
      console.error('\nErro ao iniciar containers:', error.message);
      // Mostra os logs para debug
      try {
        console.log('\nLogs dos containers:');
        execSync('docker compose logs', {
          cwd: globalPath,
          stdio: 'inherit'
        });
      } catch (e) {
        // Ignora erros dos logs
      }
      process.exit(1);
    }

    // Aguarda um pouco para os containers iniciarem
    console.log('\nAguardando containers inicializarem...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verifica o status
    console.log('\nVerificando status dos containers...');
    try {
      const containersStatus = execSync('docker compose ps', {
        cwd: globalPath,
        encoding: 'utf-8'
      });

      console.log('\nStatus dos containers:');
      console.log(containersStatus);

      // Verifica se os containers necessários estão rodando
      const runningContainers = execSync('docker ps --format "{{.Names}}"', {
        encoding: 'utf-8'
      });

      const requiredContainers = ['global-traefik', 'global-mariadb'];
      const missingContainers = requiredContainers.filter(container => 
        !runningContainers.includes(container)
      );

      if (missingContainers.length > 0) {
        console.error('\nAlguns containers não iniciaram corretamente:');
        console.log('Containers faltando:', missingContainers.join(', '));
        process.exit(1);
      }

      console.log('\nTodos os containers foram iniciados com sucesso!');

    } catch (error) {
      console.error('\nErro ao verificar status:', error.message);
      process.exit(1);
    }

  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
};

module.exports = globalStart; 