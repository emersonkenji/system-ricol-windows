const fs = require('fs');
const path = require('path');
const { getProjectPaths } = require('./paths-config');
const { copyDirectory, deleteDirectory } = require('./file-operations');

async function migrateOldStructure() {
  const homeDir = require('os').homedir();
  const paths = getProjectPaths();
  
  // Caminhos antigos
  const oldPaths = {
    meusSites: path.join(homeDir, 'meus-sites'),
    global: path.join(homeDir, 'ricol-global-docker-local-ssl')
  };

  try {
    // Migra projetos
    if (fs.existsSync(oldPaths.meusSites)) {
      console.log('Migrando projetos antigos...');
      copyDirectory(oldPaths.meusSites, paths.projectsDir);
      deleteDirectory(oldPaths.meusSites);
    }

    // Migra ambiente global
    if (fs.existsSync(oldPaths.global)) {
      console.log('Migrando ambiente global...');
      copyDirectory(oldPaths.global, paths.globalDir);
      deleteDirectory(oldPaths.global);
    }

    console.log('Migração concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a migração:', error.message);
    throw error;
  }
}

module.exports = { migrateOldStructure };
