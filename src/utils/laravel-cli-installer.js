const { execSync } = require('child_process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

async function ensureLaravelInstalled() {
  try {
    // Verifica se o Laravel Installer está instalado
    execSync('laravel --version');
    console.log('Laravel CLI já está instalado.');
    return true;
  } catch (error) {
    console.log('Laravel CLI não encontrado. Iniciando instalação...');
    try {
      // Verifica se o Composer está instalado
      execSync('composer --version');

      // Instala o Laravel CLI globalmente via Composer
      console.log('Instalando Laravel Installer...');
      execSync('composer global require laravel/installer', { stdio: 'inherit' });

      // Adiciona o diretório do Composer ao PATH
      const homeDir = require('os').homedir();
      const composerPath = `${homeDir}/.composer/vendor/bin`;
      
      // Para sistemas Unix-like
      execSync(`echo 'export PATH="$PATH:${composerPath}"' >> ~/.bashrc`);
      execSync(`echo 'export PATH="$PATH:${composerPath}"' >> ~/.zshrc`, { stdio: 'inherit' });

      console.log('Laravel CLI instalado com sucesso!');
      return true;
    } catch (composerError) {
      console.error('Erro: Composer não está instalado. Por favor, instale o Composer primeiro.');
      return false;
    }
  }
}

module.exports = { ensureLaravelInstalled };