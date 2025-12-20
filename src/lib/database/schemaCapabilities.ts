import pool from './connection'

export interface DbCapabilities {
  imoveis: {
    tipo_fk: boolean
    tipo_id: boolean
    status_fk: boolean
    status_id: boolean
    finalidade_fk: boolean
    cidade_fk: boolean
    cidade: boolean
    estado_fk: boolean
    estado: boolean
    destaque_nacional: boolean
  }
  finalidades_imovel: {
    tipo_destaque: boolean
    vender_landpaging: boolean
    alugar_landpaging: boolean
  }
  imovel_imagens: {
    imagem: boolean
    tipo_mime: boolean
    url: boolean
  }
  status_imovel: {
    consulta_imovel_internauta: boolean
  }
}

let cachedCapabilitiesPromise: Promise<DbCapabilities> | null = null

function has(cols: Set<string>, name: string) {
  return cols.has(name)
}

/**
 * Detecta (uma vez por processo) quais colunas existem no schema atual.
 * Isso permite suportar DB "legado" vs DB "novo" sem quebrar o app.
 */
export async function getDbCapabilities(): Promise<DbCapabilities> {
  if (cachedCapabilitiesPromise) return cachedCapabilitiesPromise

  cachedCapabilitiesPromise = (async () => {
    const result = await pool.query<{
      table_name: string
      column_name: string
    }>(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('imoveis', 'finalidades_imovel', 'imovel_imagens', 'status_imovel')
    `)

    const byTable = new Map<string, Set<string>>()
    for (const row of result.rows) {
      if (!byTable.has(row.table_name)) byTable.set(row.table_name, new Set())
      byTable.get(row.table_name)!.add(row.column_name)
    }

    const imoveisCols = byTable.get('imoveis') ?? new Set<string>()
    const finalidadesCols = byTable.get('finalidades_imovel') ?? new Set<string>()
    const imagensCols = byTable.get('imovel_imagens') ?? new Set<string>()
    const statusCols = byTable.get('status_imovel') ?? new Set<string>()

    return {
      imoveis: {
        tipo_fk: has(imoveisCols, 'tipo_fk'),
        tipo_id: has(imoveisCols, 'tipo_id'),
        status_fk: has(imoveisCols, 'status_fk'),
        status_id: has(imoveisCols, 'status_id'),
        finalidade_fk: has(imoveisCols, 'finalidade_fk'),
        cidade_fk: has(imoveisCols, 'cidade_fk'),
        cidade: has(imoveisCols, 'cidade'),
        estado_fk: has(imoveisCols, 'estado_fk'),
        estado: has(imoveisCols, 'estado'),
        destaque_nacional: has(imoveisCols, 'destaque_nacional')
      },
      finalidades_imovel: {
        tipo_destaque: has(finalidadesCols, 'tipo_destaque'),
        vender_landpaging: has(finalidadesCols, 'vender_landpaging'),
        alugar_landpaging: has(finalidadesCols, 'alugar_landpaging')
      },
      imovel_imagens: {
        imagem: has(imagensCols, 'imagem'),
        tipo_mime: has(imagensCols, 'tipo_mime'),
        url: has(imagensCols, 'url')
      },
      status_imovel: {
        consulta_imovel_internauta: has(statusCols, 'consulta_imovel_internauta')
      }
    }
  })()

  return cachedCapabilitiesPromise
}


