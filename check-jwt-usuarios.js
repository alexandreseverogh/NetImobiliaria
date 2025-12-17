require('dotenv').config({ path: '.env.local' });
const jwt = require('jsonwebtoken');

// Simular um token do admin (você precisa pegar o token real do localStorage)
console.log('📋 Para verificar o JWT, abra o console do navegador e execute:');
console.log('');
console.log('const token = localStorage.getItem("auth-token");');
console.log('const payload = JSON.parse(atob(token.split(".")[1]));');
console.log('console.log("Permissões:", payload.permissoes);');
console.log('console.log("Usuários permission:", payload.permissoes.usuarios);');
console.log('');
console.log('🔍 Copie o resultado aqui!');



