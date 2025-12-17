import { useState, useCallback } from 'react'

interface TwoFactorValidationOptions {
  action: string
  description?: string
  isRequired?: boolean
}

interface UseTwoFactorValidationReturn {
  isTwoFactorModalOpen: boolean
  twoFactorAction: string
  twoFactorDescription: string
  isTwoFactorRequired: boolean
  showTwoFactorModal: (options: TwoFactorValidationOptions) => Promise<string | null>
  hideTwoFactorModal: () => void
}

export function useTwoFactorValidation(): UseTwoFactorValidationReturn {
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false)
  const [twoFactorAction, setTwoFactorAction] = useState('')
  const [twoFactorDescription, setTwoFactorDescription] = useState('')
  const [isTwoFactorRequired, setIsTwoFactorRequired] = useState(false)
  const [resolvePromise, setResolvePromise] = useState<((value: string | null) => void) | null>(null)

  const showTwoFactorModal = useCallback((options: TwoFactorValidationOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      setTwoFactorAction(options.action)
      setTwoFactorDescription(options.description || '')
      setIsTwoFactorRequired(options.isRequired || false)
      setResolvePromise(() => resolve)
      setIsTwoFactorModalOpen(true)
    })
  }, [])

  const hideTwoFactorModal = useCallback(() => {
    setIsTwoFactorModalOpen(false)
    if (resolvePromise) {
      resolvePromise(null)
      setResolvePromise(null)
    }
  }, [resolvePromise])

  const handleTwoFactorSuccess = useCallback((code: string) => {
    setIsTwoFactorModalOpen(false)
    if (resolvePromise) {
      resolvePromise(code)
      setResolvePromise(null)
    }
  }, [resolvePromise])

  // Expor a função de sucesso para uso no modal
  ;(window as any).handleTwoFactorSuccess = handleTwoFactorSuccess

  return {
    isTwoFactorModalOpen,
    twoFactorAction,
    twoFactorDescription,
    isTwoFactorRequired,
    showTwoFactorModal,
    hideTwoFactorModal
  }
}

/**
 * @deprecated ESTA FUNÇÃO ESTÁ DEPRECATED!
 * MOTIVO: 2FA agora vem do banco de dados (permissions.requires_2fa)
 * 
 * Use o campo `permission.requires_2fa` diretamente do banco
 * Esta função foi mantida apenas para fallback de compatibilidade
 */
export function requiresTwoFactor(action: string, feature: string, userRole?: string): boolean {
  console.warn('⚠️ requiresTwoFactor() está DEPRECATED! Use permission.requires_2fa do banco')
  
  // Fallback: retornar false (2FA deve vir do banco agora)
  return false
}

// Função auxiliar para obter descrição da ação
export function getActionDescription(action: string, feature: string, roleName: string): string {
  const actionMap: Record<string, string> = {
    'create': 'Criar',
    'read': 'Visualizar',
    'update': 'Atualizar',
    'delete': 'Excluir',
    'execute': 'Executar',
    'list': 'Listar'
  }

  const featureMap: Record<string, string> = {
    'usuarios': 'usuários',
    'imoveis': 'imóveis',
    'sistema': 'sistema',
    'roles': 'perfis',
    'relatorios': 'relatórios'
  }

  const actionText = actionMap[action.toLowerCase()] || action
  const featureText = featureMap[feature.toLowerCase()] || feature

  return `${actionText} ${featureText} para o perfil ${roleName}`
}
