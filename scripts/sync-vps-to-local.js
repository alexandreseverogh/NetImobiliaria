/**
 * ============================================================
 * Sincronização de Banco de Dados: VPS → Local
 * ============================================================
 * 
 * Este script copia dados de tabelas específicas da VPS para o
 * banco de dados local. Ele limpa as tabelas locais antes de
 * inserir, mapeia a coluna tenant_id e resolve integridade
 * de chaves estrangeiras.
 * 
 * REQUISITO: O túnel SSH deve estar ativo rodando localmente:
 *   ssh -L 5434:127.0.0.1:5433 usuario@212.85.14.211
 * ============================================================
 */

const { Pool } = require('pg');

const localPool = new Pool({
  host: '127.0.0.1',
  port: 15432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: 'postgres',
});

const vpsPool = new Pool({
  host: '127.0.0.1',
  port: 5434, // Porta local do túnel SSH para a VPS
  database: 'net_imobiliaria',
  user: 'postgres',
  password: 'senhaforte381Nb@729',
});

const TARGET_TENANT_ID = 'c828d003-6213-4464-aa38-6c5d10a0aa9a';

// Tabelas a serem limpas e sincronizadas, na ordem correta de dependência
const TABLES_TO_SYNC = [
  'clientes',
  'proprietarios',
  'tipo_documento_imovel',
  'categorias_amenidades',
  'amenidades',
  'categorias_proximidades',
  'proximidades',
  'tipos_imovel',
  'status_imovel',
  'finalidades_imovel',
  'imoveis',
  'imovel_amenidades',
  'imovel_proximidades',
  'imovel_imagens',
  'imovel_video',
  'imovel_documentos',
  'imovel_rascunho'
];

async function sync() {
  console.log('============================================');
  console.log('🔄 INICIANDO SINCRONIZAÇÃO: VPS ➡️ LOCAL');
  console.log(`   Tenant destino: ${TARGET_TENANT_ID}`);
  console.log('============================================\n');

  try {
    // 1. Testar conexões
    console.log('🔌 Testando conexões...');
    try {
      await localPool.query('SELECT 1');
      console.log('   ✅ Conexão Local OK!');
    } catch (err) {
      throw new Error(`Falha ao conectar no banco local (porta 15432): ${err.message}`);
    }

    try {
      await vpsPool.query('SELECT 1');
      console.log('   ✅ Conexão VPS (túnel SSH) OK!');
    } catch (err) {
      throw new Error(`Falha ao conectar no banco da VPS (porta 5434). O túnel SSH está ativo? Erro: ${err.message}`);
    }

    // 2. Obter IDs de usuários locais para validar criadores/editores de imóveis
    console.log('\n👤 Buscando usuários locais para validação de chaves estrangeiras...');
    const userResult = await localPool.query('SELECT id FROM public.users');
    const localUserIds = new Set(userResult.rows.map(r => r.id));
    console.log(`   Encontrados ${localUserIds.size} usuários locais.`);

    // 3. Limpar as tabelas locais (Ordem CASCADE) - Mantendo clientes e proprietarios intactos
    console.log('\n🧹 Limpando tabelas locais...');
    const TABLES_TO_TRUNCATE = TABLES_TO_SYNC.filter(t => t !== 'clientes' && t !== 'proprietarios');
    const truncateList = TABLES_TO_TRUNCATE.map(t => `public.${t}`).join(', ');
    await localPool.query(`TRUNCATE TABLE ${truncateList} CASCADE;`);
    console.log('   ✅ Tabelas locais limpas com sucesso!');

    // 4. Copiar dados tabela por tabela
    for (const tableName of TABLES_TO_SYNC) {
      console.log(`\n📦 Sincronizando tabela: ${tableName}...`);

      // 4a. Obter colunas existentes no banco de dados local
      const colsResult = await localPool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = $1
      `, [tableName]);
      const localCols = new Set(colsResult.rows.map(r => r.column_name));

      // 4b. Buscar dados da VPS
      const vpsResult = await vpsPool.query(`SELECT * FROM public.${tableName}`);
      console.log(`   VPS: Encontrados ${vpsResult.rows.length} registros.`);

      if (vpsResult.rows.length === 0) {
        console.log(`   ⏭️ Sem registros para copiar.`);
        continue;
      }

      // 4c. Inserir registros localmente
      let insertedCount = 0;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      for (const row of vpsResult.rows) {
        // Filtrar chaves que existem localmente
        const insertCols = Object.keys(row).filter(col => localCols.has(col));
        const insertVals = insertCols.map(col => {
          let val = row[col];

          // Tratamento especial para chaves de usuários não existentes localmente
          if (val && typeof val === 'string' && uuidRegex.test(val)) {
            if ((col.endsWith('_by') || col.endsWith('_fk') || col === 'user_id' || col === 'id_usuario') && !localUserIds.has(val)) {
              val = null; // Evita quebra de Foreign Key
            }
          }

          return val;
        });

        // Injetar tenant_id se a tabela local possuir essa coluna
        if (localCols.has('tenant_id') && !insertCols.includes('tenant_id')) {
          insertCols.push('tenant_id');
          insertVals.push(TARGET_TENANT_ID);
        }

        // Construir query de inserção com ON CONFLICT DO NOTHING
        const placeholders = insertCols.map((_, idx) => `$${idx + 1}`).join(', ');
        const queryText = `
          INSERT INTO public.${tableName} (${insertCols.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `;

        try {
          await localPool.query(queryText, insertVals);
          insertedCount++;
        } catch (err) {
          console.error(`   ❌ Erro ao inserir registro ID ${row.id || 'N/A'}:`, err.message);
        }
      }

      console.log(`   ✅ Sincronizados ${insertedCount}/${vpsResult.rows.length} registros.`);
    }

    console.log('\n============================================');
    console.log('🎉 SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('============================================');

  } catch (err) {
    console.error('\n❌ Erro crítico durante a sincronização:', err.message);
  } finally {
    await localPool.end();
    await vpsPool.end();
  }
}

sync();
