import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import twoFactorAuthService from '../../../../../../services/twoFactorAuthService';

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

    const body = await request.json();
    const { email } = body;

    // Validar dados de entrada
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    const userId = decoded.userId;

    // Habilitar 2FA
    const result = await twoFactorAuthService.enable2FA(userId, email);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          backupCodes: result.backupCodes
        }
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Erro ao habilitar 2FA:', error);
    
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}


