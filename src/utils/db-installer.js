const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { detectOS } = require('./detect-os');

/**
 * Cria um banco de dados no MariaDB usando uma abordagem robusta que funciona em diferentes ambientes
 * 
 * @param {string} dbName - Nome do banco de dados a ser criado
 * @param {string} user - Usuário do banco de dados (padrão: wordpress ou laravel)
 * @param {string} password - Senha do usuário do banco de dados
 * @param {string} type - Tipo de projeto ('wordpress' ou 'laravel')
 * @returns {boolean} - Sucesso ou falha na criação do banco de dados
 */
async function createDatabase(dbName, user, password, type = 'laravel') {
    console.log(`\nCriando banco de dados para ${type}...`);

    // Remove caracteres especiais do nome do banco de dados
    const safeDbName = dbName.replace(/[^a-zA-Z0-9_]/g, '');

    try {
        const os = detectOS();

        if (os === 'windows') {
            // No Windows, tente várias abordagens até uma funcionar
            const approaches = [
                // Abordagem 1: Comando direto
                () => {
                    try {
                        execSync(`docker exec global-mariadb mysql -uroot -proot -e "CREATE DATABASE IF NOT EXISTS ${safeDbName};"`, { stdio: 'ignore' });
                        execSync(`docker exec global-mariadb mysql -uroot -proot -e "CREATE USER IF NOT EXISTS '${user}'@'%' IDENTIFIED BY '${password}';"`, { stdio: 'ignore' });
                        execSync(`docker exec global-mariadb mysql -uroot -proot -e "GRANT ALL PRIVILEGES ON ${safeDbName}.* TO '${user}'@'%';"`, { stdio: 'ignore' });
                        execSync(`docker exec global-mariadb mysql -uroot -proot -e "FLUSH PRIVILEGES;"`, { stdio: 'ignore' });
                        return true;
                    } catch (error) {
                        console.log('Abordagem 1 falhou, tentando próxima...');
                        return false;
                    }
                },

                // Abordagem 2: Usando arquivo SQL
                () => {
                    try {
                        const tempDir = path.join(process.env.TEMP || process.env.TMP || '.');
                        const sqlFile = path.join(tempDir, `create_db_${Date.now()}.sql`);

                        const sqlContent = `
                            CREATE DATABASE IF NOT EXISTS ${safeDbName};
                            CREATE USER IF NOT EXISTS '${user}'@'%' IDENTIFIED BY '${password}';
                            GRANT ALL PRIVILEGES ON ${safeDbName}.* TO '${user}'@'%';
                            FLUSH PRIVILEGES;
                            `;

                        fs.writeFileSync(sqlFile, sqlContent);
                        const windowsSqlFile = sqlFile.replace(/\\/g, '\\\\');

                        execSync(`docker cp "${windowsSqlFile}" global-mariadb:/tmp/create_db.sql`, { stdio: 'ignore' });
                        execSync(`docker exec global-mariadb bash -c "mysql -uroot -proot < /tmp/create_db.sql"`, { stdio: 'ignore' });

                        try { fs.unlinkSync(sqlFile); } catch (e) { }
                        return true;
                    } catch (error) {
                        console.log('Abordagem 2 falhou, tentando próxima...');
                        return false;
                    }
                },

                // Abordagem 3: Usando Powershell
                () => {
                    try {
                        const psCommand = `
                            docker exec global-mariadb mysql -uroot -proot -e "CREATE DATABASE IF NOT EXISTS ${safeDbName};"
                            docker exec global-mariadb mysql -uroot -proot -e "CREATE USER IF NOT EXISTS '${user}'@'%' IDENTIFIED BY '${password}';"
                            docker exec global-mariadb mysql -uroot -proot -e "GRANT ALL PRIVILEGES ON ${safeDbName}.* TO '${user}'@'%';"
                            docker exec global-mariadb mysql -uroot -proot -e "FLUSH PRIVILEGES;"
                            `;

                        execSync(`powershell -Command "${psCommand}"`, { stdio: 'ignore' });
                        return true;
                    } catch (error) {
                        console.log('Abordagem 3 falhou.');
                        return false;
                    }
                }
            ];

            // Tenta cada abordagem até uma delas funcionar
            for (const approach of approaches) {
                if (await approach()) {
                    console.log(`Banco de dados ${safeDbName} criado com sucesso!`);
                    return true;
                }
            }

            throw new Error('Todas as abordagens falharam ao criar o banco de dados');

        } else {
            // Linux/Mac
            execSync(`docker exec -it global-mariadb mysql -uroot -proot -e 'CREATE DATABASE IF NOT EXISTS ${safeDbName}'`);
            execSync(`docker exec -it global-mariadb mysql -uroot -proot -e "CREATE USER IF NOT EXISTS '${user}'@'%' IDENTIFIED BY '${password}'"`, { stdio: 'ignore' });
            execSync(`docker exec -it global-mariadb mysql -uroot -proot -e 'GRANT ALL PRIVILEGES ON ${safeDbName}.* TO "${user}"@"%"'`, { stdio: 'ignore' });
            execSync(`docker exec -it global-mariadb mysql -uroot -proot -e "FLUSH PRIVILEGES"`, { stdio: 'ignore' });

            console.log(`Banco de dados ${safeDbName} criado com sucesso!`);
            return true;
        }

    } catch (error) {
        console.error(`Erro ao criar banco de dados: ${error.message}`);
        // Como último recurso, presuma que o banco de dados talvez já exista e continue
        console.warn('Prosseguindo mesmo com erro. Verifique manualmente se o banco de dados foi criado.');
        return false;
    }
}

/**
 * Wrapper para criar banco de dados WordPress
 */
async function createWordpressDatabase(dbName) {
    return await createDatabase(dbName, 'wordpress', 'wordpress', 'wordpress');
}

/**
 * Wrapper para criar banco de dados Laravel
 */
async function createLaravelDatabase(dbName) {
    return await createDatabase(dbName, 'laravel', 'laravel', 'laravel');
}

module.exports = {
    createDatabase,
    createWordpressDatabase,
    createLaravelDatabase
};
