const inquirer = require('inquirer');
const { execSync } = require('child_process');
const path = require('path');

async function setupJetstream(projectPath) {
  const { jetstreamStack } = await inquirer.prompt([
    {
      type: 'list',
      name: 'jetstreamStack',
      message: 'Escolha a stack para o Jetstream:',
      choices: [
        { name: 'Livewire', value: 'livewire' },
        { name: 'Inertia', value: 'inertia' }
      ]
    }
  ]);

  const { language } = await inquirer.prompt([
    {
      type: 'list',
      name: 'language',
      message: 'Escolha a linguagem:',
      choices: [
        { name: 'JavaScript', value: 'javascript' },
        { name: 'TypeScript', value: 'typescript' }
      ]
    }
  ]);

  const { auth } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'auth',
      message: 'Deseja incluir autenticação?',
      default: true
    }
  ]);

  try {
    const command = `laravel new ${path.basename(projectPath)} --jet --stack=${jetstreamStack} ${auth ? '--auth' : ''} --typescript=${language === 'typescript'} --no-interaction`;
    
    console.log(`Executando: ${command}`);
    execSync(command, { 
      cwd: path.dirname(projectPath),
      stdio: 'inherit' 
    });

    console.log('Projeto Jetstream criado com sucesso!');
  } catch (error) {
    console.error('Erro ao configurar Jetstream:', error.message);
    throw error;
  }
}

module.exports = { setupJetstream };