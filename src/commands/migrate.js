const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { getProjectPaths } = require('../utils/paths-config');
const { copyDirectory, deleteDirectory } = require('../utils/file-operations');
const { detectOS, normalizeSlashes } = require('../utils/detect-os');

const migrate = async () => {
  const homeDir = require('os').homedir();
  const paths = getProjectPaths();
  
  // Caminhos antigos
  const oldPaths = {
    meusSites: normalizeSlashes(path.join(homeDir, 'meus-sites')),
    global: normalizeSlashes(path.join(homeDir, 'ricol-global-docker-local-ssl'))
  };

  try {
    console.log('Verificando estrutura antiga...');
    const hasOldStructure = fs.existsSync(oldPaths.meusSites) || fs.existsSync(oldPaths.global);

    if (!hasOldStructure) {
      console.log('Nenhuma estrutura antiga encontrada para migrar.');
      process.exit(0);
    }

    console.log('\nEstrutura antiga encontrada:');
    if (fs.existsSync(oldPaths.meusSites)) {
      console.log(`- Projetos em: ${oldPaths.meusSites}`);
    }
    if (fs.existsSync(oldPaths.global)) {
      console.log(`- Ambiente global em: ${oldPaths.global}`);
    }

    const { confirmMigration } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmMigration',
        message: 'Deseja migrar para a nova estrutura? Os arquivos antigos serão movidos para a nova localização.',
        default: false
      }
    ]);

    if (!confirmMigration) {
      console.log('Migração cancelada.');
      process.exit(0);
    }

    // Cria diretórios da nova estrutura se não existirem
    [
      paths.baseDir,
      paths.projectsDir,
      paths.globalDir,
      paths.templatesDir,
      paths.logsDir,
      paths.binDir
    ].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Migra projetos
    if (fs.existsSync(oldPaths.meusSites)) {
      console.log('\nMigrando projetos...');
      const projects = fs.readdirSync(oldPaths.meusSites);
      
      for (const project of projects) {
        const sourcePath = path.join(oldPaths.meusSites, project);
        const destPath = path.join(paths.projectsDir, project);
        
        if (fs.statSync(sourcePath).isDirectory()) {
          console.log(`- Migrando projeto: ${project}`);
          copyDirectory(sourcePath, destPath);
        }
      }
      
      console.log('Removendo diretório antigo de projetos...');
      deleteDirectory(oldPaths.meusSites);
    }

    // Migra ambiente global
    if (fs.existsSync(oldPaths.global)) {
      console.log('\nMigrando ambiente global...');
      copyDirectory(oldPaths.global, paths.globalDir);
      console.log('Removendo diretório global antigo...');
      deleteDirectory(oldPaths.global);
    }

    console.log('\nMigração concluída com sucesso!');
    console.log('\nNova estrutura:');
    console.log(`Diretório base: ${paths.baseDir}`);
    console.log('├── sites/      (seus projetos)');
    console.log('├── global/     (ambiente global)');
    console.log('├── templates/  (templates de projetos)');
    console.log('├── logs/       (logs do sistema)');
    console.log('└── bin/        (binários e utilitários)');

    console.log('\nPróximos passos:');
    console.log('1. Execute "system-ricol global-start" para iniciar o ambiente global');
    console.log('2. Seus projetos devem continuar funcionando normalmente na nova localização');

  } catch (error) {
    console.error('Erro durante a migração:', error.message);
    process.exit(1);
  }
};

module.exports = migrate;
