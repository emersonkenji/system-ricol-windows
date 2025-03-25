const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { startContainers } = require('../utils/ensureGlobalEnvironment');
const { createLaravelDatabase, createWordpressDatabase } = require('../utils/db-installer');
const { ensureWPCLI } = require('../utils/wp-cli-installer');
const { setupWordPress } = require('../utils/wp-cli');
const { configureLaravelProject, configureEnv, bootstrappingProject } = require('../utils/laravel-installer');
const { detectOS, getHomeDir, normalizeSlashes } = require('../utils/detect-os');
const { copyDirectory, setPermissions } = require('../utils/file-operations');
const { getProjectPaths } = require('../utils/paths-config');
const { getUserName } = require('../utils/user-info');
const { createEnvFile } = require('../utils/env-utils');

const create = async () => {
  const paths = getProjectPaths();
  const projectsPath = paths.projectsDir;
  const userName = getUserName();

  const os = detectOS();
  const homeDir = getHomeDir();

  // Ajusta os caminhos base dependendo do SO
  const basePath = os === 'windows'
    ? normalizeSlashes(path.join(process.env.APPDATA, 'system-ricol'))
    : normalizeSlashes(path.join(homeDir, '.system-ricol'));

  // Ajusta os caminhos do template
  const wpTemplatePath = path.join(paths.templatesDir, 'wordpress');
  const laravelTemplatePath = path.join(paths.templatesDir, 'laravel');
  const validDomains = ['.dev.localhost', '.dev.local', '.dev.test'];

  try {
    // Verifica/cria diretórios necessários
    if (!fs.existsSync(projectsPath)) {
      fs.mkdirSync(projectsPath, { recursive: true });
      console.log(`Pasta de projetos criada em ${projectsPath}`);
    }

    try {
      execSync('docker --version');
    } catch (error) {
      console.error('Docker não está instalado! Por favor, instale primeiro.');
      process.exit(1);
    }

    // Verifica se os templates existem
    if (!fs.existsSync(wpTemplatePath)) {
      console.error('Templates não encontrados!');
      console.error('Execute primeiro: system-ricol config');
      process.exit(1);
    }

    // Rest of your existing prompt code...
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

    const projectName = projectUrl.replace(/\.(dev.localhost|dev.local|dev.test)$/, '');
    const projectPath = normalizeSlashes(path.join(projectsPath, projectName));
    const defaultConfPath = path.join(projectPath, 'config/nginx');
    const composeProjectName = projectName
      .toLowerCase()
      .replace(/\./g, '-')
      .replace(/[^a-z0-9-]/g, '');

    if (fs.existsSync(projectPath)) {
      console.error(`Projeto ${projectName} já existe em ${projectsPath}`);
      process.exit(1);
    }
    const labels = `${composeProjectName}dev`;

    const templatePath = projectType === 'wordpress' ? wpTemplatePath : laravelTemplatePath;

    console.log('Informações do template:');
    console.log(`Origem: ${templatePath}`);
    console.log(`Destino: ${projectPath}`);

    try {
      copyDirectory(templatePath, projectPath);
    } catch (error) {
      console.error('Falha ao copiar template:', error.message);
      process.exit(1);
    }

    setPermissions(projectPath);

    if (projectType === 'wordpress') {

      // const envContent = `SITE_URL=${projectUrl}\nCOMPOSE_PROJECT_NAME=${composeProjectName}`;
      // fs.writeFileSync(path.join(projectPath, '.env'), envContent);
      createEnvFile(projectPath, projectUrl, composeProjectName);

      // WordPress specific setup
      const dbName = `wp_${composeProjectName}`;
      const dockerComposePath = normalizeSlashes(path.join(projectPath, 'docker-compose.yml'));

      let dockerConfig = fs.readFileSync(dockerComposePath, 'utf8');
      dockerConfig = dockerConfig
        .replace(/WORDPRESS_DB_NAME: wordpress/, `WORDPRESS_DB_NAME: ${dbName}`)
        .replace(/<labels>/g, labels)
        .replace(/<SITE_NAME>/g, composeProjectName)
        .replace(/<SITE_URL>/g, projectUrl)
        .replace(/<USER_NAME>/g, userName) // Usando o userName obtido de forma segura
        .replace(/<PHP_IMAGE>/g, phpVersion);
      fs.writeFileSync(dockerComposePath, dockerConfig);

      // ajusta o arquivo default.conf
      const defaultConf = path.join(defaultConfPath, 'default.conf');
      let defaultConfContent = fs.readFileSync(defaultConf, 'utf8');
      defaultConfContent = defaultConfContent.replace(/<SITE_URL>/g, projectUrl);
      fs.writeFileSync(defaultConf, defaultConfContent);

      // Instala WP-CLI se necessário
      console.log('\nVerificando instalação do WP-CLI...');
      const wpCliInstalled = await ensureWPCLI();
      if (!wpCliInstalled) {
        console.error('\nNão foi possível instalar o WP-CLI automaticamente.');
        console.error('Você precisará reiniciar o terminal após a instalação.');
        process.exit(1);
      }

      // New WordPress setup steps
      await setupWordPress(projectPath, dbName, composeProjectName, projectUrl);
      await createWordpressDatabase(dbName);
      console.log('\nWordPress configurado com sucesso!');

    } else {

      const dbName = `laravel_${composeProjectName}`;
      createEnvFile(projectPath, projectUrl, composeProjectName, {
        DB_NAME: dbName,
        DB_USER: 'laravel',
        DB_PASS: 'laravel'
      });

      // Configura o docker-compose.yml
      console.log('Configurando docker-compose.yml...');
      const dockerComposePath = normalizeSlashes(path.join(projectPath, 'docker-compose.yml'));
      let dockerConfig = fs.readFileSync(dockerComposePath, 'utf8');

      // Atualiza apenas as labels do Traefik
      dockerConfig = dockerConfig
        .replace(/<labels>/g, composeProjectName)
        .replace(/<SITE_NAME>/g, composeProjectName)
        .replace(/<SITE_URL>/g, projectUrl)
        .replace(/<USER_NAME>/g, userName) // Usando o userName obtido de forma segura
        .replace(/<PHP_IMAGE>/g, phpVersion);

      fs.writeFileSync(dockerComposePath, dockerConfig);

      console.log('Configurando default.conf...');
      
      // ajusta o arquivo default.conf
      const defaultConf = path.join(defaultConfPath, 'default.conf');
      let defaultConfContent = fs.readFileSync(defaultConf, 'utf8');
      defaultConfContent = defaultConfContent.replace(/<SITE_URL>/g, projectUrl);
      fs.writeFileSync(defaultConf, defaultConfContent);

      // Cria a pasta system
      // const systemPath = path.join(projectPath, 'system');
      // fs.mkdirSync(systemPath, { recursive: true });

      console.log('Criando banco de dados Laravel...');
      // Use a nova função robusta para criar o banco de dados
      await createLaravelDatabase(dbName);

      // Configura o projeto Laravel
      console.log('Configurando projeto Laravel...');
      await configureLaravelProject(projectPath);
      await configureEnv(projectPath, projectUrl, dbName);
      await bootstrappingProject(projectPath);
    }

    console.log(`\nProjeto ${projectType} criado com sucesso em ${projectPath}`);
    console.log(`URL do projeto: https://${projectUrl}`);

    console.log('Iniciando os containers...');
    await startContainers(projectPath, projectUrl, composeProjectName, projectType);

  } catch (error) {
    console.error('Erro ao criar projeto:', error.message);
    process.exit(1);
  }
};

module.exports = create;
