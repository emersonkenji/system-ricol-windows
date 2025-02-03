const inquirer = require('inquirer');
const { execSync } = require('child_process');
const path = require('path');

async function setupBreeze(projectPath) {
  const { breezeStack } = await inquirer.prompt([
    {
      type: 'list',
      name: 'breezeStack',
      message: 'Escolha a stack para o Breeze:',
      choices: [
        { name: 'Blade', value: 'blade' },
        { name: 'React', value: 'react' },
        { name: 'Vue', value: 'vue' },
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

  try {
    const command = `laravel new ${path.basename(projectPath)} --breeze --stack=${breezeStack} --typescript=${language === 'typescript'} --no-interaction`;
    
    console.log(`Executando: ${command}`);
    execSync(command, { 
      cwd: path.dirname(projectPath),
      stdio: 'inherit' 
    });

    console.log('Projeto Breeze criado com sucesso!');
  } catch (error) {
    console.error('Erro ao configurar Breeze:', error.message);
    throw error;
  }
}

module.exports = { setupBreeze };