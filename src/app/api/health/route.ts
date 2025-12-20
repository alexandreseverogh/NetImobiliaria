import { NextResponse } from 'next/server'
import { testConnection } from '@/lib/database/connection'

/**
 * Healthcheck da aplicação (para Docker/K8s/monitoramento).
 * - Não expõe detalhes sensíveis
 * - Opcionalmente valida conexão com o banco
 */
export async function GET() {
  const startedAt = Date.now()

  // Em dev, ainda é útil validar DB. Em cenários de manutenção, pode-se desabilitar.
  const checkDb = process.env.HEALTHCHECK_DB !== 'false'

  try {
    const dbOk = checkDb ? await testConnection() : true

    return NextResponse.json(
      {
        ok: true,
        db: dbOk ? 'ok' : 'fail',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startedAt
      },
      { status: dbOk ? 200 : 503 }
    )
  } catch {
    return NextResponse.json(
      {
        ok: false,
        db: 'fail',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startedAt
      },
      { status: 503 }
    )
  }
}


