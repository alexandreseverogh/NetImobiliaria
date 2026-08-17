import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { uploadToS3, getS3Url } from '@/lib/storage/s3-client'
import { randomUUID } from 'crypto'
import { touchPendency } from '@/lib/crm/pendencia/pendencyState'

/**
 * ATIVIDADES POR LEAD (CRM)
 * N atividades por card do Kanban ao longo do ciclo de vendas/perda.
 * Mutável (edição/exclusão real pelo usuário) — exclusão é soft-delete.
 */

function getCurrentUser(request: NextRequest): { userId: string, tenantId?: string, is_system_role?: boolean } | null {
  try {
    const token = request.cookies.get('admin_auth_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return null

    const decoded = verifyTokenNode(token) as any
    if (!decoded) return null

    return {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      is_system_role: decoded.is_system_role === true
    }
  } catch (error) {
    return null
  }
}

const ATTACHMENT_TYPES: Record<string, { kind: 'audio' | 'imagem' | 'pdf'; ext: string }> = {
  'application/pdf': { kind: 'pdf', ext: 'pdf' },
  'image/jpeg': { kind: 'imagem', ext: 'jpg' },
  'image/jpg':  { kind: 'imagem', ext: 'jpg' },
  'image/png':  { kind: 'imagem', ext: 'png' },
  'image/webp': { kind: 'imagem', ext: 'webp' },
  'audio/mpeg': { kind: 'audio', ext: 'mp3' },
  'audio/mp3':  { kind: 'audio', ext: 'mp3' },
  'audio/ogg':  { kind: 'audio', ext: 'ogg' },
  'audio/wav':  { kind: 'audio', ext: 'wav' },
  'audio/webm': { kind: 'audio', ext: 'webm' },
  'audio/mp4':  { kind: 'audio', ext: 'm4a' },
};

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const MIN_DESCRICAO_LEN = 15;

// LISTAR ATIVIDADES DE UM LEAD — mais recente primeiro
export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const isMaster = currentUser.is_system_role === true

    const { searchParams } = new URL(request.url)
    const leadUuid = searchParams.get('lead_uuid')
    if (!leadUuid) return NextResponse.json({ error: 'lead_uuid necessário' }, { status: 400 })

    const query = `
      SELECT a.*, t.nome AS tipo_nome, t.icone AS tipo_icone, t.cor AS tipo_cor,
             u.nome AS usuario_nome
      FROM atividades_lead a
      JOIN tipos_atividade t ON t.id = a.tipo_atividade_id
      LEFT JOIN users u ON u.id = a.usuario_id
      WHERE a.lead_uuid = $1 AND a.deleted_at IS NULL
        ${!isMaster ? 'AND a.tenant_id = $2' : ''}
      ORDER BY a.created_at DESC
    `
    const { rows } = !isMaster
      ? await pool.query(query, [leadUuid, currentUser.tenantId])
      : await pool.query(query, [leadUuid])

    return NextResponse.json({ success: true, atividades: rows })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// CRIAR ATIVIDADE — multipart/form-data (lead_uuid, tipo_atividade_id, descricao, arquivo?)
export async function POST(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser?.tenantId && !currentUser?.is_system_role) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const leadUuid = formData.get('lead_uuid') as string | null
    const tipoAtividadeId = formData.get('tipo_atividade_id') as string | null
    const descricao = (formData.get('descricao') as string | null)?.trim()
    const file = formData.get('arquivo') as File | null

    if (!leadUuid || !tipoAtividadeId || !descricao) {
      return NextResponse.json({ error: 'lead_uuid, tipo_atividade_id e descricao são obrigatórios' }, { status: 400 })
    }
    if (descricao.length < MIN_DESCRICAO_LEN) {
      return NextResponse.json({ error: `Descrição precisa ter pelo menos ${MIN_DESCRICAO_LEN} caracteres.` }, { status: 400 })
    }

    // Resolve tenant/cliente/coluna atual do lead a partir do próprio lead — nunca confia no
    // que o client mandaria, evita atribuir atividade a um lead de outro tenant.
    const leadRes = await pool.query(
      `SELECT l.tenant_id, l.client_id, lk.coluna_id
         FROM leads_staging l
         LEFT JOIN leads_kanban lk ON lk.lead_uuid = l.lead_uuid
        WHERE l.lead_uuid = $1`,
      [leadUuid],
    )
    if (leadRes.rows.length === 0) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }
    const lead = leadRes.rows[0]
    if (!currentUser.is_system_role && lead.tenant_id !== currentUser.tenantId) {
      return NextResponse.json({ error: 'Sem permissão para este lead' }, { status: 403 })
    }

    let anexoUrl: string | null = null
    let anexoTipo: string | null = null
    let anexoNomeOriginal: string | null = null
    let anexoTamanhoBytes: number | null = null

    if (file && file.size > 0) {
      const meta = ATTACHMENT_TYPES[file.type]
      if (!meta) {
        return NextResponse.json({ error: `Tipo de arquivo não permitido: ${file.type}. Use áudio, imagem ou PDF.` }, { status: 400 })
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Limite: 20 MB.` }, { status: 400 })
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      const key = `atividades/${lead.tenant_id}/${leadUuid}/${randomUUID()}.${meta.ext}`
      const result = await uploadToS3(key, buffer, file.type)
      if (!result) {
        return NextResponse.json({ error: 'Object Storage não configurado (S3_ENDPOINT ausente).' }, { status: 500 })
      }
      anexoUrl = getS3Url(key) ?? result.url
      anexoTipo = meta.kind
      anexoNomeOriginal = file.name
      anexoTamanhoBytes = file.size
    }

    const insertQuery = `
      INSERT INTO atividades_lead (
        lead_uuid, tipo_atividade_id, descricao, coluna_id, usuario_id,
        anexo_url, anexo_tipo, anexo_nome_original, anexo_tamanho_bytes,
        tenant_id, client_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `
    const { rows } = await pool.query(insertQuery, [
      leadUuid, parseInt(tipoAtividadeId, 10), descricao, lead.coluna_id || null, currentUser.userId,
      anexoUrl, anexoTipo, anexoNomeOriginal, anexoTamanhoBytes,
      lead.tenant_id, lead.client_id,
    ])

    // G0 — registrar atividade muda de quem é a bola (ver docs/PLANO_PENDENCIA_ATENDIMENTO.md).
    // Qual direção depende de tipos_atividade.is_entrada, resolvido dentro do motor canônico.
    await touchPendency(leadUuid).catch((err) => {
      console.error('[crm/atividades] falha ao atualizar pendência de atendimento:', err)
    })

    return NextResponse.json({ success: true, atividade: rows[0] })
  } catch (error: any) {
    console.error('POST /crm/atividades error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// EDITAR ATIVIDADE — descricao e/ou tipo (troca de anexo via multipart, opcional)
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser?.tenantId && !currentUser?.is_system_role) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const isMaster = currentUser.is_system_role === true

    const contentType = request.headers.get('content-type') || ''
    let id: string, descricao: string | undefined, tipoAtividadeId: string | undefined, file: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      id = formData.get('id') as string
      descricao = (formData.get('descricao') as string | null)?.trim()
      tipoAtividadeId = (formData.get('tipo_atividade_id') as string | null) || undefined
      file = formData.get('arquivo') as File | null
    } else {
      const body = await request.json()
      id = body.id
      descricao = body.descricao?.trim()
      tipoAtividadeId = body.tipo_atividade_id ? String(body.tipo_atividade_id) : undefined
    }

    if (!id) return NextResponse.json({ error: 'id necessário' }, { status: 400 })
    if (descricao !== undefined && descricao.length < MIN_DESCRICAO_LEN) {
      return NextResponse.json({ error: `Descrição precisa ter pelo menos ${MIN_DESCRICAO_LEN} caracteres.` }, { status: 400 })
    }

    const existingRes = await pool.query(
      `SELECT * FROM atividades_lead WHERE id = $1 AND deleted_at IS NULL ${!isMaster ? 'AND tenant_id = $2' : ''}`,
      !isMaster ? [id, currentUser.tenantId] : [id],
    )
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ error: 'Atividade não encontrada ou sem permissão.' }, { status: 404 })
    }
    const existing = existingRes.rows[0]

    let anexoUrl = existing.anexo_url
    let anexoTipo = existing.anexo_tipo
    let anexoNomeOriginal = existing.anexo_nome_original
    let anexoTamanhoBytes = existing.anexo_tamanho_bytes

    if (file && file.size > 0) {
      const meta = ATTACHMENT_TYPES[file.type]
      if (!meta) {
        return NextResponse.json({ error: `Tipo de arquivo não permitido: ${file.type}.` }, { status: 400 })
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: `Arquivo muito grande. Limite: 20 MB.` }, { status: 400 })
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      const key = `atividades/${existing.tenant_id}/${existing.lead_uuid}/${randomUUID()}.${meta.ext}`
      const result = await uploadToS3(key, buffer, file.type)
      if (!result) {
        return NextResponse.json({ error: 'Object Storage não configurado.' }, { status: 500 })
      }
      anexoUrl = getS3Url(key) ?? result.url
      anexoTipo = meta.kind
      anexoNomeOriginal = file.name
      anexoTamanhoBytes = file.size
    }

    const { rows } = await pool.query(
      `UPDATE atividades_lead
          SET descricao = COALESCE($1, descricao),
              tipo_atividade_id = COALESCE($2, tipo_atividade_id),
              anexo_url = $3, anexo_tipo = $4, anexo_nome_original = $5, anexo_tamanho_bytes = $6,
              updated_at = NOW()
        WHERE id = $7
        RETURNING *`,
      [
        descricao ?? null,
        tipoAtividadeId ? parseInt(tipoAtividadeId, 10) : null,
        anexoUrl, anexoTipo, anexoNomeOriginal, anexoTamanhoBytes,
        id,
      ],
    )

    // G0 — trocar o TIPO da atividade pode inverter a direção (is_entrada), então a pendência
    // precisa ser recomputada também na edição, não só na criação.
    if (rows[0]?.lead_uuid) {
      await touchPendency(rows[0].lead_uuid).catch((err) => {
        console.error('[crm/atividades] falha ao atualizar pendência de atendimento:', err)
      })
    }

    return NextResponse.json({ success: true, atividade: rows[0] })
  } catch (error: any) {
    console.error('PATCH /crm/atividades error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// EXCLUIR ATIVIDADE — soft delete
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser?.tenantId && !currentUser?.is_system_role) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const isMaster = currentUser.is_system_role === true

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID necessário' }, { status: 400 })

    const { rows } = await pool.query(
      `UPDATE atividades_lead SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL ${!isMaster ? 'AND tenant_id = $2' : ''}
        RETURNING id, lead_uuid`,
      !isMaster ? [id, currentUser.tenantId] : [id],
    )
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Atividade não encontrada ou sem permissão.' }, { status: 404 })
    }

    // G0 — remover a atividade pode fazer a bola VOLTAR pra nós (se era a única ação nossa
    // registrada). O motor canônico ignora atividades com deleted_at, então basta recomputar.
    await touchPendency(rows[0].lead_uuid).catch((err) => {
      console.error('[crm/atividades] falha ao atualizar pendência de atendimento:', err)
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
