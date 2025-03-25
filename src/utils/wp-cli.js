const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');
const { getProjectPaths } = require('./paths-config');

// New function to check and install WP-CLI
async function ensureWPCLI() {
  console.log('\nVerificando instalação do WP-CLI...');
  try {
    execSync('wp --info');
    console.log('WP-CLI já está instalado.');
  } catch (error) {
    console.log('WP-CLI não encontrado. Instalando...');
    try {
      // For Windows, we'll guide the user to manual installation
      console.log('Para instalar o WP-CLI no Windows:');
      console.log('1. Baixe o arquivo wp-cli.phar de https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar');
      console.log('2. Crie um arquivo wp.bat na pasta C:\\Windows com o seguinte conteúdo:');
      console.log('@ECHO OFF\r\nphp "%~dp0wp-cli.phar" %*');
      console.log('3. Mova o wp-cli.phar para C:\\Windows');
      console.log('\nPor favor, instale o WP-CLI manualmente e tente novamente.');
      process.exit(1);
    } catch (installError) {
      throw new Error(`Erro ao instalar WP-CLI: ${installError.message}`);
    }
  }
}

// New function to set up WordPress
async function setupWordPress(projectPath, dbName, projectName, siteUrl) {
  const paths = getProjectPaths();
  const systemPath = path.join(projectPath, 'system');
  const safeDbName = dbName.replace(/[^a-zA-Z0-9_]/g, '');
  const parentPath = path.dirname(projectPath);

  try {
    console.log('\nConfigurando WordPress...');

    // Garante que o diretório system existe
    if (!fs.existsSync(systemPath)) {
      fs.mkdirSync(systemPath, { recursive: true });
    }

    // Define variáveis de ambiente para o PHP
    const env = {
      ...process.env,
      PHP_INI_SCAN_DIR: '',
      PHPRC: path.join(paths.binDir, 'php.ini')
    };

    console.log('Baixando WordPress...');
    execSync(`wp core download --path="${systemPath}" --locale=pt_BR`, {
      stdio: 'inherit',
      env
    });

    // Create wp-config.php
    console.log('Criando wp-config.php...');
    execSync(
      `wp config create --path="${systemPath}" \
        --dbname=${safeDbName} \
        --dbuser=root \
        --dbpass=root \
        --dbhost=global-mariadb \
        --dbcharset=utf8mb4 \
        --dbcollate=utf8mb4_unicode_ci \
        --dbprefix=wp_ \
        --skip-check`,
      {
        stdio: 'inherit',
        env
      }
    );

    // ...rest of WordPress setup code...
  } catch (error) {
    console.error('Erro na configuração do WordPress:', error.message);
    throw error;
  }
}

module.exports = { ensureWPCLI, setupWordPress };