import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import bcrypt from 'bcryptjs';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

/**
 * MASTER SECURITY API
 * 
 * Permite que o administrador MASTER altere sua própria senha e status 2FA.
 */

export async function POST(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  // Governança: Apenas MASTER ADMINS podem operar aqui
  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const client = await pool.connect();
  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied

    const { two_fa_enabled, new_password } = await request.json();

    // 1. Se houver tentativa de mudar senha, processar hash
    if (new_password && new_password.trim() !== '') {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(new_password, salt);

      console.log('💾 [MASTER SECURITY] Gravando nova senha para Admin ID:', decoded.userId);

      // Atualizar Senha e 2FA
      await client.query(
        'UPDATE public.users SET password = $1, two_fa_enabled = $2, updated_at = NOW() WHERE id = $3',
        [hashedPassword, two_fa_enabled, decoded.userId]
      );
    } else {
      // Atualizar apenas o 2FA
      await client.query(
        'UPDATE public.users SET two_fa_enabled = $1, updated_at = NOW() WHERE id = $2',
        [two_fa_enabled, decoded.userId]
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Segurança Master atualizada com sucesso' 
    });

  } catch (error: any) {
    console.error('Master Security Error:', error);
    return NextResponse.json({ error: 'Falha ao gravar segurança: ' + error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
