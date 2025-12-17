// Script para testar se o token está sendo armazenado corretamente
console.log('🔍 Testando armazenamento de token...')

// Verificar se estamos no navegador
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('accessToken')
  console.log('🔑 Token encontrado:', token ? 'Sim' : 'Não')
  
  if (token) {
    console.log('📏 Tamanho do token:', token.length)
    console.log('🔍 Primeiros 20 caracteres:', token.substring(0, 20) + '...')
    
    // Tentar decodificar o JWT (sem verificar assinatura)
    try {
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]))
        console.log('👤 Usuário no token:', payload.username)
        console.log('🆔 ID do usuário:', payload.userId)
        console.log('🔐 Permissões:', payload.permissoes)
      }
    } catch (error) {
      console.log('❌ Erro ao decodificar token:', error.message)
    }
  }
} else {
  console.log('❌ Este script deve ser executado no navegador')
}


