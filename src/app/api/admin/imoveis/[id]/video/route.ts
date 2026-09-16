import { NextRequest, NextResponse } from 'next/server'
import { findImovelVideoMetadata, saveImovelVideo, deleteImovelVideoByImovel } from '@/lib/database/imovel-video'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { logAuditEvent } from '@/lib/database/audit'
import { requireApiPermission } from '@/lib/auth/apiPermissions'

// Rate limiting simples (em produção usar Redis ou similar)
const uploadLimits = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minuto
const RATE_LIMIT_MAX_UPLOADS = 5 // Máximo 5 uploads por minuto

// Função para extrair usuário logado
function getCurrentUser(request: NextRequest): string | null {
  try {
    const token = request.cookies.get('admin_auth_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) return null
    
    const decoded = verifyTokenNode(token)
    return decoded ? decoded.userId : null
  } catch (error) {
    console.error('❌ Erro ao extrair usuário:', error)
    return null
  }
}

// Função para verificar rate limiting
function checkRateLimit(userId: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now()
  const userLimit = uploadLimits.get(userId)
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset ou primeira vez
    uploadLimits.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { allowed: true }
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_UPLOADS) {
    return { allowed: false, resetTime: userLimit.resetTime }
  }
  
  // Incrementar contador
  userLimit.count++
  return { allowed: true }
}

