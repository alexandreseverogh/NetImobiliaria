/**
 * Verificação rápida antes de iniciar o teste
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
});

async function preTest() {
  try {
    console.log('🔍 PRÉ-TESTE: Verificação Rápida\n');
    console.log('═'.repeat(60));
    console.log('\n');

    // 1. Verificar usuário admin
    console.log('1️⃣ Verificando usuário admin...\n');
    
    const adminResult = await pool.query(`
      SELECT id, username, email, ativo
      FROM users
      WHERE username = 'admin'
    `);
    
    if (adminResult.rows.length > 0) {
      console.log('   ✅ Usuário admin existe');
      console.log(`      Email: ${adminResult.rows[0].email}`);
      console.log(`      Ativo: ${adminResult.rows[0].ativo ? 'Sim' : 'Não'}\n`);
    } else {
      console.log('   ❌ Usuário admin NÃO encontrado!\n');
    }

    // 2. Verificar perfil Corretor
    console.log('2️⃣ Verificando perfil Corretor...\n');
    
    const corretorResult = await pool.query(`
      SELECT id, name, level, is_active
      FROM user_roles
      WHERE name = 'Corretor'
    `);
    
    if (corretorResult.rows.length > 0) {
      const corretor = corretorResult.rows[0];
      console.log('   ✅ Perfil Corretor existe');
      console.log(`      ID: ${corretor.id}`);
      console.log(`      Level: ${corretor.level}`);
      console.log(`      Ativo: ${corretor.is_active ? 'Sim' : 'Não'}\n`);
      
      // Contar permissões do Corretor
      const permResult = await pool.query(`
        SELECT COUNT(*) as total
        FROM role_permissions
        WHERE role_id = $1
      `, [corretor.id]);
      
      console.log(`   📊 Permissões atuais do Corretor: ${permResult.rows[0].total}\n`);
    } else {
      console.log('   ❌ Perfil Corretor NÃO encontrado!\n');
    }

    // 3. Verificar se usuário teste já existe
    console.log('3️⃣ Verificando se usuário de teste já existe...\n');
    
    const testUserResult = await pool.query(`
      SELECT username, email
      FROM users
      WHERE username IN ('maria.silva', 'teste.2fa', 'joao.teste')
    `);
    
    if (testUserResult.rows.length > 0) {
      console.log('   ⚠️ Usuários de teste já existem:');
      testUserResult.rows.forEach(row => {
        console.log(`      • ${row.username} (${row.email})`);
      });
      console.log('\n   💡 Você pode:');
      console.log('      a) Usar um desses usuários existentes');
      console.log('      b) Criar um novo com username diferente\n');
    } else {
      console.log('   ✅ Nenhum usuário de teste existe ainda');
      console.log('   📝 Perfeito para criar um novo!\n');
    }

    // 4. Verificar recursos disponíveis
    console.log('4️⃣ Verificando recursos disponíveis para permissões...\n');
    
    const featuresResult = await pool.query(`
      SELECT category, name
      FROM system_features
      WHERE is_active = true
      ORDER BY category
    `);
    
    console.log(`   ✅ ${featuresResult.rows.length} recursos ativos:\n`);
    
    const categories = [...new Set(featuresResult.rows.map(r => r.category))];
    console.log('   Categorias disponíveis:');
    categories.forEach(cat => {
      console.log(`      • ${cat}`);
    });

    // 5. Status do servidor
    console.log('\n5️⃣ Verificando se servidor está rodando...\n');
    
    const http = require('http');
    
    const checkServer = () => {
      return new Promise((resolve) => {
        const req = http.request({
          hostname: 'localhost',
          port: 3000,
          path: '/api/health',
          method: 'GET',
          timeout: 2000
        }, (res) => {
          resolve(true);
        });
        
        req.on('error', () => {
          resolve(false);
        });
        
        req.on('timeout', () => {
          resolve(false);
        });
        
        req.end();
      });
    };
    
    const serverRunning = await checkServer();
    
    if (serverRunning) {
      console.log('   ✅ Servidor está rodando em http://localhost:3000\n');
    } else {
      console.log('   ⚠️ Servidor NÃO está rodando');
      console.log('   💡 Execute: npm run dev\n');
    }

    // RESUMO FINAL
    console.log('\n');
    console.log('═'.repeat(60));
    console.log('📊 RESUMO PRÉ-TESTE');
    console.log('═'.repeat(60));
    console.log('\n');

    const checks = [
      { name: 'Usuário admin existe', ok: adminResult.rows.length > 0 },
      { name: 'Perfil Corretor existe', ok: corretorResult.rows.length > 0 },
      { name: 'Recursos disponíveis', ok: featuresResult.rows.length > 0 },
      { name: 'Servidor rodando', ok: serverRunning }
    ];

    let allOk = true;
    checks.forEach(check => {
      const icon = check.ok ? '✅' : '❌';
      console.log(`   ${icon} ${check.name}`);
      if (!check.ok) allOk = false;
    });

    console.log('\n');

    if (allOk) {
      console.log('🎉 TUDO PRONTO PARA O TESTE!\n');
      console.log('📝 Próximos passos:\n');
      console.log('   1. Abra o navegador: http://localhost:3000/login');
      console.log('   2. Login como: admin / admin123');
      console.log('   3. Siga o roteiro em: ROTEIRO_TESTE_PERMISSOES_ATUAL.md\n');
      console.log('   ⏱️ Tempo estimado: 20 minutos\n');
    } else {
      console.log('⚠️ ALGUNS PRÉ-REQUISITOS FALTANDO!\n');
      console.log('📝 Corrija os itens marcados com ❌ acima.\n');
    }

    console.log('═'.repeat(60));
    console.log('\n');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

preTest();


