#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const create = require('./src/commands/create');
const start = require('./src/commands/start');
const stop = require('./src/commands/stop');
const deleteProject = require('./src/commands/delete-project');
const globalStart = require('./src/commands/global-start');
const globalStop = require('./src/commands/global-stop');
const configureEnvironment = require('./src/commands/configure');

yargs(hideBin(process.argv))
  .command('create', 'Cria um novo projeto', {}, create)
  .command('start', 'Inicia um projeto existente', {}, start)
  .command('stop', 'Para um projeto em execução', {}, stop)
  .command('delete', 'Deleta um projeto existente', {}, deleteProject)
  .command('global start', 'Inicia o ambiente global', {}, globalStart) // Alterado para espaço
  .command('global-start', 'Inicia o ambiente global', {}, globalStart) // Mantido com hífen
  .command('global stop', 'Para o ambiente global', {}, globalStop) // Alterado para espaço
  .command('global-stop', 'Para o ambiente global', {}, globalStop) // Mantido com hífen
  .command('config', 'Configura o ambiente', {}, configureEnvironment)
  .command({
    command: 'migrate',
    desc: 'Migra a estrutura antiga para a nova',
    handler: require('./src/commands/migrate')
  })
  .demandCommand(1, 'Você precisa especificar um comando')
  .help()
  .argv;
