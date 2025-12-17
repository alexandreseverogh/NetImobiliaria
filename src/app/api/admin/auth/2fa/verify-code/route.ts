import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import twoFactorAuthService from '../../../../../../services/twoFactorAuthService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, code, method = 'email' } = body;

    // Validar dados de entrada
    if (!userId || !code) {
      return NextResponse.json(
        { success: false, message: 'UserId e código são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar código 2FA
    const userIdNumber = typeof userId === 'string' ? parseInt(userId, 10) : Number(userId);

    if (Number.isNaN(userIdNumber)) {
      return NextResponse.json(
        { success: false, message: 'UserId inválido' },
        { status: 400 }
      );
    }

    const validationResult = await twoFactorAuthService.validateCode(
      userIdNumber.toString(),
      code,
      method
    );

    if (validationResult.valid) {
      // Gerar token temporário para 2FA bem-sucedido
      const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
      const tempToken = jwt.sign(
        { 
          userId: userIdNumber.toString(), 
          twoFAVerified: true,
          method: method
        },
        jwtSecret,
        { expiresIn: '10m' } // Token temporário válido por 10 minutos
      );

      return NextResponse.json({
        success: true,
        message: 'Código verificado com sucesso',
        data: {
          tempToken,
          expiresIn: 600 // 10 minutos em segundos
        }
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: validationResult.message,
          remainingAttempts: validationResult.remainingAttempts
        },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('❌ Erro ao verificar código 2FA:', error);
    
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}


