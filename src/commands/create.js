const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const create = async () => {
  const userDir = require('os').homedir();
  const meusSitesPath = path.join(userDir, 'meus-sites');
  const wpTemplatePath = path.join(__dirname, '../../ricol-stack-wp-nginx');
  const laravelTemplatePath = path.join(__dirname, '../../ricol-stack-laravel-nginx');
  const validDomains = ['.dev.localhost', '.dev.local', '.dev.test'];
  const os = require('os');
  const userName = os.userInfo().username;

  try {
    // Verifica se a pasta meus-sites existe, se não, cria
    if (!fs.existsSync(meusSitesPath)) {
      fs.mkdirSync(meusSitesPath, { recursive: true });
      console.log(`Pasta meus-sites criada em ${meusSitesPath}`);
    }

    // Verifica se o Docker está instalado
    try {
      execSync('docker --version');
    } catch (error) {
      console.error('Docker não está instalado! Por favor, instale primeiro.');
      process.exit(1);
    }

    // Primeiro, pergunta o tipo de projeto
    const { projectType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'projectType',
        message: 'Qual tipo de projeto você deseja criar?',
        choices: [
          { name: 'WordPress', value: 'wordpress' },
          { name: 'Laravel', value: 'laravel' }
        ]
      }
    ]);

    // Pergunta a URL do projeto
    const { projectUrl } = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectUrl',
        message: 'Digite a URL do projeto (exemplo: meusite.dev.localhost, meusite.dev.local ou meusite.dev.test):',
        validate: input => {
          if (input.trim() === '') return 'A URL não pode estar vazia';
          if (!validDomains.some(domain => input.endsWith(domain))) {
            return 'A URL deve terminar com *.dev.localhost, *.dev.local ou *.dev.test';
          }
          return true;
        }
      }
    ]);

    // Pergunta a versão do php
    const { phpVersion } = await inquirer.prompt([
      {
        type: 'list',
        name: 'phpVersion',
        message: 'escolha a versão do php?',
        choices: [
          { name: '8.3', value: 'php:8.3-fpm' },
          { name: '8.2', value: 'php:8.2-fpm' },
          { name: '8.1', value: 'php:8.1-fpm' },
          { name: '8.0', value: 'php:8.0-fpm' },
          { name: '7.4', value: 'php:7.4-fpm' },
          { name: '7.3', value: 'php:7.3-fpm' },
        ]
      }
    ]);

    console.log(phpVersion);

    // Cria o nome da pasta baseado na URL
    const projectName = projectUrl.replace(/\.(dev.localhost|dev.local|dev.test)$/, '');
    const projectPath = path.join(meusSitesPath, projectName);
    
    // Cria um nome válido para o Docker Compose
    const composeProjectName = projectName
      .toLowerCase()
      .replace(/\./g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Verifica se o projeto já existe
    if (fs.existsSync(projectPath)) {
      console.error(`Projeto ${projectName} já existe em ${meusSitesPath}`);
      process.exit(1);
    }

    // Seleciona o template baseado no tipo de projeto
    const templatePath = projectType === 'wordpress' ? wpTemplatePath : laravelTemplatePath;

    // Copia a pasta template
    console.log('Copiando template...');
    execSync(`cp -r "${templatePath}" "${projectPath}"`);
    execSync(`chmod -R 755 "${projectPath}"`);

    // Configurações específicas para cada tipo de projeto
    if (projectType === 'wordpress') {
      // Configuração do WordPress
      const dbName = `wp_${composeProjectName}`;
      const dockerComposePath = path.join(projectPath, 'docker-compose.yml');
      let dockerConfig = fs.readFileSync(dockerComposePath, 'utf8');
      dockerConfig = dockerConfig
        .replace(/WORDPRESS_DB_NAME: wordpress/, `WORDPRESS_DB_NAME: ${dbName}`)
        .replace(/<USER_NAME>/g, userName)
        .replace(/<PHP_IMAGE>/g, phpVersion);
      fs.writeFileSync(dockerComposePath, dockerConfig);

      // Cria o banco de dados para WordPress
      await createWordPressDatabase(dbName);
    } else {
      // Configuração do Laravel
      const dbName = `laravel_${composeProjectName}`;
      
      // Configura o docker-compose.yml
      const dockerComposePath = path.join(projectPath, 'docker-compose.yml');
      let dockerConfig = fs.readFileSync(dockerComposePath, 'utf8');
      
      // Atualiza apenas as labels do Traefik
      dockerConfig = dockerConfig
        .replace(/<labels>/g, composeProjectName)
        .replace(/example\.localhost/g, projectUrl)
        .replace(/<USER_NAME>/g, userName)
        .replace(/<PHP_IMAGE>/g, phpVersion);
      
      fs.writeFileSync(dockerComposePath, dockerConfig);

      // Cria a pasta system
      const systemPath = path.join(projectPath, 'system');
      fs.mkdirSync(systemPath, { recursive: true });

      // Cria o banco de dados para Laravel
      await createLaravelDatabase(dbName);
    }

    // Cria arquivo .env com as variáveis
    const envContent = `SITE_URL=${projectUrl}\nCOMPOSE_PROJECT_NAME=${composeProjectName}`;
    fs.writeFileSync(path.join(projectPath, '.env'), envContent);

    console.log(`\nProjeto ${projectType} criado com sucesso em ${projectPath}`);
    console.log(`URL do projeto: https://${projectUrl}`);

    // Inicia os containers
    await startContainers(projectPath, projectUrl, composeProjectName, projectType);

  } catch (error) {
    console.error('Erro ao criar projeto:', error.message);
    process.exit(1);
  }
};

