const { Pool } = require('pg');

// Configurações dos bancos
const mainDbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: 'Roberto@2007'
};

const tokenDbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'net_imobiliaria_tokenizacao',
  user: 'postgres',
  password: 'Roberto@2007'
};

// Criar pools de conexão
const mainDb = new Pool(mainDbConfig);
const tokenDb = new Pool(tokenDbConfig);

// Função para sincronizar dados
async function syncData() {
  console.log('🔄 Iniciando sincronização de dados...');
  
  try {
    // Testar conexões
    console.log('📡 Testando conexões...');
    
    const mainClient = await mainDb.connect();
    console.log('✅ Conexão com banco principal estabelecida');
    mainClient.release();
    
    const tokenClient = await tokenDb.connect();
    console.log('✅ Conexão com banco de tokenização estabelecida');
    tokenClient.release();
    
    // Sincronizar tabelas principais
    console.log('📊 Sincronizando tabelas...');
    
    // Sincronizar tabelas principais
    await syncTable('users', mainDb, tokenDb);
    await syncTable('imoveis', mainDb, tokenDb);
    await syncTable('clientes', mainDb, tokenDb);
    await syncTable('proprietarios', mainDb, tokenDb);
    await syncTable('permissions', mainDb, tokenDb);
    await syncTable('resources', mainDb, tokenDb);
    await syncTable('user_permissions', mainDb, tokenDb);
    await syncTable('user_roles', mainDb, tokenDb);
    await syncTable('user_role_assignments', mainDb, tokenDb);
    await syncTable('role_permissions', mainDb, tokenDb);
    await syncTable('actions', mainDb, tokenDb);
    await syncTable('audit_logs', mainDb, tokenDb);
    await syncTable('system_features', mainDb, tokenDb);
    await syncTable('tipos_imovel', mainDb, tokenDb);
    await syncTable('finalidades_imovel', mainDb, tokenDb);
    await syncTable('status_imovel', mainDb, tokenDb);
    await syncTable('estados', mainDb, tokenDb);
    await syncTable('cidades', mainDb, tokenDb);
    await syncTable('municipios', mainDb, tokenDb);
    
    console.log('✅ Sincronização concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante sincronização:', error.message);
    process.exit(1);
  } finally {
    await mainDb.end();
    await tokenDb.end();
  }
}

// Função para sincronizar uma tabela específica
async function syncTable(tableName, sourceDb, targetDb) {
  console.log(`📋 Sincronizando tabela: ${tableName}`);
  
  try {
    // Verificar se a tabela existe no banco principal
    const sourceClient = await sourceDb.connect();
    const tableExists = await sourceClient.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '${tableName}'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log(`⚠️  Tabela ${tableName} não existe no banco principal`);
      sourceClient.release();
      return;
    }
    
    // Obter colunas da tabela principal
    const sourceColumns = await sourceClient.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = '${tableName}'
      ORDER BY ordinal_position
    `);
    
    // Obter colunas da tabela de destino
    const targetClient = await targetDb.connect();
    const targetColumns = await targetClient.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = '${tableName}'
      ORDER BY ordinal_position
    `);
    
    // Encontrar colunas comuns
    const sourceColNames = sourceColumns.rows.map(row => row.column_name);
    const targetColNames = targetColumns.rows.map(row => row.column_name);
    const commonColumns = sourceColNames.filter(col => targetColNames.includes(col));
    
    if (commonColumns.length === 0) {
      console.log(`⚠️  Nenhuma coluna comum encontrada para tabela ${tableName}`);
      sourceClient.release();
      targetClient.release();
      return;
    }
    
    console.log(`📊 Colunas comuns para ${tableName}: ${commonColumns.join(', ')}`);
    
    // Obter dados apenas das colunas comuns
    const result = await sourceClient.query(`SELECT ${commonColumns.join(', ')} FROM ${tableName}`);
    sourceClient.release();
    
    if (result.rows.length === 0) {
      console.log(`⚠️  Tabela ${tableName} está vazia no banco principal`);
      targetClient.release();
      return;
    }
    
    // Limpar tabela no banco de tokenização
    await targetClient.query(`DELETE FROM ${tableName}`);
    
    // Inserir dados no banco de tokenização
    for (const row of result.rows) {
      const values = commonColumns.map(col => row[col]);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
      
      const query = `INSERT INTO ${tableName} (${commonColumns.join(', ')}) VALUES (${placeholders})`;
      await targetClient.query(query, values);
    }
    
    targetClient.release();
    console.log(`✅ Tabela ${tableName} sincronizada: ${result.rows.length} registros`);
    
  } catch (error) {
    console.error(`❌ Erro ao sincronizar tabela ${tableName}:`, error.message);
  }
}

// Função para sincronização completa
async function fullSync() {
  console.log('🚀 Iniciando sincronização completa...');
  await syncData();
}

// Função para sincronização incremental
async function incrementalSync() {
  console.log('🔄 Iniciando sincronização incremental...');
  // Implementar lógica de sincronização incremental baseada em timestamps
  console.log('⚠️  Sincronização incremental ainda não implementada');
}

// Verificar argumentos da linha de comando
const args = process.argv.slice(2);

if (args.includes('full')) {
  fullSync();
} else if (args.includes('incremental')) {
  incrementalSync();
} else {
  console.log('📖 Uso: node sync-data.js [full|incremental]');
  console.log('   full        - Sincronização completa');
  console.log('   incremental - Sincronização incremental');
}