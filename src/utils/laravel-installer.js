const inquirer = require('inquirer');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { ensureLaravelInstalled } = require('./laravel-cli-installer');
const { detectOS } = require('./detect-os');

// Função para verificar a presença do Composer
function ensureComposer() {
  const os = detectOS();
  
  try {
    const command = os === 'windows' ? 'composer --version' : 'composer --version';
    execSync(command, { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.warn('Composer não encontrado. Tentando instalar...');
    
    try {
      if (os === 'windows') {
        console.log('Por favor, baixe e instale o Composer manualmente:');
        console.log('https://getcomposer.org/download/');
        return false;
      } else {
        // Instalação no Linux
        execSync('curl -sS https://getcomposer.org/installer | php', { stdio: 'inherit' });
        execSync('sudo mv composer.phar /usr/local/bin/composer', { stdio: 'inherit' });
        execSync('chmod +x /usr/local/bin/composer', { stdio: 'inherit' });
        return true;
      }
    } catch (error) {
      console.error('Erro ao instalar o Composer:', error.message);
      return false;
    }
  }
}

async function configureLaravelProject(projectPath) {
    const projectName = path.basename(projectPath);
    const options = await getProjectOptions();
    const execPermissionsPath = path.join(projectPath, 'laravel');

    // Verifica se o Composer está instalado
    if (!ensureComposer()) {
        throw new Error('Composer não está instalado. Por favor, instale o Composer primeiro.');
    }

    const laravelInstalled = await ensureLaravelInstalled();

    if (!laravelInstalled) {
        console.error('Não foi possível continuar. Laravel CLI não instalado.');
        return false;
    } else {
        console.log('Laravel CLI já está instalado.');
    }

    const command = constructLaravelCommand('laravel', options);

    try {
        console.log(`Executando: laravel new ${command}`);
        console.log(`Criando projeto Laravel em ${projectPath}...`);
        
        execSync(`laravel new ${command}`, {
            cwd: projectPath,
            stdio: 'inherit'
        });

        // Após a criação do Laravel, configurando permissões
        console.log('Configurando permissões para a pasta do Laravel...');
        const os = detectOS();
        
        if (os === 'windows') {
            // No Windows, podemos usar o comando icacls para definir permissões
            try {
                const storagePath = path.join(execPermissionsPath, 'storage');
                const cachePath = path.join(execPermissionsPath, 'bootstrap', 'cache');
                
                // Verifica se os diretórios existem
                if (fs.existsSync(storagePath)) {
                    execSync(`icacls "${storagePath}" /grant Everyone:F /T`, { stdio: 'ignore' });
                }
                
                if (fs.existsSync(cachePath)) {
                    execSync(`icacls "${cachePath}" /grant Everyone:F /T`, { stdio: 'ignore' });
                }
                
                console.log('Permissões configuradas com sucesso!');
            } catch (error) {
                console.warn('Aviso: Não foi possível definir permissões:', error.message);
            }
        } else {
            // No Linux/Mac, usa chmod
            execSync(`chmod -R 775 "${execPermissionsPath}/storage" "${execPermissionsPath}/bootstrap/cache"`, {
                stdio: 'inherit'
            });
            console.log('Permissões configuradas com sucesso!');
        }
    } catch (error) {
        console.error('Erro ao criar projeto Laravel:', error.message);
        throw error;
    }
}

async function bootstrappingProject(projectPath) {
    const bootstrappingPath = path.join(projectPath, 'laravel');
    const os = detectOS();

    try {
        console.log(`Executando: provisionamento do projeto Laravel`);
        
        if (os === 'windows') {
            // No Windows, é melhor executar comandos separados para evitar problemas
            console.log('Instalando dependências do Node...');
            try {
                execSync(`npm install`, {
                    cwd: bootstrappingPath,
                    stdio: 'inherit'
                });
            } catch (error) {
                console.warn('Aviso: Erro ao instalar dependências do Node:', error.message);
            }
            
            console.log('Compilando assets...');
            try {
                execSync(`npm run build`, {
                    cwd: bootstrappingPath,
                    stdio: 'inherit'
                });
            } catch (error) {
                console.warn('Aviso: Erro ao compilar assets:', error.message);
            }
            
            console.log('Executando migrações...');
            try {
                execSync(`php artisan migrate`, {
                    cwd: bootstrappingPath,
                    stdio: 'inherit'
                });
            } catch (error) {
                console.warn('Aviso: Erro ao executar migrações:', error.message);
            }
        } else {
            // No Linux, podemos executar comandos encadeados
            execSync(`npm install && npm run build && php artisan migrate`, {
                cwd: bootstrappingPath,
                stdio: 'inherit'
            });
        }
        
        console.log('Provisionamento concluído com sucesso!');
    } catch (error) {
        console.error('Erro ao execultar provisionamento do projeto Laravel:', error.message);
        throw error;
    }
}

async function configureEnv(projectPath, projectUrl, dbName) {
    const projectLocale = 'pt_BR';
    const projectTimezone = 'America/Sao_Paulo';
    // const projectKey = execSync('php artisan key:generate --show').toString().trim();
    const envPath = path.join(projectPath, 'laravel', '.env');
    console.log('envPath', envPath);
    // console.log('key', projectKey);
    // const dbName = `laravel_${path.basename(projectPath).toLowerCase().replace(/\./g, '_')}`;
    
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
  
      // Configurações de banco de dados
      envContent = envContent
        .replace(/DB_CONNECTION=.*/, `DB_CONNECTION=mysql`)
        .replace(/DB_HOST=.*/, `DB_HOST=10.0.120.10`)
        .replace(/DB_PORT=.*/, `DB_PORT=3306`)
        .replace(/DB_DATABASE=.*/, `DB_DATABASE=${dbName}`)
        .replace(/DB_USERNAME=.*/, `DB_USERNAME=laravel`)
        .replace(/DB_PASSWORD=.*/, `DB_PASSWORD=laravel`);
  
      // Configurações adicionais
      envContent = envContent
        .replace(/APP_URL=.*/, `APP_URL=https://${projectUrl}`)
        .replace(/APP_ENV=.*/, `APP_ENV=local`);
  
      fs.writeFileSync(envPath, envContent);
    }
}

async function getProjectOptions() {
    const options = [];

    // Starter Kit Selection
    const { starterKit } = await inquirer.prompt([
        {
            type: 'list',
            name: 'starterKit',
            message: 'Escolha o starter kit:',
            choices: [
                { name: 'Nenhum', value: 'none' },
                { name: 'Breeze', value: 'breeze' },
                { name: 'Jetstream', value: 'jetstream' }
            ]
        }
    ]);

    if (starterKit === 'breeze') {
        const { stack } = await inquirer.prompt([
            {
                type: 'list',
                name: 'stack',
                message: 'Escolha a stack do Breeze:',
                choices: ['blade', 'react', 'vue', 'inertia']
            }
        ]);
        options.push('--breeze', `--stack=${stack}`);

        const { typescript } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'typescript',
                message: 'Usar TypeScript?'
            }
        ]);
        if (typescript) options.push('--typescript');

        const { eslint } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'eslint',
                message: 'Incluir ESLint e Prettier?'
            }
        ]);
        if (eslint) options.push('--eslint');
    }

    if (starterKit === 'jetstream') {
        const { stack } = await inquirer.prompt([
            {
                type: 'list',
                name: 'stack',
                message: 'Escolha a stack do Jetstream:',
                choices: ['livewire', 'inertia']
            }
        ]);
        options.push('--jet', `--stack=${stack}`);

        const additionalOptions = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'api',
                message: 'Incluir suporte para API?'
            },
            {
                type: 'confirm',
                name: 'teams',
                message: 'Incluir suporte para times?'
            },
            {
                type: 'confirm',
                name: 'verification',
                message: 'Incluir verificação de e-mail?'
            }
        ]);

        if (additionalOptions.api) options.push('--api');
        if (additionalOptions.teams) options.push('--teams');
        if (additionalOptions.verification) options.push('--verification');
    }

    // Database selection
    const { database } = await inquirer.prompt([
        {
            type: 'list',
            name: 'database',
            message: 'Escolha o banco de dados:',
            choices: ['mysql', 'mariadb', 'pgsql', 'sqlite', 'sqlsrv']
        }
    ]);
    options.push(`--database=${database}`);

    // Testing framework
    const { testFramework } = await inquirer.prompt([
        {
            type: 'list',
            name: 'testFramework',
            message: 'Escolha o framework de testes:',
            choices: ['Pest', 'PHPUnit']
        }
    ]);
    options.push(testFramework === 'Pest' ? '--pest' : '--phpunit');

    // Git options
    const { git } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'git',
            message: 'Inicializar repositório Git?'
        }
    ]);
    if (git) {
        options.push('--git');

        const { branch } = await inquirer.prompt([
            {
                type: 'input',
                name: 'branch',
                message: 'Nome do branch inicial:',
                default: 'main'
            }
        ]);
        options.push(`--branch=${branch}`);
    }

    return options;
}

