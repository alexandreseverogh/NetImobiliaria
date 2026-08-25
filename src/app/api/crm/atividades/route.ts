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
 * Cada atividade pode ter N anexos (atividade_lead_anexos) — nunca substituídos, sempre
 * empilhados; remover um anexo individual é feito por
 * DELETE /api/crm/atividades/anexos?id=X.
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

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB por arquivo
const MIN_DESCRICAO_LEN = 15;

interface UploadedAnexo {
  s3Key: string
  url: string
  tipo: 'audio' | 'imagem' | 'pdf'
  nomeOriginal: string
  tamanhoBytes: number
}

/** Faz upload de todos os arquivos válidos de uma lista, na ordem em que vieram. Lança erro
 *  (com mensagem já pronta pra resposta HTTP) no primeiro arquivo inválido — nunca faz upload
 *  parcial de um lote rejeitado pela metade. */
async function uploadAnexos(files: File[], tenantId: string, leadUuid: string): Promise<UploadedAnexo[]> {
  const uploaded: UploadedAnexo[] = []
  for (const file of files) {
    if (!file || file.size === 0) continue
    const meta = ATTACHMENT_TYPES[file.type]
    if (!meta) {
      throw new Error(`Tipo de arquivo não permitido: ${file.type}. Use áudio, imagem ou PDF.`)
    }
    if (file.size > MAX_BYTES) {
      throw new Error(`Arquivo "${file.name}" muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Limite: 20 MB.`)
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    const key = `atividades/${tenantId}/${leadUuid}/${randomUUID()}.${meta.ext}`
    const result = await uploadToS3(key, buffer, file.type)
    if (!result) {
      throw new Error('Object Storage não configurado (S3_ENDPOINT ausente).')
    }
    uploaded.push({
      s3Key: key,
      url: getS3Url(key) ?? result.url,
      tipo: meta.kind,
      nomeOriginal: file.name,
      tamanhoBytes: file.size,
    })
  }
  return uploaded
}

async function insertAnexos(atividadeId: string, tenantId: string, anexos: UploadedAnexo[]) {
  for (const a of anexos) {
    await pool.query(
      `INSERT INTO atividade_lead_anexos (atividade_id, tenant_id, s3_key, url, tipo, nome_original, tamanho_bytes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [atividadeId, tenantId, a.s3Key, a.url, a.tipo, a.nomeOriginal, a.tamanhoBytes],
    )
  }
}

const ANEXOS_SUBQUERY = `
  COALESCE(
    (SELECT json_agg(json_build_object(
       'id', an.id, 'url', an.url, 'tipo', an.tipo,
       'nome_original', an.nome_original, 'tamanho_bytes', an.tamanho_bytes,
       'created_at', an.created_at
     ) ORDER BY an.created_at ASC)
     FROM atividade_lead_anexos an WHERE an.atividade_id = a.id),
    '[]'::json
  ) AS anexos
`

// LISTAR ATIVIDADES DE UM LEAD — mais recente primeiro, com anexos embutidos
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
             u.nome AS usuario_nome,
             ${ANEXOS_SUBQUERY}
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

// CRIAR ATIVIDADE — multipart/form-data (lead_uuid, tipo_atividade_id, descricao, arquivos[]?)
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
    const sugeridoPorIa = formData.get('sugerido_por_ia') === 'true'
    const files = formData.getAll('arquivos').filter((f): f is File => f instanceof File)

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

    let anexos: UploadedAnexo[] = []
    if (files.length > 0) {
      try {
        anexos = await uploadAnexos(files, lead.tenant_id, leadUuid)
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 })
      }
    }

    const insertQuery = `
      INSERT INTO atividades_lead (
        lead_uuid, tipo_atividade_id, descricao, coluna_id, usuario_id,
        tenant_id, client_id, sugerido_por_ia
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `
    const { rows } = await pool.query(insertQuery, [
      leadUuid, parseInt(tipoAtividadeId, 10), descricao, lead.coluna_id || null, currentUser.userId,
      lead.tenant_id, lead.client_id, sugeridoPorIa,
    ])
    const atividadeId = rows[0].id

    if (anexos.length > 0) await insertAnexos(atividadeId, lead.tenant_id, anexos)

    // G0 — registrar atividade muda de quem é a bola (ver docs/PLANO_PENDENCIA_ATENDIMENTO.md).
    // Qual direção depende de tipos_atividade.is_entrada, resolvido dentro do motor canônico.
    await touchPendency(leadUuid).catch((err) => {
      console.error('[crm/atividades] falha ao atualizar pendência de atendimento:', err)
    })

    const { rows: fullRows } = await pool.query(
      `SELECT a.*, t.nome AS tipo_nome, t.icone AS tipo_icone, t.cor AS tipo_cor,
              u.nome AS usuario_nome, ${ANEXOS_SUBQUERY}
         FROM atividades_lead a
         JOIN tipos_atividade t ON t.id = a.tipo_atividade_id
         LEFT JOIN users u ON u.id = a.usuario_id
        WHERE a.id = $1`,
      [atividadeId],
    )

    return NextResponse.json({ success: true, atividade: fullRows[0] })
  } catch (error: any) {
    console.error('POST /crm/atividades error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// EDITAR ATIVIDADE — descricao e/ou tipo; novos arquivos (multipart) são SEMPRE somados aos já
// existentes, nunca substituem — remover um anexo específico é feito por
// DELETE /api/crm/atividades/anexos?id=X.
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser?.tenantId && !currentUser?.is_system_role) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const isMaster = currentUser.is_system_role === true

    const contentType = request.headers.get('content-type') || ''
    let id: string, descricao: string | undefined, tipoAtividadeId: string | undefined, files: File[] = []

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      id = formData.get('id') as string
      descricao = (formData.get('descricao') as string | null)?.trim()
      tipoAtividadeId = (formData.get('tipo_atividade_id') as string | null) || undefined
      files = formData.getAll('arquivos').filter((f): f is File => f instanceof File)
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

    let anexos: UploadedAnexo[] = []
    if (files.length > 0) {
      try {
        anexos = await uploadAnexos(files, existing.tenant_id, existing.lead_uuid)
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 })
      }
    }

    const { rows } = await pool.query(
      `UPDATE atividades_lead
          SET descricao = COALESCE($1, descricao),
              tipo_atividade_id = COALESCE($2, tipo_atividade_id),
              updated_at = NOW()
        WHERE id = $3
        RETURNING *`,
      [
        descricao ?? null,
        tipoAtividadeId ? parseInt(tipoAtividadeId, 10) : null,
        id,
      ],
    )

    if (anexos.length > 0) await insertAnexos(id, existing.tenant_id, anexos)

    // G0 — trocar o TIPO da atividade pode inverter a direção (is_entrada), então a pendência
    // precisa ser recomputada também na edição, não só na criação.
    if (rows[0]?.lead_uuid) {
      await touchPendency(rows[0].lead_uuid).catch((err) => {
        console.error('[crm/atividades] falha ao atualizar pendência de atendimento:', err)
      })
    }

    const { rows: fullRows } = await pool.query(
      `SELECT a.*, t.nome AS tipo_nome, t.icone AS tipo_icone, t.cor AS tipo_cor,
              u.nome AS usuario_nome, ${ANEXOS_SUBQUERY}
         FROM atividades_lead a
         JOIN tipos_atividade t ON t.id = a.tipo_atividade_id
         LEFT JOIN users u ON u.id = a.usuario_id
        WHERE a.id = $1`,
      [id],
    )

    return NextResponse.json({ success: true, atividade: fullRows[0] })
  } catch (error: any) {
    console.error('PATCH /crm/atividades error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// EXCLUIR ATIVIDADE — soft delete (os anexos ficam junto, ocultos com a atividade — reversível)
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
