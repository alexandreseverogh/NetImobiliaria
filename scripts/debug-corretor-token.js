/**
 * Script de diagnóstico para verificar o token do corretor
 * Execute no console do navegador quando o erro 401 ocorrer
 */

console.log('=== DIAGNÓSTICO DE TOKEN DO CORRETOR ===')

// Verificar localStorage
const token = localStorage.getItem('auth-token')
const userData = localStorage.getItem('user-data')

console.log('1. Token no localStorage:', token ? `Presente (${token.length} chars)` : 'AUSENTE ❌')
console.log('2. User data no localStorage:', userData ? 'Presente ✓' : 'AUSENTE ❌')

if (userData) {
    try {
        const parsed = JSON.parse(userData)
        console.log('3. Dados do usuário:', {
            id: parsed.id,
            nome: parsed.nome,
            email: parsed.email,
            role_name: parsed.role_name
        })
    } catch (e) {
        console.error('3. Erro ao parsear user-data:', e)
    }
}

// Verificar se o token é válido fazendo uma requisição de teste
if (token) {
    console.log('4. Testando token com /api/admin/auth/me...')
    fetch('/api/admin/auth/me', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(r => r.json())
        .then(data => {
            console.log('5. Resposta do /api/admin/auth/me:', data)
            if (data.success) {
                console.log('✅ Token é válido!')
            } else {
                console.log('❌ Token inválido ou expirado')
            }
        })
        .catch(err => {
            console.error('5. Erro ao testar token:', err)
        })
} else {
    console.log('4. ❌ Não há token para testar')
    console.log('\n💡 SOLUÇÃO: Faça login novamente em /corretor/entrar')
}

console.log('\n=== FIM DO DIAGNÓSTICO ===')
