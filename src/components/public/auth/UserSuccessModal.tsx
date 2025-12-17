'use client'

import { CheckCircle, X, User, Mail, Phone, MapPin, Building2 } from 'lucide-react'

interface UserSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  userData: {
    nome: string
    email: string
    telefone?: string
    userType: 'cliente' | 'proprietario'
    cpf?: string
    endereco?: string
    numero?: string
    bairro?: string
    cidade_fk?: string
    estado_fk?: string
  }
  redirectTo?: string
}

export default function UserSuccessModal({ 
  isOpen, 
  onClose, 
  userData,
  redirectTo 
}: UserSuccessModalProps) {
  const handleCadastrarImovel = () => {
    onClose()
    setTimeout(() => {
      // Ler finalidade escolhida do sessionStorage
      const finalidadeEscolhida = typeof window !== 'undefined' ? sessionStorage.getItem('finalidadeEscolhida') : null
      const url = finalidadeEscolhida 
        ? `/admin/imoveis/novo?noSidebar=true&finalidade=${finalidadeEscolhida}`
        : '/admin/imoveis/novo?noSidebar=true'
      window.location.href = url
    }, 100)
  }

  const handleFechar = () => {
    onClose()
    // Disparar evento para atualizar AuthButtons após fechar modal
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('public-auth-changed'))
    }
    
    // Redirecionar após fechar modal
    setTimeout(() => {
      // Se houver redirectTo específico (ex: para proprietários), usar ele
      if (redirectTo) {
        window.location.href = redirectTo
      } 
      // Se for cliente ou proprietário, abrir modal de perfil ao invés de redirecionar
      else if (userData.userType === 'cliente' || userData.userType === 'proprietario') {
        // Disparar evento para abrir modal de perfil
        window.dispatchEvent(new Event('open-meu-perfil-modal'))
      }
    }, 100)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-green-100 rounded-full">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Login realizado com sucesso!
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Bem-vindo(a), {userData.nome}
              </p>
            </div>
          </div>
          <button
            onClick={handleFechar}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Tipo de Usuário */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-blue-100">
              <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg ${
                userData.userType === 'cliente' ? 'bg-blue-100' : 'bg-green-100'
              }`}>
                <User className={`w-5 h-5 ${
                  userData.userType === 'cliente' ? 'text-blue-600' : 'text-green-600'
                }`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Tipo de Conta</p>
                <p className="text-lg font-semibold text-gray-900">
                  {userData.userType === 'cliente' ? 'Cliente' : 'Proprietário'}
                </p>
              </div>
            </div>

            {/* Dados do Usuário */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Seus Dados
              </h3>

              {/* Nome */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Nome</p>
                  <p className="text-sm font-medium text-gray-900 break-words">{userData.nome}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                  <p className="text-sm font-medium text-gray-900 break-words">{userData.email}</p>
                </div>
              </div>

              {/* Telefone */}
              {userData.telefone && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Telefone</p>
                    <p className="text-sm font-medium text-gray-900">{userData.telefone}</p>
                  </div>
                </div>
              )}

              {/* Endereço */}
              {(userData.endereco || userData.bairro) && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Endereço</p>
                    <p className="text-sm font-medium text-gray-900 break-words">
                      {userData.endereco && `${userData.endereco}`}
                      {userData.numero && `, ${userData.numero}`}
                      {userData.bairro && ` - ${userData.bairro}`}
                      {userData.cidade_fk && `, ${userData.cidade_fk}`}
                      {userData.estado_fk && ` - ${userData.estado_fk}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-end gap-3">
              {/* Botão Cadastrar Imóvel - apenas para proprietários */}
              {userData.userType === 'proprietario' && (
                <button
                  onClick={handleCadastrarImovel}
                  className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-medium rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  Cadastrar Imóvel
                </button>
              )}
              {/* Botão Fechar */}
              <button
                onClick={handleFechar}
                className="px-5 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-sm font-medium rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