// Função auxiliar para criar banco de dados WordPress
async function createWordPressDatabase(dbName) {
  await ensureGlobalEnvironment();
  console.log('\nCriando banco de dados WordPress...');
  const safeDbName = `\`${dbName}\``;
  try {
    execSync(`docker exec global-mariadb mysql -uroot -proot -e 'CREATE DATABASE IF NOT EXISTS ${safeDbName}'`);
    execSync(`docker exec global-mariadb mysql -uroot -proot -e 'GRANT ALL PRIVILEGES ON ${safeDbName}.* TO "wordpress"@"%"'`);
    execSync(`docker exec global-mariadb mysql -uroot -proot -e "FLUSH PRIVILEGES"`);
    console.log(`Banco de dados ${dbName} criado com sucesso!`);
  } catch (error) {
    throw new Error(`Erro ao criar banco de dados WordPress: ${error.message}`);
  }
}

// Função auxiliar para criar banco de dados Laravel
async function createLaravelDatabase(dbName) {
  await ensureGlobalEnvironment();
  console.log('\nCriando banco de dados Laravel...');
  const safeDbName = `\`${dbName}\``;
  try {
    // Cria o banco de dados
    execSync(`docker exec global-mariadb mysql -uroot -proot -e 'CREATE DATABASE IF NOT EXISTS ${safeDbName}'`);
    
    // Cria o usuário laravel se não existir e define a senha
    execSync(`docker exec global-mariadb mysql -uroot -proot -e "CREATE USER IF NOT EXISTS 'laravel'@'%' IDENTIFIED BY 'laravel'"`);
    
    // Concede privilégios ao usuário
    execSync(`docker exec global-mariadb mysql -uroot -proot -e 'GRANT ALL PRIVILEGES ON ${safeDbName}.* TO "laravel"@"%"'`);
    
    // Atualiza privilégios
    execSync(`docker exec global-mariadb mysql -uroot -proot -e "FLUSH PRIVILEGES"`);
    
    console.log(`Banco de dados ${dbName} criado com sucesso!`);
  } catch (error) {
    throw new Error(`Erro ao criar banco de dados Laravel: ${error.message}`);
  }
}

// Função auxiliar para garantir que o ambiente global está rodando
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
    console.log(`\nSeu site está disponível em: https://${projectUrl}`);
  } catch (error) {
    throw new Error(`Erro ao iniciar os containers: ${error.message}`);
  }
}

module.exports = create; 