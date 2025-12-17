import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

// POST - Migrar categorias de texto para FK
export async function POST(request: NextRequest) {
  console.log('🚀 POST /api/admin/system-features/migrate-categories chamado')
  
  try {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Backup
      await client.query('CREATE TABLE IF NOT EXISTS system_features_backup AS SELECT * FROM system_features')
      console.log('✅ Backup criado')
      
      // Mapeamento de categorias conforme especificado
      const categoryMapping = [
        // Categoria 1: Sistema
        { names: ['Gestão de Categorias', 'Funcionalidades do Sistema'], category_id: 1 },
        // Categoria 2: Permissões  
        { names: ['Hierarquia de Perfis', 'Gestão de Perfis', 'Configuração de Permissões'], category_id: 2 },
        // Categoria 3: Administrativo
        { names: ['Gestão de Usuários', 'Gestão de Tipos de Documentos', 'Gestão de Categorias de Amenidades', 'Gestão de Amenidades', 'Gestão de Categorias de Proximidades', 'Gestão de Proximidades'], category_id: 3 },
        // Categoria 4: Imóveis
        { names: ['Gestão de Tipos de Imóveis', 'Gestão de Finalidades', 'Gestão de Status de Imóveis', 'Mudança de Status', 'Gestão de Imóveis'], category_id: 4 },
        // Categoria 5: Clientes
        { names: ['Gestão de Clientes'], category_id: 5 },
        // Categoria 6: Proprietários
        { names: ['Gestão de Proprietários'], category_id: 6 },
        // Categoria 7: Dashboard / Relatórios
        { names: ['Dashboards', 'Relatório de Vendas'], category_id: 7 }
      ]
      
      let updatedCount = 0
      
      for (const mapping of categoryMapping) {
        for (const name of mapping.names) {
          const result = await client.query(
            'UPDATE system_features SET category_id = $1 WHERE name = $2',
            [mapping.category_id, name]
          )
          if ((result.rowCount ?? 0) > 0) {
            updatedCount++
            console.log(`✅ ${name} → categoria ${mapping.category_id}`)
          }
        }
      }
      
      // Atualizar constraint FK
      await client.query('ALTER TABLE system_features DROP CONSTRAINT IF EXISTS system_features_category_id_fkey')
      await client.query('ALTER TABLE system_features ADD CONSTRAINT system_features_category_id_fkey FOREIGN KEY (category_id) REFERENCES system_categorias(id)')
      console.log('✅ FK constraint atualizada')
      
      // Recriar índices
      await client.query('DROP INDEX IF EXISTS idx_system_features_category')
      await client.query('CREATE INDEX idx_system_features_category_id ON system_features (category_id)')
      await client.query('CREATE INDEX idx_system_features_category_id_active ON system_features (category_id, is_active)')
      console.log('✅ Índices recriados')
      
      await client.query('COMMIT')
      
      // Verificar resultado
      const result = await client.query(`
        SELECT 
          sf.name,
          sc.name as categoria_nome,
          sf.category_id
        FROM system_features sf
        LEFT JOIN system_categorias sc ON sf.category_id = sc.id
        WHERE sf.category_id IS NOT NULL
        ORDER BY sc.sort_order, sf.name
      `)
      
      return NextResponse.json({
        success: true,
        message: `Migração concluída! ${updatedCount} funcionalidades atualizadas.`,
        updated_count: updatedCount,
        features: result.rows
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('❌ Erro na migração:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro na migração: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

