const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

// New function to check and install WP-CLI
async function ensureWPCLI() {
  console.log('\nVerificando instalação do WP-CLI...');
  try {
    execSync('wp --info');
    console.log('WP-CLI já está instalado.');
  } catch (error) {
    console.log('WP-CLI não encontrado. Instalando...');
    try {
      // Download WP-CLI
      execSync('curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar');
      // Make it executable
      execSync('chmod +x wp-cli.phar');
      // Move to PATH
      execSync('sudo mv wp-cli.phar /usr/local/bin/wp');
      console.log('WP-CLI instalado com sucesso!');
    } catch (installError) {
      throw new Error(`Erro ao instalar WP-CLI: ${installError.message}`);
    }
  }
}

// New function to set up WordPress
async function setupWordPress(projectPath, dbName, pathSystem, url) {
  console.log('\nConfigurando WordPress...');
  const systemPath = path.join(projectPath, 'system');
  const parentPath = path.dirname(projectPath);

  const generateRandomPrefix = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return result;
  }
  
  // Então no seu código do wp config:
  const tablePrefix = generateRandomPrefix();


  try {
    // Create system directory if it doesn't exist
    if (!fs.existsSync(systemPath)) {
      fs.mkdirSync(systemPath, { recursive: true });
    }

    // Download WordPress core
    console.log('Baixando WordPress...');
    execSync(`wp core download --path=${pathSystem}/system --locale=pt_BR`, {
      cwd: parentPath
    });

    // Create wp-config.php
    console.log('Criando wp-config.php...');
    execSync(
      `wp config create --path=${pathSystem}/system \
          --dbname=${dbName} \
          --dbuser=root \
          --dbpass=root \
          --dbhost=global-mariadb \
          --dbcharset=utf8mb4 \
          --dbcollate=utf8mb4_unicode_ci \
          --dbprefix=${tablePrefix}_wp_ \
          --skip-check \
          --extra-php <<PHP
        define('WP_DEBUG', true);
        define('WP_DEBUG_DISPLAY', false);
        define('WP_DEBUG_LOG', true);
        define('AUTOMATIC_UPDATER_DISABLED', true);
        define('WP_AUTO_UPDATE_CORE', false);
        define('WP_HOME', 'https://${url}');
        define('WP_SITEURL', 'https://${url}');
        `,
      {
        cwd: parentPath
      }
    );

    // Set correct permissions
    // console.log('Aplicando permissões...');
    // execSync(`chmod -R 755 ${systemPath}`);
    // execSync(`find ${systemPath} -type f -exec chmod 644 {} \\;`);
    // execSync(`find ${systemPath} -type d -exec chmod 755 {} \\;`);

    console.log('WordPress configurado com sucesso!');
  } catch (error) {
    throw new Error(`Erro na configuração do WordPress: ${error.message}`);
  }
}

module.exports = { ensureWPCLI, setupWordPress };