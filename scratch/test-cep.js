const http = require('http');

http.get('http://localhost:3000/api/cep/01001000', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
