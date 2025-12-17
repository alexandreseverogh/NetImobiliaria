// Script para debug do token - execute no console do navegador

console.log('🔍 DEBUG DO TOKEN - Execute este script no console do navegador (F12)')

// Verificar se estamos no navegador
if (typeof window === 'undefined') {
  console.log('❌ Este script deve ser executado no console do navegador')
  console.log('📝 Instruções:')
  console.log('1. Abra o DevTools (F12)')
  console.log('2. Vá para a aba Console')
  console.log('3. Cole este script e pressione Enter')
} else {
  console.log('✅ Executando no navegador...')
  
  // Verificar token no localStorage
  const authToken = localStorage.getItem('auth-token')
  const accessToken = localStorage.getItem('accessToken')
  const userData = localStorage.getItem('user-data')
  
  console.log('🔑 auth-token:', authToken ? 'ENCONTRADO' : 'NÃO ENCONTRADO')
  console.log('🔑 accessToken:', accessToken ? 'ENCONTRADO' : 'NÃO ENCONTRADO')
  console.log('👤 user-data:', userData ? 'ENCONTRADO' : 'NÃO ENCONTRADO')
  
  if (authToken) {
    console.log('📏 Tamanho do auth-token:', authToken.length)
    
    // Tentar decodificar o JWT
    try {
      const parts = authToken.split('.')
      if (parts.length === 3) {
        const header = JSON.parse(atob(parts[0]))
        const payload = JSON.parse(atob(parts[1]))
        
        console.log('📋 Header JWT:', header)
        console.log('📋 Payload JWT:', payload)
        console.log('👤 Usuário:', payload.username)
        console.log('🆔 ID:', payload.userId)
        console.log('🔐 Permissões:', payload.permissoes)
        
        // Verificar se expirou
        const now = Math.floor(Date.now() / 1000)
        if (payload.exp && payload.exp < now) {
          console.log('⏰ Token EXPIRADO!')
        } else {
          console.log('✅ Token VÁLIDO')
        }
      }
    } catch (error) {
      console.log('❌ Erro ao decodificar token:', error.message)
    }
  }
  
  if (userData) {
    try {
      const user = JSON.parse(userData)
      console.log('👤 Dados do usuário:', user)
    } catch (error) {
      console.log('❌ Erro ao parsear user-data:', error.message)
    }
  }
  
  console.log('\n📝 PRÓXIMOS PASSOS:')
  if (!authToken) {
    console.log('1. Faça login novamente')
    console.log('2. Verifique se o token foi salvo')
  } else {
    console.log('1. Token encontrado - teste a funcionalidade')
    console.log('2. Se ainda der erro, verifique o console do servidor')
  }
}


