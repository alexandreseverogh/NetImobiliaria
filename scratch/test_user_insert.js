const { createUser } = require('./src/lib/database/users');

async function testCreate() {
    try {
        console.log('Tentando criar usuário de teste...');
        const user = await createUser({
            username: 'test_user_' + Date.now(),
            email: 'test' + Date.now() + '@example.com',
            password: 'password123',
            nome: 'Teste de Inserção',
            telefone: '(81) 99999-9999',
            cpf: '12345678901',
            roleId: 1, // Assumindo que o ID 1 existe
            ativo: true,
            metadata: { teste: true }
        });
        console.log('✅ Usuário criado com sucesso:', user.id);
    } catch (err) {
        console.error('❌ ERRO AO CRIAR USUÁRIO:', err);
    } finally {
        process.exit();
    }
}

testCreate();
