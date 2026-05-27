const bcrypt = require('bcryptjs');
const hash = '$2b$10$VJatF/EWBrTczYnX0HQ7kO/DGZ6XJyjOWToJUFz4Cplw67gbZorvC';
const plain = '112233';

bcrypt.compare(plain, hash).then(match => {
    console.log(`Senha '112233' confere com o hash? ${match ? 'SIM ✅' : 'NÃO ❌'}`);
    process.exit(0);
});
