const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const createLaravel = async () => {
  const userDir = require('os').homedir();
  const meusSitesPath = path.join(userDir, 'meus-sites');
  const templatePath = path.join(__dirname, '../../ricol-stack-laravel-nginx');
  const validDomains = ['*.dev.localhost', '*.dev.local', '*.dev.test'];

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

    // Pergunta a URL do projeto
    const { projectUrl } = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectUrl',
        message: 'Digite a URL do projeto Laravel (exemplo: meusite.dev.localhost, meusite.dev.local ou meusite.dev.test):',
        validate: input => {
          if (input.trim() === '') return 'A URL não pode estar vazia';
          if (!validDomains.some(domain => input.endsWith(domain))) {
            return 'A URL deve terminar com *.dev.localhost, *.dev.local ou *.dev.test';
          }
          return true;
        }
      }
    ]);

    // Cria o nome da pasta baseado na URL
    const projectName = projectUrl.replace(/\.(dev.localhost|dev.local|dev.test)$/, '');
    const projectPath = path.join(meusSitesPath, projectName);
    
    // Cria um nome válido para o Docker Compose (apenas letras minúsculas, números e hífens)
    const composeProjectName = projectName
      .toLowerCase()
      .replace(/\./g, '-')  // substitui pontos por hífens
      .replace(/[^a-z0-9-]/g, ''); // remove caracteres inválidos

    // Cria um nome para o banco de dados (usando o mesmo padrão do compose project name)
    const dbName = `laravel_${composeProjectName}`;

    // Verifica se o projeto já existe
    if (fs.existsSync(projectPath)) {
      console.error(`Projeto ${projectName} já existe em ${meusSitesPath}`);
      process.exit(1);
    }

    // Copia a pasta template
    console.log('Copiando template...');
    execSync(`cp -r "${templatePath}" "${projectPath}"`);
    execSync(`chmod -R 755 "${projectPath}"`);

    // Atualiza o docker-compose.yml
    const dockerComposePath = path.join(projectPath, 'docker-compose.yml');
    let dockerConfig = fs.readFileSync(dockerComposePath, 'utf8');

    // Substitui as variáveis de ambiente no docker-compose.yml
    dockerConfig = dockerConfig.replace(/WORDPRESS_DB_NAME: wordpress/, `WORDPRESS_DB_NAME: ${dbName}`);
    fs.writeFileSync(dockerComposePath, dockerConfig);

    // Cria arquivo .env com as variáveis
    const envContent = `SITE_URL=${projectUrl}\nCOMPOSE_PROJECT_NAME=${composeProjectName}`;
    fs.writeFileSync(path.join(projectPath, '.env'), envContent);

    console.log(`\nProjeto criado com sucesso em ${projectPath}`);
    console.log(`URL do projeto: https://${projectUrl}`);

    // Verifica se o ambiente global está rodando
    console.log('\nVerificando ambiente global...');
    try {
      const globalContainers = execSync('docker ps --format "{{.Names}}"', { encoding: 'utf-8' });
      
      if (!globalContainers.includes('global-mariadb')) {
        console.log('Ambiente global não está rodando. Iniciando...');
        execSync('cd ~/ricol-global-docker-local-ssl && docker compose up -d', { stdio: 'inherit' });
        
        // Aguarda 10 segundos para o MariaDB inicializar
        console.log('Aguardando MariaDB inicializar...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    } catch (error) {
      console.error('Erro ao verificar/iniciar ambiente global:', error.message);
      process.exit(1);
    }

    // Cria o banco de dados no MariaDB global
    console.log('\nCriando banco de dados...');
    const safeDbName = `\`${dbName}\``;
    try {
      // Usando as credenciais root definidas no docker-compose.yml global
      execSync(`docker exec global-mariadb mysql -uroot -proot -e 'CREATE DATABASE IF NOT EXISTS ${safeDbName}'`);
      execSync(`docker exec global-mariadb mysql -uroot -proot -e 'GRANT ALL PRIVILEGES ON ${safeDbName}.* TO "wordpress"@"%"'`);
      execSync(`docker exec global-mariadb mysql -uroot -proot -e "FLUSH PRIVILEGES"`);
      console.log(`Banco de dados ${dbName} criado com sucesso!`);
    } catch (error) {
      console.error('\nErro ao criar banco de dados:', error.message);
      process.exit(1);
    }

    // Inicia os containers com as variáveis de ambiente
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

      // Aguarda 10 segundos para os containers inicializarem
      console.log('\nAguardando containers inicializarem...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Verifica o status dos containers
      console.log('\nVerificando status dos containers...');
      const containersStatus = execSync('docker compose ps', {
        cwd: projectPath,
        encoding: 'utf-8'
      });

      if (containersStatus.toLowerCase().includes('exit')) {
        console.error('\nAlguns containers não iniciaram corretamente:');
        console.log(containersStatus);
        console.log('\nVerifique os logs com: docker compose logs');
        process.exit(1);
      }

      console.log('\nTodos os containers foram iniciados com sucesso!');
      console.log('\nStatus dos containers:');
      console.log(containersStatus);
      console.log(`\nSeu site está disponível em: https://${projectUrl}`);

    } catch (error) {
      console.error('\nErro ao iniciar os containers:', error.message);
      console.log('\nVocê pode tentar iniciar manualmente com:');
      console.log(`cd ${projectPath} && docker compose up -d`);
      process.exit(1);
    }

  } catch (error) {
    console.error('Erro ao criar projeto:', error.message);
    process.exit(1);
  }
};

module.exports = create; 