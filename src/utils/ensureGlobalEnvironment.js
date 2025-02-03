const execSync = require('child_process').execSync;

async function ensureGlobalEnvironment() {
  console.log('\nVerificando ambiente global...');
  try {
    const globalContainers = execSync('docker ps --format "{{.Names}}"', { encoding: 'utf-8' });
    
    if (!globalContainers.includes('global-mariadb')) {
      console.log('Ambiente global não está rodando. Iniciando...');
      execSync('cd ~/ricol-global-docker-local-ssl && docker compose up -d', { stdio: 'inherit' });
      
      console.log('Aguardando MariaDB inicializar...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  } catch (error) {
    throw new Error(`Erro ao verificar/iniciar ambiente global: ${error.message}`);
  }
}
// Função auxiliar para criar banco de dados Laravel
async function createWordpressDatabase(dbName) {
  await ensureGlobalEnvironment();
  console.log('\nCriando banco de dados WordPress...');
  const safeDbName = `\`${dbName}\``;
  try {
    // Cria o banco de dados
    execSync(`docker exec global-mariadb mysql -uroot -proot -e 'CREATE DATABASE IF NOT EXISTS ${safeDbName}'`);
    
    // Cria o usuário wordpress se não existir
    execSync(`docker exec global-mariadb mysql -uroot -proot -e "CREATE USER IF NOT EXISTS 'wordpress'@'%' IDENTIFIED BY 'wordpress'"`);
    
    // Concede privilégios ao usuário
    execSync(`docker exec global-mariadb mysql -uroot -proot -e 'GRANT ALL PRIVILEGES ON ${safeDbName}.* TO "wordpress"@"%"'`);
    
    // Atualiza privilégios
    execSync(`docker exec global-mariadb mysql -uroot -proot -e "FLUSH PRIVILEGES"`);
    
    console.log(`Banco de dados ${dbName} criado com sucesso!`);
  } catch (error) {
    throw new Error(`Erro ao criar banco de dados WordPress: ${error.message}`);
  }
}

// Função auxiliar para iniciar os containers
async function startContainers(projectPath, projectUrl, composeProjectName, projectType) {
  console.log('\nIniciando os containers...');
  try {
    execSync('docker compose up -d', {
      cwd: projectPath,
      stdio: 'inherit',
      env: {
        ...process.env,
        SITE_URL: projectUrl,
        COMPOSE_PROJECT_NAME: composeProjectName
      }
    });

    console.log('\nAguardando containers inicializarem...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('\nVerificando status dos containers...');
    const containersStatus = execSync('docker compose ps', {
      cwd: projectPath,
      encoding: 'utf-8'
    });

    if (containersStatus.toLowerCase().includes('exit')) {
      throw new Error('Alguns containers não iniciaram corretamente');
    }

    console.log('\nTodos os containers foram iniciados com sucesso!');
    console.log('\nStatus dos containers:');
    console.log(containersStatus);
    console.log(`\nAcesse seu projeto em: ${projectPath} e faça as instalações e configurações necessárias.`);
    console.log(`\nSeu site está disponível em: https://${projectUrl}`);
  } catch (error) {
    throw new Error(`Erro ao iniciar os containers: ${error.message}`);
  }
}

// Função auxiliar para criar banco de dados Laravel
async function createLaravelDatabase(dbName) {
  await ensureGlobalEnvironment();
  console.log('\nCriando banco de dados Laravel...');

  // Escapa o nome do banco de dados para garantir que ele seja seguro para o shell
  const safeDbName = `\`${dbName}\``;
  const safeUser = 'laravel';
  const safePassword = 'laravel';

  try {
    // Cria o banco de dados, se não existir
    execSync(`docker exec global-mariadb mysql -uroot -proot -e 'CREATE DATABASE IF NOT EXISTS ${safeDbName}'`);

    // Cria o usuário Laravel, se não existir
    execSync(`docker exec global-mariadb mysql -uroot -proot -e "CREATE USER IF NOT EXISTS '${safeUser}'@'%' IDENTIFIED BY '${safePassword}'"`);

    // Concede privilégios ao usuário para o banco de dados
    execSync(`docker exec global-mariadb mysql -uroot -proot -e 'GRANT ALL PRIVILEGES ON ${safeDbName}.* TO "${safeUser}"@"%"'`);

    // Atualiza privilégios
    execSync(`docker exec global-mariadb mysql -uroot -proot -e "FLUSH PRIVILEGES"`);

    console.log(`Banco de dados ${dbName} criado com sucesso!`);
  } catch (error) {
    throw new Error(`Erro ao criar banco de dados Laravel: ${error.message}`);
  }
}

module.exports = {
  ensureGlobalEnvironment, 
  createWordpressDatabase, 
  startContainers, 
  createLaravelDatabase
};
