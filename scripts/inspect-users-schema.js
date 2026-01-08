const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: false
});

const query = `
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'users'
  ORDER BY column_name;
`;

pool.query(query, (err, res) => {
    if (err) {
        console.error('Error fetching schema:', err);
    } else {
        console.log('--- USERS TABLE SCHEMA ---');
        if (res.rows.length === 0) {
            console.log('Table "users" not found or has no columns.');
        } else {
            res.rows.forEach(r => console.log(`${r.column_name} (${r.data_type})`));
        }
        console.log('--------------------------');
    }
    pool.end();
});
