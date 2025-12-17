import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

// POST - Popular tabela system_feature_categorias
export async function POST(request: NextRequest) {
  console.log('🚀 POST /api/admin/system-features/populate-feature-categories chamado')
  
  try {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Limpar tabela existente
      await client.query('DELETE FROM system_feature_categorias')
      console.log('✅ Tabela system_feature_categorias limpa')
      
      // Mapeamento conforme especificado pelo usuário
      const featureCategoryMapping = [
        // Categoria 1: Sistema
        { featureNames: ['Gestão de Categorias', 'Funcionalidades do Sistema'], categoryId: 1 },
        // Categoria 2: Permissões  
        { featureNames: ['Hierarquia de Perfis', 'Gestão de Perfis', 'Configuração de Permissões'], categoryId: 2 },
        // Categoria 3: Administrativo
        { featureNames: ['Gestão de Usuários', 'Gestão de Tipos de Documentos', 'Gestão de Categorias de Amenidades', 'Gestão de Amenidades', 'Gestão de Categorias de Proximidades', 'Gestão de Proximidades'], categoryId: 3 },
        // Categoria 4: Imóveis
        { featureNames: ['Gestão de Tipos de Imóveis', 'Gestão de Finalidades', 'Gestão de Status de Imóveis', 'Mudança de Status', 'Gestão de Imóveis'], categoryId: 4 },
        // Categoria 5: Clientes
        { featureNames: ['Gestão de Clientes'], categoryId: 5 },
        // Categoria 6: Proprietários
        { featureNames: ['Gestão de Proprietários'], categoryId: 6 },
        // Categoria 7: Dashboard / Relatórios
        { featureNames: ['Dashboards', 'Relatório de Vendas'], categoryId: 7 }
      ]
      
      let insertedCount = 0
      
      for (const mapping of featureCategoryMapping) {
        for (const featureName of mapping.featureNames) {
          // Buscar ID da funcionalidade
          const featureResult = await client.query(
            'SELECT id FROM system_features WHERE name = $1',
            [featureName]
          )
          
          if (featureResult.rows.length > 0) {
            const featureId = featureResult.rows[0].id
            
            // Inserir relacionamento
            await client.query(`
              INSERT INTO system_feature_categorias (feature_id, category_id, sort_order, created_by)
              VALUES ($1, $2, $3, $4)
            `, [featureId, mapping.categoryId, insertedCount + 1, 'cc8220f7-a3fd-40ed-8dbd-a22539328083'])
            
            insertedCount++
            console.log(`✅ ${featureName} (ID: ${featureId}) → categoria ${mapping.categoryId}`)
          } else {
            console.log(`⚠️ Funcionalidade não encontrada: ${featureName}`)
          }
        }
      }
      
      await client.query('COMMIT')
      
      // Verificar resultado
      const result = await client.query(`
        SELECT 
          sfc.id,
          sf.name as feature_name,
          sc.name as category_name,
          sfc.sort_order
        FROM system_feature_categorias sfc
        JOIN system_features sf ON sfc.feature_id = sf.id
        JOIN system_categorias sc ON sfc.category_id = sc.id
        ORDER BY sc.sort_order, sfc.sort_order
      `)
      
      return NextResponse.json({
        success: true,
        message: `Relacionamentos criados! ${insertedCount} funcionalidades associadas às categorias.`,
        inserted_count: insertedCount,
        relationships: result.rows
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('❌ Erro ao popular relacionamentos:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro ao popular relacionamentos: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

