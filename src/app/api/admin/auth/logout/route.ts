import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/database/connection';

// Função para registrar logs de logout
async function logLogoutAttempt(
  client: any,
  userId: string,
  username: string,
  ipAddress: string,
  userAgent: string,
  success: boolean = true,
  reason?: string,
  tenantId?: string | null
) {
  try {
    await client.query(`
      INSERT INTO login_logs (
        user_id,
        username,
        action,
        ip_address,
        user_agent,
        two_fa_used,
        success,
        failure_reason,
        tenant_id,
        created_at
      ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `, [
      userId,
      username,
      'logout',
      ipAddress,
      userAgent,
      false, // Logout não usa 2FA
      success,
      reason || null,
      tenantId || null
    ]);
  } catch (error) {
    console.error('Erro ao registrar log de logout:', error);
    // Não falhar o logout por causa do log
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar token de autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Token de autenticação necessário' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';

    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;
    const sessionId = decoded.sessionId;

    // Obter informações da requisição - mesma lógica robusta do login
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    const clientIp = request.headers.get('x-client-ip');

    let ipAddress = 'unknown';

    if (forwardedFor) {
      // X-Forwarded-For pode conter múltiplos IPs separados por vírgula
      ipAddress = forwardedFor.split(',')[0].trim();
    } else if (realIp) {
      ipAddress = realIp;
    } else if (cfConnectingIp) {
      ipAddress = cfConnectingIp;
    } else if (clientIp) {
      ipAddress = clientIp;
    } else {
      // Fallback para IP de conexão direta
      ipAddress = request.ip || 'unknown';
    }

    // Se for IP local, tentar obter IP real do ambiente (MESMA LÓGICA DO LOGIN)
    if (ipAddress === '::1' || ipAddress === '127.0.0.1' || ipAddress === 'localhost') {
      // Em desenvolvimento, usar IP da máquina local
      ipAddress = process.env.LOCAL_IP || '192.168.1.100';
    }

    console.log('🔍 DEBUG IP LOGOUT - Headers capturados:', {
      'x-forwarded-for': forwardedFor,
      'x-real-ip': realIp,
      'cf-connecting-ip': cfConnectingIp,
      'x-client-ip': clientIp,
      'request.ip': request.ip,
      'ip_final': ipAddress,
      'is_local': ipAddress === '::1' || ipAddress === '127.0.0.1',
      'username': decoded.username
    });

    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Invalidar sessão específica (usando o campo correto do banco)
    if (sessionId) {
      await pool.query(
        'UPDATE user_sessions SET expires_at = NOW() WHERE id = $1::uuid AND user_id = $2::uuid',
        [sessionId, userId]
      );
    }

    // Invalidar todas as sessões do usuário (logout de todos os dispositivos)
    // Opcional: descomente a linha abaixo para logout global
    // await pool.query('UPDATE user_sessions SET expires_at = NOW() WHERE user_id = $1::uuid', [userId]);

    // Log logout bem-sucedido
    const client = await pool.connect();
    try {
      await logLogoutAttempt(client, userId, decoded.username, ipAddress, userAgent, true, undefined, decoded.tenantId);
    } finally {
      client.release();
    }

    // Limpar códigos 2FA pendentes do usuário
    await pool.query(
      'UPDATE user_2fa_codes SET used = true WHERE user_id = $1::uuid AND used = false',
      [userId]
    );

    // Log de auditoria (Corrigido para bater com as colunas da tabela audit_logs)
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent, tenant_id)
       VALUES ($1::uuid, 'LOGOUT', 'AUTH', null, $2, $3, $4, $5)`,
      [userId, JSON.stringify({ username: decoded.username || 'unknown' }), ipAddress, userAgent, decoded.tenantId || null]
    );

    // Não fechamos o pool aqui para manter as conexões disponíveis para outros usuários.

    const response = NextResponse.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });

    // 🗑️ LIMPEZA DE COOKIES: Garantir que o token "zumbi" seja removido do navegador
    response.cookies.delete('admin_auth_token')  // New admin-specific cookie
    response.cookies.delete('auth_token')  // Legacy cookie (backward compatibility)
    response.cookies.delete('accessToken')
    response.cookies.delete('adminAccessToken') // Caso exista variante
    response.cookies.delete('refreshToken')

    console.log('✅ Cookies removidos: admin_auth_token, auth_token, accessToken, adminAccessToken, refreshToken')

    return response;

  } catch (error) {
    console.error('❌ Erro no logout:', error);

    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}