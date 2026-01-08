const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('User:', process.env.DB_USER);
console.log('Pass:', process.env.DB_PASSWORD ? '******' : '(empty)');
console.log('Pass Length:', process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0);
console.log('Port:', process.env.DB_PORT);
