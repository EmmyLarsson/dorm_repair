const mariadb = require('mariadb');

const pool = mariadb.createPool({
    host: 'localhost',
    user: 'root',
    password: '1234',
    port: 3307,
    database: 'dorm_repair',
    connectionLimit: 5,
    bigIntAsNumber: true
});

module.exports = pool;