const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { startContainers, createLaravelDatabase, createWordpressDatabase } = require('../utils/ensureGlobalEnvironment');
const { ensureWPCLI, setupWordPress } = require('../utils/wp-cli');

const create = async () => {
  const userDir = require('os').homedir();
  const meusSitesPath = path.join(userDir, 'meus-sites');
  const wpTemplatePath = path.join(__dirname, '../../ricol-stack-wp-nginx');
  const laravelTemplatePath = path.join(__dirname, '../../ricol-stack-laravel-nginx');
  const validDomains = ['.dev.localhost', '.dev.local', '.dev.test'];
  const os = require('os');
  const userName = os.userInfo().username;

  try {
    // Existing checks...
    if (!fs.existsSync(meusSitesPath)) {
      fs.mkdirSync(meusSitesPath, { recursive: true });
      console.log(`Pasta meus-sites criada em ${meusSitesPath}`);
    }

    try {
      execSync('docker --version');
    } catch (error) {
      console.error('Docker não está instalado! Por favor, instale primeiro.');
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
    const projectPath = path.join(meusSitesPath, projectName);
    const defaultConfPath = path.join(projectPath, 'config/nginx');
    const composeProjectName = projectName
      .toLowerCase()
      .replace(/\./g, '-')
      .replace(/[^a-z0-9-]/g, '');

    if (fs.existsSync(projectPath)) {
      console.error(`Projeto ${projectName} já existe em ${meusSitesPath}`);
      process.exit(1);
    }

    const templatePath = projectType === 'wordpress' ? wpTemplatePath : laravelTemplatePath;

    console.log('Copiando template...');
    execSync(`cp -r "${templatePath}" "${projectPath}"`);
    execSync(`chmod -R 755 "${projectPath}"`);

    const envContent = `SITE_URL=${projectUrl}\nCOMPOSE_PROJECT_NAME=${composeProjectName}`;
    fs.writeFileSync(path.join(projectPath, '.env'), envContent);

    if (projectType === 'wordpress') {

      // WordPress specific setup
      const dbName = `wp_${composeProjectName}`;
      const dockerComposePath = path.join(projectPath, 'docker-compose.yml');

      let dockerConfig = fs.readFileSync(dockerComposePath, 'utf8');
      dockerConfig = dockerConfig
        .replace(/WORDPRESS_DB_NAME: wordpress/, `WORDPRESS_DB_NAME: ${dbName}`)
        .replace(/<labels>/g, composeProjectName)
        .replace(/<SITE_NAME>/g, composeProjectName)
        .replace(/<SITE_URL>/g, projectUrl)
        .replace(/<USER_NAME>/g, userName)
        .replace(/<PHP_IMAGE>/g, phpVersion);
      fs.writeFileSync(dockerComposePath, dockerConfig);

      // ajusta o arquivo default.conf
      const defaultConf = path.join(defaultConfPath, 'default.conf');
      let defaultConfContent = fs.readFileSync(defaultConf, 'utf8');
      defaultConfContent = defaultConfContent.replace(/<SITE_URL>/g, projectUrl);
      fs.writeFileSync(defaultConf, defaultConfContent);

      // New WordPress setup steps
      await ensureWPCLI();
      await setupWordPress(projectPath, dbName, composeProjectName, projectUrl);
      await createWordpressDatabase(dbName);
    } else {
      // Configuração do Laravel
      const dbName = `laravel_${composeProjectName}`;

      // Configura o docker-compose.yml
      const dockerComposePath = path.join(projectPath, 'docker-compose.yml');
      let dockerConfig = fs.readFileSync(dockerComposePath, 'utf8');

      // Atualiza apenas as labels do Traefik
      dockerConfig = dockerConfig
        .replace(/<labels>/g, composeProjectName)
        .replace(/<SITE_URL>/g, projectUrl)
        .replace(/<USER_NAME>/g, userName)
        .replace(/<PHP_IMAGE>/g, phpVersion);

      fs.writeFileSync(dockerComposePath, dockerConfig);
      // ajusta o arquivo default.conf
      const defaultConf = path.join(defaultConfPath, 'default.conf');
      let defaultConfContent = fs.readFileSync(defaultConf, 'utf8');
      defaultConfContent = defaultConfContent.replace(/<SITE_URL>/g, projectUrl);
      fs.writeFileSync(defaultConf, defaultConfContent);

      // Cria a pasta system
      const systemPath = path.join(projectPath, 'system');
      fs.mkdirSync(systemPath, { recursive: true });

      // Cria o banco de dados para Laravel
      await createLaravelDatabase(dbName);
    }

    console.log(`\nProjeto ${projectType} criado com sucesso em ${projectPath}`);
    console.log(`URL do projeto: https://${projectUrl}`);

    await startContainers(projectPath, projectUrl, composeProjectName, projectType);

  } catch (error) {
    console.error('Erro ao criar projeto:', error.message);
    process.exit(1);
  }
};

module.exports = create;
