
import pool from '@/lib/database/connection'

// Configurações de XP
const XP_CONFIG = {
  LEAD_RECEBIDO: 0,
  LEAD_ACEITO: 50,
  LEAD_ACEITO_RAPIDO: 100, // < 5 min
  VISITA_AGENDADA: 200,
  VENDA_REALIZADA: 1000,
  LEAD_PERDIDO_SLA: -50,
  NIVEL_BASE: 1000 // XP necessário para subir de nível = nivel * NIVEL_BASE
}

export interface CorretorScore {
  user_id: string
  xp_total: number
  nivel: number
  badges: string[] // JSON array
  leads_recebidos: number
  leads_aceitos: number
  leads_perdidos_sla: number
  visitas_realizadas: number
  vendas_realizadas: number
  tempo_medio_resposta_segundos: number
}

export const GamificationService = {

  /**
   * Inicializa ou recupera o score de um corretor
   */
  async getScore(userId: string): Promise<CorretorScore> {
    const res = await pool.query(`
      INSERT INTO corretor_scores (user_id) VALUES ($1)
      ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id 
      RETURNING *
    `, [userId])
    return res.rows[0]
  },

  /**
   * Adiciona XP a um corretor e recalcula nível
   */
  async awardXP(userId: string, amount: number, metricToIncrement?: keyof CorretorScore): Promise<CorretorScore> {
    const score = await this.getScore(userId)

    let newXP = Number(score.xp_total) + amount
    if (newXP < 0) newXP = 0 // XP não pode ser negativo

    // Cálculo Simples de Nível: XP / 1000 + 1 (ex: 1500xp = Nível 2)
    // Fórmula progressiva pode ser usada depois: XP = 1000 * (nivel^2)/2
    // Vamos manter linear por simplicidade inicial
    const newLevel = Math.floor(newXP / XP_CONFIG.NIVEL_BASE) + 1

    // Atualiza Stats (se houver métrica para incrementar)
    let metricUpdate = ''
    if (metricToIncrement) {
      metricUpdate = `, ${metricToIncrement} = ${metricToIncrement} + 1`
    }

    const updateQuery = `
      UPDATE corretor_scores 
      SET xp_total = $2, nivel = $3, updated_at = NOW() ${metricUpdate}
      WHERE user_id = $1
      RETURNING *
    `
    const res = await pool.query(updateQuery, [userId, newXP, newLevel])
    return res.rows[0]
  },

  /**
   * Registra Aceite de Lead (Gatilho Principal)
   */
  async recordLeadAcceptance(userId: string, timeToAcceptSeconds: number) {
    let xpGain = XP_CONFIG.LEAD_ACEITO

    // Bônus de Velocidade (Shark Tank / The Flash)
    if (timeToAcceptSeconds < 300) { // 5 minutos
      xpGain += (XP_CONFIG.LEAD_ACEITO_RAPIDO - XP_CONFIG.LEAD_ACEITO) // Diferença bônus
    }

    // Calcular nova média de tempo
    // Precisaríamos do total acumulado, mas vamos simplificar:
    // Update apenas do XP e contadores
    await this.awardXP(userId, xpGain, 'leads_aceitos')

    // Atualizar tempo resposta (avg ponderada simples no DB seria melhor, mas requer histórico)
    // Por enquanto, apenas atualizamos se for o primeiro, ou fazemos uma média móvel simples
    await pool.query(`
      UPDATE corretor_scores
      SET tempo_medio_resposta_segundos = 
        CASE 
          WHEN leads_aceitos = 1 THEN $2 
          ELSE (tempo_medio_resposta_segundos + $2) / 2 
        END
      WHERE user_id = $1
    `, [userId, timeToAcceptSeconds])
  },

  /**
   * Penalidade por SLA estourado
   */
  async penalizeSLA(userId: string) {
    await this.awardXP(userId, XP_CONFIG.LEAD_PERDIDO_SLA, 'leads_perdidos_sla')
  },

  /**
   * Relatório de Ranking (Leaderboard)
   */
  async getLeaderboard(params: { page?: number; limit?: number; search?: string }) {
    const page = params.page || 1
    const limit = params.limit || 50
    const offset = (page - 1) * limit

    let whereClause = `WHERE u.ativo = true`
    const values: any[] = []

    if (params.search) {
      values.push(`%${params.search}%`)
      whereClause += ` AND (u.nome ILIKE $${values.length} OR u.email ILIKE $${values.length})`
    }

    // Adicionar LIMIT e OFFSET aos valores
    const query = `
            SELECT 
                u.id, u.nome, u.email,
                COALESCE(cs.nivel, 0) as nivel,
                COALESCE(cs.xp_total, 0) as xp,
                COALESCE(cs.leads_aceitos, 0) as leads_aceitos,
                COALESCE(cs.leads_perdidos_sla, 0) as leads_perdidos,
                COALESCE(cs.tempo_medio_resposta_segundos, 0) as tempo_medio
            FROM users u
            LEFT JOIN corretor_scores cs ON cs.user_id = u.id
            JOIN user_role_assignments ura ON ura.user_id = u.id
            JOIN user_roles ur ON ur.id = ura.role_id AND ur.name = 'Corretor'
            ${whereClause}
            ORDER BY COALESCE(cs.xp_total, 0) DESC, COALESCE(cs.nivel, 0) DESC
            LIMIT ${limit} OFFSET ${offset}
        `

    const countQuery = `
            SELECT COUNT(*) as total
            FROM users u
            JOIN user_role_assignments ura ON ura.user_id = u.id
            JOIN user_roles ur ON ur.id = ura.role_id AND ur.name = 'Corretor'
            ${whereClause}
        `

    const [rowsRes, countRes] = await Promise.all([
      pool.query(query, values),
      pool.query(countQuery, params.search ? [`%${params.search}%`] : [])
    ])

    return {
      data: rowsRes.rows,
      pagination: {
        total: parseInt(countRes.rows[0].total),
        page,
        limit,
        pages: Math.ceil(parseInt(countRes.rows[0].total) / limit)
      }
    }
  },

  /**
   * Histórico de Transbordo (Log)
   */
  async getTransbordoHistory(params: { page?: number; limit?: number; search?: string }) {
    const page = params.page || 1
    const limit = params.limit || 50
    const offset = (page - 1) * limit

    // Busca logs onde houve expiração ou transbordo
    // Podemos filtrar por status 'expirado' ou pela existência de motivo->expirado_em
    let query = `
            SELECT 
                pa.id,
                pa.created_at,
                pa.status,
                pa.expira_em,
                pa.motivo,
                u.nome as corretor_nome,
                i.codigo as imovel_codigo,
                c.nome as cliente_nome
            FROM imovel_prospect_atribuicoes pa
            JOIN users u ON u.id = pa.corretor_fk
            JOIN imovel_prospects ip ON ip.id = pa.prospect_id
            JOIN imoveis i ON i.id = ip.id_imovel
            JOIN clientes c ON c.uuid = ip.id_cliente
            WHERE pa.status IN ('expirado', 'atribuido', 'aceito')
        `

    const values: any[] = []
    if (params.search) {
      query += ` AND (u.nome ILIKE $1 OR i.codigo ILIKE $1 OR c.nome ILIKE $1)`
      values.push(`%${params.search}%`)
    }

    query += ` ORDER BY pa.created_at DESC LIMIT ${limit} OFFSET ${offset}`

    const res = await pool.query(query, values)
    return res.rows
  }
}
