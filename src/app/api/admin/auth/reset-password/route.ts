import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import bcrypt from 'bcryptjs';
import { getTokenFromRequest, verifyToken, generateAccessToken, JWTPayload } from '@/lib/auth/jwt';
import { logAuditEvent } from '@/lib/audit/auditLogger';

/**
 * API DE REDEFINIÇÃO DE SENHA OBRIGATÓRIA (PRIMEIRO ACESSO)
 */
export async function POST(request: NextRequest) {
  try {
    const { newPassword } = await request.json();
    
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 });
    }

    const token = getTokenFromRequest(request);
    const decoded = token ? await verifyToken(token) : null;
    
    if (!decoded) {
      return NextResponse.json({ error: 'Sessão expirada ou inválida' }, { status: 401 });
    }

    const userId = decoded.userId;

    // 1. Atualizar senha e limpar flag de reset obrigatório
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updateQuery = `
      UPDATE users 
      SET password = $1, require_password_change = false, updated_at = NOW() 
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [hashedPassword, userId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const updatedUser = result.rows[0];

    // 2. Gerar NOVO Token para encerrar o ciclo de redirecionamento
    // Convertemos o payload para garantir compatibilidade
    const newPayload: any = {
      ...decoded,
      require_password_change: false, // Flag limpa
      nome: updatedUser.nome,
      email: updatedUser.email,
      username: updatedUser.username
    };
    
    // Remover iat e exp para o gerador recalculá-los
    delete newPayload.iat;
    delete newPayload.exp;

    const newToken = await generateAccessToken(newPayload);

    await logAuditEvent({
      userId,
      action: 'FORCE_PASSWORD_RESET',
      resource: 'users',
      resourceId: userId,
      details: { message: 'Senha redefinida no primeiro acesso' },
      ipAddress: request.ip || 'unknown'
    });

    const response = NextResponse.json({ 
      success: true, 
      token: newToken,
      user: {
        id: updatedUser.id,
        nome: updatedUser.nome,
        username: updatedUser.username,
        email: updatedUser.email,
        require_password_change: false
      },
      message: 'Senha atualizada com sucesso! Acesso Master liberado.' 
    });

    // Atualizar o Cookie (Dual Support)
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 // 24h
    };

    response.cookies.set('admin_auth_token', newToken, cookieOptions);
    response.cookies.set('admin-auth-token', newToken, cookieOptions);

    return response;
    
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    return NextResponse.json({ error: 'Erro ao processar redefinição de senha' }, { status: 500 });
  }
}
