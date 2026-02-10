import sys

# Read the file
with open(r'c:\NetImobiliária\net-imobiliaria\src\components\public\MeuPerfilModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the handleVerImoveis function
old_function = '''  const handleVerImoveis = async () => {
    try {
      // Gerar token admin temporário
      const publicToken = localStorage.getItem('public-auth-token')
      const response = await fetch('/api/public/auth/generate-admin-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('Erro ao gerar token admin')
        alert('Erro ao acessar área de imóveis. Por favor, tente novamente.')
        return
      }

      const data = await response.json()
      
      // Salvar token admin e dados do usuário no localStorage
      localStorage.setItem('admin-auth-token', data.adminToken)
      localStorage.setItem('admin-user-data', JSON.stringify(data.userData))

      // Redirecionar para a página CRUD de imóveis com filtro de proprietário e sem sidebar
      const proprietarioUuid = userData?.uuid || userData?.id
      window.location.href = `/admin/imoveis?fromProprietario=true&proprietario_uuid=${proprietarioUuid}&noSidebar=true`
    } catch (error) {
      console.error('Erro ao verificar imóveis:', error)
      setLoading(false)
      alert('Erro ao acessar área de imóveis. Por favor, tente novamente.')
    }
  }'''

new_function = '''  const handleVerImoveis = async () => {
    try {
      setLoading(true)
      
      // Verificar se o proprietário tem imóveis cadastrados
      const proprietarioUuid = userData?.uuid || userData?.id
      const publicToken = localStorage.getItem('public-auth-token')
      
      const response = await fetch('/api/public/auth/meus-imoveis', {
        headers: {
          'Authorization': `Bearer ${publicToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao verificar imóveis')
      }

      const result = await response.json()
      
      setLoading(false)
      
      // Se não há imóveis, mostrar modal informativo
      if (!result.data || result.data.length === 0) {
        setShowNoImoveisModal(true)
        return
      }

      // Se há imóveis, redirecionar para o CRUD
      window.location.href = `/admin/imoveis?fromProprietario=true&proprietario_uuid=${proprietarioUuid}&noSidebar=true`
    } catch (error) {
      console.error('Erro ao verificar imóveis:', error)
      setLoading(false)
      alert('Erro ao acessar área de imóveis. Por favor, tente novamente.')
    }
  }'''

if old_function in content:
    content = content.replace(old_function, new_function)
    with open(r'c:\NetImobiliária\net-imobiliaria\src\components\public\MeuPerfilModal.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ Function replaced successfully!")
else:
    print("❌ Old function not found in file")
    print("Searching for partial match...")
    if "const handleVerImoveis" in content:
        print("✅ Function exists but content doesn't match exactly")
    else:
        print("❌ Function doesn't exist at all")
