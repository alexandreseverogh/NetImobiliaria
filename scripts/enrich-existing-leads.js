/**
 * Script para executar o EnrichmentService em todos os leads com imovel_id
 * Popula o campo enriquecimento_cache com dados reais dos imoveis
 */
const { Pool } = require('pg')

const pool = new Pool({
  host: '127.0.0.1',
  port: 15432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: 'postgres'
})

async function enrichAllLeads() {
  try {
    // 1. Buscar configuracao do segmento
    const configRes = await pool.query(
      'SELECT target_table, layout_json FROM crm_segmentos_config WHERE domain_id = 1 AND is_active = true'
    )
    if (configRes.rows.length === 0) {
      console.log('Nenhuma configuracao de segmento ativa.')
      return
    }
    const { target_table, layout_json } = configRes.rows[0]
    const layout = layout_json
    console.log('Layout carregado:', JSON.stringify(layout, null, 2))

    // 2. Buscar leads com imovel_id
    const leadsRes = await pool.query(
      'SELECT lead_uuid, imovel_id FROM leads_staging WHERE imovel_id IS NOT NULL'
    )
    console.log(`\nEncontramos ${leadsRes.rows.length} leads com imovel_id para enriquecer.\n`)

    for (const lead of leadsRes.rows) {
      // 3. Buscar dados do imovel
      const dataRes = await pool.query(
        `SELECT * FROM ${target_table} WHERE id = $1`,
        [lead.imovel_id]
      )
      if (dataRes.rows.length === 0) {
        console.log(`  [SKIP] Lead ${lead.lead_uuid}: imovel ${lead.imovel_id} nao encontrado.`)
        continue
      }

      const row = dataRes.rows[0]
      const snapshot = {
        title: layout.title_template || '',
        subtitle: layout.subtitle_template || '',
        badges: []
      }

      // Token replacement no titulo/subtitulo
      for (const key in row) {
        const token = `{{${key}}}`
        snapshot.title = snapshot.title.replace(new RegExp(token.replace(/[{}]/g, '\\$&'), 'g'), row[key] || '')
        snapshot.subtitle = snapshot.subtitle.replace(new RegExp(token.replace(/[{}]/g, '\\$&'), 'g'), row[key] || '')
      }

      // Processar badges
      if (Array.isArray(layout.badges)) {
        snapshot.badges = layout.badges.map(b => {
          let rawValue = row[b.campo]
          let formattedValue = rawValue

          if (typeof rawValue === 'number' && b.campo === 'preco') {
            formattedValue = new Intl.NumberFormat('pt-BR').format(rawValue)
          }

          return {
            label: b.label,
            icone: b.icone,
            valor: `${b.prefixo || ''}${formattedValue || '---'}${b.sufixo || ''}`
          }
        })
      }

      // 4. Salvar no cache
      await pool.query(
        'UPDATE leads_staging SET enriquecimento_cache = $1, updated_at = NOW() WHERE lead_uuid = $2',
        [JSON.stringify(snapshot), lead.lead_uuid]
      )

      console.log(`  [OK] Lead ${lead.lead_uuid} enriquecido: "${snapshot.title}" - ${snapshot.badges.length} badges`)
    }

    console.log('\nEnriquecimento concluido com sucesso!')
  } catch (err) {
    console.error('ERRO:', err)
  } finally {
    await pool.end()
  }
}

enrichAllLeads()
