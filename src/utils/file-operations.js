const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { detectOS } = require('./detect-os');

function copyDirectory(source, destination) {
  const os = detectOS();
  
  if (!fs.existsSync(source)) {
    throw new Error(`Diretório de origem não existe: ${source}`);
  }

  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  if (os === 'windows') {
    // Windows: usa robocopy com tratamento de erro específico
    try {
      execSync(`robocopy "${source}" "${destination}" /E /NFL /NDL /NJH /NJS /NC /NS /NP`, 
        { stdio: 'ignore' });
    } catch (error) {
      // robocopy retorna códigos diferentes de 0 mesmo em caso de sucesso
      if (error.status >= 8) throw error;
    }
  } else {
    // Linux/Mac: usa cp -r com preservação de permissões
    execSync(`cp -rp "${source}/." "${destination}/"`);
  }
}

function setPermissions(dirPath) {
  const os = detectOS();
  if (os !== 'windows') {
    try {
      execSync(`chmod -R 755 "${dirPath}"`);
    } catch (error) {
      console.warn(`Aviso: Não foi possível definir permissões para ${dirPath}`);
    }
  }
}

function deleteDirectory(dirPath) {
  const os = detectOS();
  
  if (!fs.existsSync(dirPath)) return;

  try {
    if (os === 'windows') {
      // No Windows, usa rd /s /q para remover diretórios
      execSync(`rd /s /q "${dirPath}"`, { stdio: 'ignore' });
    } else {
      // No Linux/Mac, usa rm -rf
      execSync(`rm -rf "${dirPath}"`, { stdio: 'ignore' });
    }
  } catch (error) {
    console.error(`Erro ao remover diretório ${dirPath}:`, error.message);
    throw error;
  }
}

function deleteRecursiveSync(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach(file => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Recurse
        deleteRecursiveSync(curPath);
      } else {
        // Delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
}

module.exports = {
  copyDirectory,
  setPermissions,
  deleteDirectory
};
