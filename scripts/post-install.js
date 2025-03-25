const { detectOS, getHomeDir, normalizeSlashes } = require('../src/utils/detect-os');
const { getProjectPaths } = require('../src/utils/paths-config');
const fs = require('fs');
const path = require('path');

async function postInstall() {
  console.log('Executando instalação do System Ricol...');
  const paths = getProjectPaths();
  
  // Criar estrutura de diretórios
  const dirsToCreate = [
    paths.baseDir,
    paths.projectsDir,    // agora é ricol-sites/sites
    paths.globalDir,      // agora é ricol-sites/global
    paths.templatesDir,   // agora é ricol-sites/templates
    paths.logsDir,        // agora é ricol-sites/logs
    paths.binDir          // agora é ricol-sites/bin
  ];

  dirsToCreate.forEach(dir => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Diretório criado: ${dir}`);
      } catch (error) {
        console.error(`Erro ao criar diretório ${dir}:`, error.message);
      }
    }
  });

  // Copia arquivos de template se disponíveis
  const sourceGlobalDir = path.join(__dirname, '..', 'ricol-global-docker-local-ssl');
  if (fs.existsSync(sourceGlobalDir)) {
    try {
      console.log('Copiando arquivos de configuração global...');
      copyFolderRecursiveSync(sourceGlobalDir, paths.globalDir);
    } catch (error) {
      console.error('Erro ao copiar arquivos globais:', error.message);
    }
  }

  console.log(`Sistema operacional detectado: ${detectOS()}`);
  console.log('\nEstrutura de diretórios criada:');
  console.log('Diretório base: ricol-sites/');
  console.log('├── sites/      (projetos)');
  console.log('├── global/     (ambiente global)');
  console.log('├── templates/  (templates de projetos)');
  console.log('├── logs/       (logs do sistema)');
  console.log('└── bin/        (binários e utilitários)');
  console.log('\nInstalação concluída com sucesso!');
  console.log('\nPróximos passos:');
  console.log('1. Execute "system-ricol config" para completar a configuração');
  console.log('2. Execute "system-ricol global-start" para iniciar o ambiente');
}

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  // Copia arquivo por arquivo
  if (fs.lstatSync(source).isDirectory()) {
    const files = fs.readdirSync(source);
    files.forEach(file => {
      const currentPath = path.join(source, file);
      const targetPath = path.join(target, file);

      if (fs.lstatSync(currentPath).isDirectory()) {
        copyFolderRecursiveSync(currentPath, targetPath);
      } else {
        fs.copyFileSync(currentPath, targetPath);
      }
    });
  }
}

postInstall().catch(console.error);
