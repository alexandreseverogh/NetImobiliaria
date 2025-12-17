// Script para testar expiração do código 2FA
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
});

async function testarExpiracao() {
  try {
    console.log('🔍 Testando expiração de códigos 2FA...\n');

    // 1. Verificar códigos não expirados
    const codigosValidos = await pool.query(`
      SELECT 
        id,
        user_id,
        code,
        method,
        created_at,
        expires_at,
        used,
        NOW() as agora,
        expires_at > NOW() as ainda_valido
      FROM user_2fa_codes 
      WHERE expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('📧 CÓDIGOS VÁLIDOS (não expirados):');
    if (codigosValidos.rows.length === 0) {
      console.log('   ❌ Nenhum código válido encontrado');
    } else {
      codigosValidos.rows.forEach((row, index) => {
        const tempoRestante = new Date(row.expires_at) - new Date();
        const minutosRestantes = Math.floor(tempoRestante / (1000 * 60));
        console.log(`   ${index + 1}. Código: ${row.code}`);
        console.log(`      Usuário: ${row.user_id}`);
        console.log(`      Criado: ${row.created_at}`);
        console.log(`      Expira: ${row.expires_at}`);
        console.log(`      Restam: ${minutosRestantes} minutos`);
        console.log(`      Usado: ${row.used ? 'Sim' : 'Não'}`);
        console.log('');
      });
    }

    // 2. Verificar códigos expirados
    const codigosExpirados = await pool.query(`
      SELECT 
        id,
        user_id,
        code,
        method,
        created_at,
        expires_at,
        used,
        NOW() as agora,
        expires_at < NOW() as expirado
      FROM user_2fa_codes 
      WHERE expires_at < NOW()
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('⏰ CÓDIGOS EXPIRADOS:');
    if (codigosExpirados.rows.length === 0) {
      console.log('   ✅ Nenhum código expirado encontrado');
    } else {
      codigosExpirados.rows.forEach((row, index) => {
        const tempoExpirado = new Date() - new Date(row.expires_at);
        const minutosExpirado = Math.floor(tempoExpirado / (1000 * 60));
        console.log(`   ${index + 1}. Código: ${row.code}`);
        console.log(`      Usuário: ${row.user_id}`);
        console.log(`      Criado: ${row.created_at}`);
        console.log(`      Expirou: ${row.expires_at} (há ${minutosExpirado} minutos)`);
        console.log(`      Usado: ${row.used ? 'Sim' : 'Não'}`);
        console.log('');
      });
    }

    // 3. Testar validação de código expirado
    console.log('🧪 TESTANDO VALIDAÇÃO DE CÓDIGO EXPIRADO:');
    if (codigosExpirados.rows.length > 0) {
      const codigoExpirado = codigosExpirados.rows[0];
      console.log(`   Testando código expirado: ${codigoExpirado.code}`);
      
      const queryValidacao = `
        SELECT id, expires_at, created_at
        FROM user_2fa_codes 
        WHERE user_id = $1 
        AND code = $2 
        AND method = $3 
        AND used = false 
        AND expires_at > NOW()
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const resultado = await pool.query(queryValidacao, [
        codigoExpirado.user_id,
        codigoExpirado.code,
        codigoExpirado.method
      ]);
      
      if (resultado.rows.length === 0) {
        console.log('   ✅ CORRETO: Código expirado foi rejeitado!');
      } else {
        console.log('   ❌ ERRO: Código expirado foi aceito!');
      }
    }

    // 4. Estatísticas gerais
    const estatisticas = await pool.query(`
      SELECT 
        COUNT(*) as total_codigos,
        COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as codigos_validos,
        COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as codigos_expirados,
        COUNT(CASE WHEN used = true THEN 1 END) as codigos_usados,
        COUNT(CASE WHEN used = false THEN 1 END) as codigos_nao_usados
      FROM user_2fa_codes
    `);

    const stats = estatisticas.rows[0];
    console.log('\n📊 ESTATÍSTICAS:');
    console.log(`   Total de códigos: ${stats.total_codigos}`);
    console.log(`   Códigos válidos: ${stats.codigos_validos}`);
    console.log(`   Códigos expirados: ${stats.codigos_expirados}`);
    console.log(`   Códigos usados: ${stats.codigos_usados}`);
    console.log(`   Códigos não usados: ${stats.codigos_nao_usados}`);

    // 5. Verificar configuração de expiração
    console.log('\n⚙️ CONFIGURAÇÃO DE EXPIRAÇÃO:');
    console.log(`   Tempo de expiração configurado: 60 minutos (desenvolvimento)`);
    console.log(`   Query de validação: expires_at > NOW()`);

  } catch (error) {
    console.error('❌ Erro ao testar expiração:', error);
  } finally {
    await pool.end();
  }
}

testarExpiracao();


