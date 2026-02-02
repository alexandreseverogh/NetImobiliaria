import { NextRequest } from 'next/server'

/**
 * Helper function to extract token from NextRequest (PUBLIC/LANDING PAGE routes)
 * Checks in order: Authorization header, public_auth_token cookie
 * 
 * This function is specifically for public-facing routes (landing page, corretor portal)
 * and should NOT read admin cookies to prevent session contamination.
 */
export function getPublicTokenFromRequest(request: NextRequest): string | null {
    // 1. Check Authorization header (Bearer token)
    const authHeader = request.headers.get('authorization') || ''
    if (authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7)
    }

    // 2. Check public_auth_token cookie (ONLY public cookie)
    const publicToken = request.cookies.get('public_auth_token')?.value
    if (publicToken) return publicToken

    return null
}
