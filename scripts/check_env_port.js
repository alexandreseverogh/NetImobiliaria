require('dotenv').config({ path: '.env.local' });

console.log('User Asked: "voce está utilizando o banco de dados na porte 15432?"');
console.log('Checking .env.local loading...');
console.log('DB_PORT from env:', process.env.DB_PORT);
console.log('DB_HOST from env:', process.env.DB_HOST);