// GET - Buscar metadados do vídeo do imóvel
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const currentUserId = getCurrentUser(request)
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      )
    }
    
    const imovelId = parseInt(params.id)
    
    if (isNaN(imovelId)) {
      return NextResponse.json(
        { error: 'ID do imóvel inválido' },
        { status: 400 }
      )
    }
    
    console.log('🔍 GET /api/admin/imoveis/[id]/video - Buscando metadados do vídeo para imóvel:', imovelId)
    
    const videoMetadata = await findImovelVideoMetadata(imovelId)
    
    if (!videoMetadata) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'Nenhum vídeo encontrado para este imóvel'
      })
    }
    
    return NextResponse.json({
      success: true,
      data: videoMetadata
    })
    
  } catch (error) {
    console.error('❌ Erro ao buscar vídeo do imóvel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Validações de vídeo conforme planejamento
const VIDEO_VALIDATIONS = {
  FORMATOS_ACEITOS: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  EXTENSOES_ACEITAS: ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'],
  TAMANHO_MAXIMO: 50 * 1024 * 1024, // 50MB
  TAMANHO_MINIMO: 1024, // 1KB
  DURACAO_MAXIMA: 66, // 60 segundos + 10% de tolerância
  HEADERS_VALIDOS: ['ftyp', 'moov', 'mdat', 'webm', 'ogg'], // Headers de vídeo válidos
}

// Função para validar vídeo
async function validateVideo(file: File): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = []
  
  // Validar se arquivo existe
  if (!file) {
    errors.push('Nenhum arquivo fornecido')
    return { isValid: false, errors }
  }
  
  // Validar nome do arquivo
  if (!file.name || file.name.trim().length === 0) {
    errors.push('Nome do arquivo inválido')
  }
  
  // Validar tamanho mínimo
  if (file.size < VIDEO_VALIDATIONS.TAMANHO_MINIMO) {
    errors.push(`Arquivo muito pequeno. Mínimo: ${VIDEO_VALIDATIONS.TAMANHO_MINIMO} bytes`)
  }
  
  // Validar tamanho máximo
  if (file.size > VIDEO_VALIDATIONS.TAMANHO_MAXIMO) {
    errors.push(`Arquivo muito grande. Máximo: ${VIDEO_VALIDATIONS.TAMANHO_MAXIMO / (1024 * 1024)}MB`)
  }
  
  // Validar tipo MIME
  if (!file.type || !VIDEO_VALIDATIONS.FORMATOS_ACEITOS.includes(file.type)) {
    errors.push(`Formato não suportado. Use: ${VIDEO_VALIDATIONS.FORMATOS_ACEITOS.join(', ')}`)
  }
  
  // Validar extensão
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
  if (!extension || !VIDEO_VALIDATIONS.EXTENSOES_ACEITAS.includes(extension)) {
    errors.push(`Extensão não suportada. Use: ${VIDEO_VALIDATIONS.EXTENSOES_ACEITAS.join(', ')}`)
  }
  
  // Validar nome do arquivo (evitar caracteres especiais)
  const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'))
  if (!fileNameWithoutExt || fileNameWithoutExt.length < 1) {
    errors.push('Nome do arquivo deve ter pelo menos 1 caractere')
  }
  
  // Validar headers do arquivo (básico)
  try {
    const arrayBuffer = await file.slice(0, 32).arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    const header = Array.from(uint8Array.slice(0, 8))
      .map(byte => String.fromCharCode(byte))
      .join('')
    
    const hasValidHeader = VIDEO_VALIDATIONS.HEADERS_VALIDOS.some(validHeader => 
      header.includes(validHeader)
    )
    
    if (!hasValidHeader) {
      errors.push('Arquivo não parece ser um vídeo válido')
    }
  } catch (headerError) {
    console.warn('⚠️ Erro ao validar headers do vídeo:', headerError)
    // Não bloquear por erro de header, apenas logar
  }
  
  // Validar duração estimada
  const estimatedDuration = estimateVideoDuration(file.size, file.type)
  if (estimatedDuration > VIDEO_VALIDATIONS.DURACAO_MAXIMA) {
    errors.push(`Vídeo muito longo. Máximo: ${VIDEO_VALIDATIONS.DURACAO_MAXIMA} segundos (estimado: ${estimatedDuration}s)`)
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Função para estimar duração do vídeo baseada no tamanho e tipo
function estimateVideoDuration(fileSize: number, mimeType: string): number {
  const bitrateEstimates: { [key: string]: number } = {
    'video/mp4': 2000000,    // 2 Mbps
    'video/webm': 1500000,   // 1.5 Mbps
    'video/ogg': 1200000,    // 1.2 Mbps
    'video/quicktime': 2500000, // 2.5 Mbps
    'video/avi': 3000000,    // 3 Mbps
    'video/mkv': 2500000,    // 2.5 Mbps
  }
  
  const bitrate = bitrateEstimates[mimeType] || 2000000 // Default: 2 Mbps
  const durationSeconds = (fileSize * 8) / bitrate // Converter bytes para bits
  
  return Math.round(durationSeconds)
}

// POST - Upload/substituir vídeo do imóvel
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissão de criação/edição server-side
    const denied = await requireApiPermission(request, 'imoveis', 'UPDATE')
    if (denied) return denied

    // Verificar autenticação
    const currentUserId = getCurrentUser(request)
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      )
    }
    
    const imovelId = parseInt(params.id)
    
    if (isNaN(imovelId)) {
      return NextResponse.json(
        { error: 'ID do imóvel inválido' },
        { status: 400 }
      )
    }
    
           console.log('🔍 POST /api/admin/imoveis/[id]/video - Upload de vídeo para imóvel:', imovelId)
           
           // Verificar rate limiting
           const rateLimitCheck = checkRateLimit(currentUserId)
           if (!rateLimitCheck.allowed) {
             const resetTime = new Date(rateLimitCheck.resetTime!).toLocaleString('pt-BR')
             return NextResponse.json(
               { error: `Limite de uploads excedido. Tente novamente após ${resetTime}` },
               { status: 429 }
             )
           }
           
           // Processar FormData
    const formData = await request.formData()
    const file = formData.get('video') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo de vídeo não fornecido' },
        { status: 400 }
      )
    }
    
    // Validar vídeo
    const validation = await validateVideo(file)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Vídeo inválido', details: validation.errors },
        { status: 400 }
      )
    }
    
    // Converter arquivo para Buffer
    const arrayBuffer = await file.arrayBuffer()
    const videoBuffer = Buffer.from(arrayBuffer)
    
    // Determinar formato e resolução (simulação)
    const formato = file.name.split('.').pop()?.toLowerCase() || 'mp4'
    const resolucao = '1920x1080' // Em produção, extrair do arquivo
    
    // Salvar vídeo
    const videoId = await saveImovelVideo(imovelId, {
      video: videoBuffer,
      nome_arquivo: file.name,
      tipo_mime: file.type,
      tamanho_bytes: file.size,
      duracao_segundos: 30, // Simulação - em produção usar ffprobe
      resolucao: resolucao,
      formato: formato
    })
    
           // Log de auditoria
           await logAuditEvent({
             userId: currentUserId,
             action: 'VIDEO_UPLOAD',
             resourceType: 'IMOVEL',
             resourceId: imovelId.toString(),
             details: {
               video_id: videoId,
               nome_arquivo: file.name,
               tamanho_bytes: file.size,
               tipo_mime: file.type,
               duracao_estimada: 30, // Simulação
               resolucao: '1920x1080', // Simulação
               formato: file.name.split('.').pop()?.toLowerCase() || 'mp4'
             },
             ipAddress: request.ip || 'unknown'
           })
           
           // Log de monitoramento
           console.log('📊 VIDEO_UPLOAD_METRICS:', {
             imovelId,
             userId: currentUserId,
             fileSize: file.size,
             fileType: file.type,
             fileName: file.name,
             timestamp: new Date().toISOString(),
             estimatedDuration: 30,
             rateLimitUsed: uploadLimits.get(currentUserId)?.count || 1
           })
    
    console.log('🔍 POST /api/admin/imoveis/[id]/video - Vídeo salvo com sucesso:', videoId)
    
    return NextResponse.json({
      success: true,
      data: { video_id: videoId },
      message: 'Vídeo enviado com sucesso'
    })
    
  } catch (error) {
    console.error('❌ Erro ao fazer upload do vídeo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Remover vídeo do imóvel
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissão de exclusão server-side
    const denied = await requireApiPermission(request, 'imoveis', 'DELETE')
    if (denied) return denied

    // Verificar autenticação
    const currentUserId = getCurrentUser(request)
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      )
    }

    const imovelId = parseInt(params.id)
    
    if (isNaN(imovelId)) {
      return NextResponse.json(
        { error: 'ID do imóvel inválido' },
        { status: 400 }
      )
    }
    
    console.log('🔍 DELETE /api/admin/imoveis/[id]/video - Removendo vídeo do imóvel:', imovelId)
    
    // Remover vídeo
    const deleted = await deleteImovelVideoByImovel(imovelId)
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Vídeo não encontrado' },
        { status: 404 }
      )
    }
    
    // Log de auditoria
    await logAuditEvent({
      userId: currentUserId,
      action: 'VIDEO_DELETE',
      resourceType: 'IMOVEL',
      resourceId: imovelId.toString(),
      details: { imovel_id: imovelId },
      ipAddress: request.ip || 'unknown'
    })
    
    console.log('🔍 DELETE /api/admin/imoveis/[id]/video - Vídeo removido com sucesso')
    
    return NextResponse.json({
      success: true,
      message: 'Vídeo removido com sucesso'
    })
    
  } catch (error) {
    console.error('❌ Erro ao remover vídeo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
