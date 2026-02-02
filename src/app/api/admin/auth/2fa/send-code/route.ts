import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import twoFactorAuthService from '../../../../../../services/twoFactorAuthService';

interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: number;
    username: string;
    email: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validar dados de entrada
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    // Obter informações da requisição
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Buscar usuário por email
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME!,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'Roberto@2007',
    });

    const userQuery = 'SELECT id, email, username FROM users WHERE email = $1';
    const userResult = await pool.query(userQuery, [email]);
    
    if (userResult.rows.length === 0) {
      await pool.end();
      return NextResponse.json(
        { success: false, message: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];
    await pool.end();

    // Verificar se 2FA está habilitado
    const is2FAEnabled = await twoFactorAuthService.is2FAEnabled(user.id);
    
    if (!is2FAEnabled) {
      return NextResponse.json(
        { success: false, message: '2FA não está habilitado para este usuário' },
        { status: 400 }
      );
    }

    // Enviar código 2FA
    const codeSent = await twoFactorAuthService.sendCodeByEmail(
      user.id, 
      user.email, 
      ipAddress, 
      userAgent
    );

    if (codeSent) {
      return NextResponse.json({
        success: true,
        message: 'Código de verificação enviado com sucesso'
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Erro ao enviar código de verificação' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Erro ao enviar código 2FA:', error);
    
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}


