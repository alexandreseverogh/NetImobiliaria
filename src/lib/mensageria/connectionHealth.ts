import axios from 'axios'
import pool from '@/lib/database/connection'

/**
 * Verificação periódica das conexões de WhatsApp (Evolution).
 *
 * - Para cada servidor: marca se ele responde (last_reachable).
 * - Para cada empresa com instância: consulta o estado e grava. Quando deixa de estar "open",
 *   registra a queda (evolution_disconnected_at) uma única vez; quando volta, limpa.
 * Não envia mensagem a ninguém: o aviso ao administrador é a faixa na área administrativa, e o
 * aviso ao Master é o indicador na tela de servidores. Nunca lança erro para o cron.
 */

const TIMEOUT_MS = 8000

export async function checkWhatsappConnections(): Promise<{
  servers: number; unreachableServers: number; tenants: number; disconnected: number
}> {
  // 1) Servidores
  const { rows: servers } = await pool.query(
    `SELECT id, api_url, api_key FROM public.evolution_servers WHERE is_active = true`,
  )
  let unreachableServers = 0
  for (const s of servers) {
    let reachable = true
    try {
      await axios.get(`${s.api_url}/instance/fetchInstances`, { headers: { apikey: s.api_key }, timeout: TIMEOUT_MS })
    } catch {
      reachable = false
      unreachableServers++
    }
    await pool.query(
      `UPDATE public.evolution_servers SET last_reachable = $1, last_checked_at = now() WHERE id = $2`,
      [reachable, s.id],
    )
  }

  // 2) Empresas com instância
  const { rows: tenants } = await pool.query(
    `SELECT id, evolution_api_url, evolution_api_key, evolution_instance, evolution_disconnected_at
       FROM public.tenants
      WHERE evolution_instance IS NOT NULL AND evolution_api_url IS NOT NULL AND evolution_api_key IS NOT NULL`,
  )
  let disconnected = 0
  for (const t of tenants) {
    let state = 'unreachable'
    try {
      const res = await axios.get(
        `${t.evolution_api_url}/instance/connectionState/${t.evolution_instance}`,
        { headers: { apikey: t.evolution_api_key }, timeout: TIMEOUT_MS },
      )
      state = String(res.data?.instance?.state ?? 'unknown')
    } catch {
      state = 'unreachable'
    }

    const isOpen = state === 'open'
    if (!isOpen) disconnected++
    await pool.query(
      `UPDATE public.tenants
          SET evolution_state = $1,
              evolution_checked_at = now(),
              evolution_disconnected_at = CASE
                WHEN $2::boolean THEN NULL
                ELSE COALESCE(evolution_disconnected_at, now())
              END
        WHERE id = $3`,
      [state, isOpen, t.id],
    )
  }

  return { servers: servers.length, unreachableServers, tenants: tenants.length, disconnected }
}
