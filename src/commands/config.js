const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getProjectPaths } = require('../utils/paths-config');

const config = () => {
  const paths = getProjectPaths();
  const rootDir = path.join(__dirname, '..', '..');
  const globalSource = path.join(rootDir, 'ricol-global-docker-local-ssl');
  const os = detectOS();

  try {
    // Verifica se o mkcert está instalado
    try {
      if (os === 'windows') {
        execSync('where mkcert', { stdio: 'ignore' });
      } else {
        execSync('which mkcert', { stdio: 'ignore' });
      }
    } catch (error) {
      console.error('mkcert não está instalado! Por favor, instale:');
      if (os === 'windows') {
        console.log('choco install mkcert');
      } else {
        console.log('Linux: apt install mkcert');
        console.log('Mac: brew install mkcert');
      }
      process.exit(1);
    }

    // Copia a pasta global
    if (!fs.existsSync(paths.globalDir)) {
      console.log('Copiando pasta global...');
      fs.cpSync(globalSource, paths.globalDir, { recursive: true });
      console.log(`Pasta global copiada para ${paths.globalDir}`);
    } else {
      console.log(`A pasta global já existe em ${paths.globalDir}`);
    }

    // Cria a pasta de projetos
    if (!fs.existsSync(paths.projectsDir)) {
      fs.mkdirSync(paths.projectsDir, { recursive: true });
      console.log(`Pasta de projetos criada em ${paths.projectsDir}`);
    } else {
      console.log(`A pasta de projetos já existe em ${paths.projectsDir}`);
    }

    // Cria a pasta certs dentro do diretório SSL
    const certsPath = path.join(paths.globalDir, 'certs');
    if (!fs.existsSync(certsPath)) {
      fs.mkdirSync(certsPath, { recursive: true });
    }

    // Gera os certificados usando mkcert
    console.log('Gerando certificados SSL...');
    process.chdir(paths.globalDir);
    execSync(
      'mkcert -cert-file certs/localhost-cert.pem -key-file certs/localhost-key.pem "*.docker.localhost" "*.dev.local" "*.dev.localhost"',
      { stdio: 'inherit' }
    );
    process.chdir(__dirname);

    console.log('Certificados SSL gerados com sucesso!');
    console.log(`Local dos certificados: ${certsPath}`);
    
  } catch (error) {
    console.error('Erro durante a configuração:', error.message);
    process.exit(1);
  }
};

module.exports = config;