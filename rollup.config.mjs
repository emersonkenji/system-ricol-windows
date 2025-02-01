import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import copy from 'rollup-plugin-copy';  // Importando o plugin de cópia

export default {
  input: 'index.js', // Arquivo de entrada principal
  output: {
    file: 'dist/index.js', // Arquivo de saída
    format: 'cjs', // Formato CommonJS
  },
  plugins: [
    resolve(), // Resolve módulos do node_modules
    commonjs(), // Converte CommonJS para ESModules
    json(), // Permite importar arquivos JSON
    copy({
      targets: [
        { src: 'ricol-global-docker-local-ssl/**/*', dest: 'dist/ricol-global-docker-local-ssl' },  
        { src: 'ricol-stack-laravel-nginx/**/*', dest: 'dist/ricol-stack-laravel-nginx' },
        { src: 'ricol-stack-wp-nginx/**/*', dest: 'dist/ricol-stack-wp-nginx' },
      ],
    }),
  ],
};