function constructLaravelCommand(projectName, options) {
    console.log(`${projectName} ${options.join(' ')} --no-interaction`);
    return `${projectName} ${options.join(' ')} --no-interaction`;
}

module.exports = { configureLaravelProject, configureEnv, bootstrappingProject, ensureComposer };




// const inquirer = require('inquirer');
// const { setupStarterKit } = require('./starter-kit-setup');
// const { setupBreeze } = require('./breeze-setup');
// const { setupJetstream } = require('./jetstream-setup');
// const { ensureLaravelInstalled } = require('./laravel-cli-installer');

// async function configureLaravelProject(projectPath) {
//     const laravelInstalled = await ensureLaravelInstalled();
  
//   if (!laravelInstalled) {
//     console.error('Não foi possível continuar. Laravel CLI não instalado.');
//     return false;
//   }

//   const { starterKit } = await inquirer.prompt([
//     {
//       type: 'list',
//       name: 'starterKit',
//       message: 'Escolha o starter kit para seu projeto Laravel:',
//       choices: [
//         { name: 'Nenhum', value: 'none' },
//         { name: 'Breeze', value: 'breeze' },
//         { name: 'Jetstream', value: 'jetstream' }
//       ]
//     }
//   ]);

//   switch(starterKit) {
//     case 'breeze':
//       await setupBreeze(projectPath);
//       break;
//     case 'jetstream':
//       await setupJetstream(projectPath);
//       break;
//     default:
//       await setupStarterKit(projectPath);
//   }
// }

// module.exports = { configureLaravelProject };