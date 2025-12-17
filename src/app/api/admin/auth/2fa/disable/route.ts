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

    const userId = decoded.userId;

    // Desabilitar 2FA
    const result = await twoFactorAuthService.disable2FA(userId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Erro ao desabilitar 2FA:', error);
    
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}


