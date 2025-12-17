async function testLogin() {
  const fetch = (await import('node-fetch')).default
  try {
    console.log('🔐 Testando login via API...')
    
    const response = await fetch('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    })
    
    console.log('📊 Status da resposta:', response.status)
    console.log('📊 Headers:', Object.fromEntries(response.headers.entries()))
    
    const data = await response.json()
    console.log('📊 Dados da resposta:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('✅ Login realizado com sucesso!')
    } else {
      console.log('❌ Falha no login:', data.error)
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar login:', error.message)
  }
}

testLogin()
