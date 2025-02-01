const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const config = () => {
  const userDir = require('os').homedir();
  const sslSourcePath = path.join(__dirname, '../../ricol-global-docker-local-ssl');
  const sslDestPath = path.join(userDir, 'ricol-global-docker-local-ssl');
  const meusSitesPath = path.join(userDir, 'meus-sites');

  try {
    // Verifica se o mkcert está instalado
    try {
      execSync('which mkcert');
    } catch (error) {
      console.error('mkcert não está instalado! Por favor, instale primeiro:');
      console.error('sudo apt install mkcert');
      process.exit(1);
    }

    // Copia a pasta ricol-global-docker-local-ssl completa
    if (!fs.existsSync(sslDestPath)) {
      console.log('Copiando pasta global...');
      execSync(`cp -r "${sslSourcePath}" "${sslDestPath}"`, { stdio: 'inherit' });
      console.log(`Pasta global copiada para ${sslDestPath}`);
    } else {
      console.log(`A pasta global já existe em ${sslDestPath}`);
    }

    // Cria a pasta meus-sites
    if (!fs.existsSync(meusSitesPath)) {
      fs.mkdirSync(meusSitesPath, { recursive: true });
      console.log(`Pasta meus-sites criada em ${meusSitesPath}`);
    } else {
      console.log(`A pasta meus-sites já existe em ${meusSitesPath}`);
    }

    // Cria a pasta certs dentro do diretório SSL
    const certsPath = path.join(sslDestPath, 'certs');
    if (!fs.existsSync(certsPath)) {
      fs.mkdirSync(certsPath, { recursive: true });
    }

    // Gera os certificados usando mkcert
    console.log('Gerando certificados SSL...');
    execSync(
      `cd "${sslDestPath}" && mkcert -cert-file certs/localhost-cert.pem -key-file certs/localhost-key.pem "*.docker.localhost" "*.dev.local" "*.dev.localhost"`,
      { stdio: 'inherit' }
    );

    console.log('Certificados SSL gerados com sucesso!');
    console.log(`Local dos certificados: ${certsPath}`);
    
  } catch (error) {
    console.error('Erro durante a configuração:', error.message);
    process.exit(1);
  }
};

module.exports = config; 