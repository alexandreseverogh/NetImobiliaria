import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

// GET - Buscar valores de destaque por estado
export async function GET(request: NextRequest) {
  try {
    // Verificar permiss├Áes
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    // Buscar todos os estados e seus valores de destaque
    // Estados brasileiros (27 estados)
    const estados = [
      { sigla: 'AC', nome: 'Acre' },
      { sigla: 'AL', nome: 'Alagoas' },
      { sigla: 'AP', nome: 'Amap├í' },
      { sigla: 'AM', nome: 'Amazonas' },
      { sigla: 'BA', nome: 'Bahia' },
      { sigla: 'CE', nome: 'Cear├í' },
      { sigla: 'DF', nome: 'Distrito Federal' },
      { sigla: 'ES', nome: 'Esp├¡rito Santo' },
      { sigla: 'GO', nome: 'Goi├ís' },
      { sigla: 'MA', nome: 'Maranh├úo' },
      { sigla: 'MT', nome: 'Mato Grosso' },
      { sigla: 'MS', nome: 'Mato Grosso do Sul' },
      { sigla: 'MG', nome: 'Minas Gerais' },
      { sigla: 'PA', nome: 'Par├í' },
      { sigla: 'PB', nome: 'Para├¡ba' },
      { sigla: 'PR', nome: 'Paran├í' },
      { sigla: 'PE', nome: 'Pernambuco' },
      { sigla: 'PI', nome: 'Piau├¡' },
      { sigla: 'RJ', nome: 'Rio de Janeiro' },
      { sigla: 'RN', nome: 'Rio Grande do Norte' },
      { sigla: 'RS', nome: 'Rio Grande do Sul' },
      { sigla: 'RO', nome: 'Rond├┤nia' },
      { sigla: 'RR', nome: 'Roraima' },
      { sigla: 'SC', nome: 'Santa Catarina' },
      { sigla: 'SP', nome: 'S├úo Paulo' },
      { sigla: 'SE', nome: 'Sergipe' },
      { sigla: 'TO', nome: 'Tocantins' }
    ]

    // Buscar valores de destaque do banco
    const valoresResult = await pool.query(
      `SELECT estado_fk, valor_destaque
       FROM valor_destaque_local 
       WHERE cidade_fk = 'TODAS'
       ORDER BY estado_fk`
    )

    // Criar mapa de valores por estado
    const valoresDestaqueMap = new Map<string, number>()
    valoresResult.rows.forEach((row: any) => {
      valoresDestaqueMap.set(row.estado_fk, parseFloat(row.valor_destaque) || 0.00)
    })

    // Combinar estados com seus valores
    const estadosComValores = estados.map(estado => ({
      sigla: estado.sigla,
      nome: estado.nome,
      valor_destaque: valoresDestaqueMap.get(estado.sigla) || 0.00
    }))

    return NextResponse.json({
      success: true,
      data: estadosComValores
    })

  } catch (error) {
    console.error('Erro ao buscar valores de destaque:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar valores de destaque' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar valores de destaque por estado
export async function PUT(request: NextRequest) {
  try {
    // Verificar permiss├Áes
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const body = await request.json()
    const { estados } = body

    // Valida├º├Áes
    if (!estados || !Array.isArray(estados)) {
      return NextResponse.json(
        { error: 'Array de estados ├® obrigat├│rio' },
        { status: 400 }
      )
    }

    // Iniciar transa├º├úo
    await pool.query('BEGIN')

    try {
      let atualizados = 0

      for (const estado of estados) {
        const { sigla, valor_destaque } = estado

        // Validar sigla
        if (!sigla || typeof sigla !== 'string' || sigla.length !== 2) {
          continue
        }

        // Validar valores
        const valorDestaqueNumerico = parseFloat(valor_destaque)
        
        if (isNaN(valorDestaqueNumerico) || valorDestaqueNumerico < 0) {
          continue
        }

        // Atualizar ou inserir valores (apenas destaque)
        await pool.query(
          `INSERT INTO valor_destaque_local (estado_fk, cidade_fk, valor_destaque, created_at, updated_at)
           VALUES ($1, 'TODAS', $2, NOW(), NOW())
           ON CONFLICT (estado_fk, cidade_fk) 
           DO UPDATE SET valor_destaque = $2, updated_at = NOW()`,
          [sigla.toUpperCase(), valorDestaqueNumerico]
        )

        atualizados++
      }

      // Commit transa├º├úo
      await pool.query('COMMIT')

      return NextResponse.json({
        success: true,
        message: `${atualizados} estado(s) atualizado(s) com sucesso`,
        data: { atualizados }
      })

    } catch (error) {
      // Rollback em caso de erro
      await pool.query('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Erro ao atualizar valores de destaque:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao atualizar valores de destaque' },
      { status: 500 }
    )
  }
}


