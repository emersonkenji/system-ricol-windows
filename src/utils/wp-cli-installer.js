const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const { detectOS } = require('./detect-os');
const { getProjectPaths } = require('./paths-config');

async function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    https.get(url, response => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', err => {
      fs.unlink(destination, () => reject(err));
    });
  });
}

async function createPhpIniConfig(paths) {
  const phpIniPath = path.join(paths.binDir, 'php.ini');
  const phpIniContent = `
memory_limit = 512M
max_execution_time = 300
post_max_size = 64M
upload_max_filesize = 64M
`;
  fs.writeFileSync(phpIniPath, phpIniContent);
  return phpIniPath;
}

async function installWPCLI() {
  const os = detectOS();
  const paths = getProjectPaths();
  
  if (os === 'windows') {
    // Windows: instalação local no diretório bin
    const binDir = paths.binDir;
    const wpPharPath = path.join(binDir, 'wp-cli.phar');
    const wpBatPath = path.join(binDir, 'wp.bat');
    
    try {
      if (!fs.existsSync(binDir)) {
        fs.mkdirSync(binDir, { recursive: true });
      }

      // Cria php.ini personalizado
      const phpIniPath = await createPhpIniConfig(paths);
      
      // Download wp-cli.phar
      console.log('Baixando WP-CLI...');
      await downloadFile(
        'https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar',
        wpPharPath
      );

      // Criar wp.bat com configuração PHP personalizada
      const batContent = `@ECHO OFF
SET PHP_INI_SCAN_DIR=
SET PHPRC="${phpIniPath}"
php -d memory_limit=512M "%~dp0wp-cli.phar" %*`;
      
      fs.writeFileSync(wpBatPath, batContent);

      // Adiciona ao PATH do usuário
      const userPath = process.env.PATH || '';
      if (!userPath.includes(binDir)) {
        process.env.PATH = `${binDir}${path.delimiter}${userPath}`;
        execSync(`setx PATH "%PATH%;${binDir}"`, { stdio: 'ignore' });
      }

      console.log(`WP-CLI instalado em: ${binDir}`);
      return true;
    } catch (error) {
      console.error('Erro ao instalar WP-CLI:', error.message);
      return false;
    }
  } else {
    // Linux/Mac: instalação global
    try {
      console.log('Instalando WP-CLI globalmente...');
      execSync('curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar');
      execSync('chmod +x wp-cli.phar');
      execSync('sudo mv wp-cli.phar /usr/local/bin/wp');
      return true;
    } catch (error) {
      console.error('Erro ao instalar WP-CLI:', error.message);
      return false;
    }
  }
}

async function ensureWPCLI() {
  try {
    execSync('wp --info', { stdio: 'ignore' });
    console.log('WP-CLI já está instalado.');
    return true;
  } catch (error) {
    console.log('WP-CLI não encontrado. Instalando...');
    return await installWPCLI();
  }
}

module.exports = {
  ensureWPCLI
};
