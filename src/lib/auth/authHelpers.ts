/**
 * ============================================================
 * AUTH HELPERS - Funções auxiliares de autenticação
 * ============================================================
 * 
 * Funções utilitárias para extrair e validar tokens em rotas API
 * Garante retorno consistente de 401 para tokens inválidos
 * ============================================================
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenNode, JWTPayload } from '@/lib/auth/jwt-node'
import { getTokenFromRequest } from '@/lib/auth/jwt'

/**
 * Resultado da validação de autenticação
 */
export interface AuthResult {
    success: boolean
    payload?: JWTPayload
    response?: NextResponse // Resposta de erro 401 se falhar
}

/**
 * ============================================================
 * Verificar Autenticação e Retornar Payload ou Erro 401
 * ============================================================
 * 
 * Uso em rotas API:
 * ```typescript
 * const auth = await verifyAuthOrRespond(request)
 * if (!auth.success) return auth.response! // Retorna 401
 * 
 * const userId = auth.payload!.userId
 * // ... continuar com lógica da rota
 * ```
 */
export async function verifyAuthOrRespond(
    request: NextRequest
): Promise<AuthResult> {
    try {
        // 1. Extrair token
        const token = getTokenFromRequest(request)

        if (!token) {
            return {
                success: false,
                response: NextResponse.json(
                    {
                        error: 'Autenticação necessária',
                        code: 'AUTH_REQUIRED'
                    },
                    { status: 401 }
                )
            }
        }

        // 2. Verificar token
        const payload = verifyTokenNode(token)

        if (!payload) {
            return {
                success: false,
                response: NextResponse.json(
                    {
                        error: 'Token inválido ou expirado',
                        code: 'INVALID_TOKEN'
                    },
                    { status: 401 }
                )
            }
        }

        // 3. Sucesso
        return {
            success: true,
            payload
        }
    } catch (error) {
        console.error('❌ Erro ao verificar autenticação:', error)

        // Em caso de erro inesperado, retornar 401 (fail-safe)
        return {
            success: false,
            response: NextResponse.json(
                {
                    error: 'Erro ao verificar autenticação',
                    code: 'AUTH_ERROR'
                },
                { status: 401 }
            )
        }
    }
}

/**
 * ============================================================
 * Extrair User ID ou Retornar Null (Não Lança Erro)
 * ============================================================
 * 
 * Uso quando o token é opcional (ex: logs de auditoria)
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
    try {
        const token = getTokenFromRequest(request)
        if (!token) return null

        const payload = verifyTokenNode(token)
        return payload?.userId || null
    } catch (error) {
        console.error('❌ Erro ao extrair userId:', error)
        return null
    }
}
