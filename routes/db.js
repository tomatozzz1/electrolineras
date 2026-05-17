const { Pool } = require('pg');

const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5434'),
    database: process.env.DB_NAME     || 'control_electrolineras',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
});

pool.connect((err) => {
    if (err) console.error('Error conectando a PostgreSQL:', err.message);
    else console.log('Conectado a PostgreSQL —', process.env.DB_NAME || 'control_electrolineras');
});

const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };