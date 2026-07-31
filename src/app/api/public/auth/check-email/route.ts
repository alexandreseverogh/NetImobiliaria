import { NextRequest, NextResponse } from 'next/server'
import { checkEmailExists } from '@/lib/database/clientes'
import { checkEmailExists as checkEmailExistsProprietario } from '@/lib/database/proprietarios'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const userType = searchParams.get('userType') as 'cliente' | 'proprietario' | null
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar token para obter UUID do usuário atual
    const authHeader = request.headers.get('authorization')
    let excludeUuid: string | undefined = undefined
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const jwt = require('jsonwebtoken')
        const jwtSecret = process.env.JWT_SECRET || 'fallback-secret'
        const decoded = jwt.verify(token, jwtSecret) as any
        if (decoded && decoded.userUuid) {
          excludeUuid = decoded.userUuid
        }
      } catch (error) {
        // Token inválido, continuar sem excludeUuid
      }
    }
    
    console.log('🔍 Verificando Email público:', email, 'userType:', userType, 'excludeUuid:', excludeUuid)
    
    let exists = false
    
    if (userType === 'proprietario') {
      exists = await checkEmailExistsProprietario(email, null, excludeUuid)
    } else {
      // Verificar em ambas as tabelas para garantir unicidade
      const existsCliente = await checkEmailExists(email, null, excludeUuid)
      const existsProprietario = await checkEmailExistsProprietario(email, null, excludeUuid)
      exists = existsCliente || existsProprietario
    }
    
    console.log('✅ Resultado da verificação de Email:', exists)
    
    return NextResponse.json({ exists })
  } catch (error) {
    console.error('❌ Erro ao verificar Email:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}









