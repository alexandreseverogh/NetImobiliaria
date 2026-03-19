'use client'

/**
 * TenhoInteresseButton
 *
 * Componente reutilizável que encapsula toda a lógica do fluxo "Tenho Interesse".
 *
 * Fluxo idêntico ao da landpaging:
 *  1. Verifica se há usuário ativo com tipo diferente de "cliente" → toast de aviso
 *  2. Verifica se já está logado como cliente → abre TenhoInteresseFormModal diretamente
 *  3. Se NÃO logado:
 *     a. Grava imovelId/imovelTitulo no sessionStorage
 *     b. Dispara evento global "open-auth-modal" → AuthButtons (Header) abre o AuthModal
 *     c. Após login bem-sucedido, o evento "public-auth-changed" aciona a abertura do form
 *
 * Props:
 *   imovelId      – ID do imóvel (obrigatório)
 *   imovelTitulo  – título para exibir no modal (opcional)
 *   onSuccess     – callback após registro bem-sucedido (opcional)
 *   className     – classes CSS adicionais para o botão (opcional)
 *   label         – texto do botão (opcional, default: "Tenho Interesse")
 */

import { useState, useEffect, useCallback } from 'react'
import { Heart } from 'lucide-react'
import TenhoInteresseFormModal from './TenhoInteresseFormModal'

interface TenhoInteresseButtonProps {
  imovelId: number
  imovelTitulo?: string
  onSuccess?: () => void
  className?: string
  label?: string
}

export default function TenhoInteresseButton({
  imovelId,
  imovelTitulo,
  onSuccess,
  className,
  label = 'Tenho Interesse',
}: TenhoInteresseButtonProps) {
  const [formOpen, setFormOpen] = useState(false)

  // ── Helpers de autenticação ────────────────────────────────────────────────
  const getLastUserType = (): string | null => {
    try {
      const raw = localStorage.getItem('public-last-auth-user')
      return raw ? JSON.parse(raw)?.userType ?? null : null
    } catch {
      return null
    }
  }

  const getLoggedCliente = (): boolean => {
    try {
      const token = localStorage.getItem('public-auth-token')
      const raw = localStorage.getItem('public-user-data')
      if (!token || !raw) return false
      const user = JSON.parse(raw)
      return user.userType === 'cliente' && !!user.uuid
    } catch {
      return false
    }
  }

  // ── Handler principal ──────────────────────────────────────────────────────
  const handleClick = useCallback(() => {
    // Regra 1: usuário ativo de outro tipo → toast de aviso e encerra
    const lastType = getLastUserType()
    if (lastType && lastType !== 'cliente') {
      try {
        window.dispatchEvent(
          new CustomEvent('ui-toast', {
            detail: {
              type: 'warning',
              position: 'center',
              message:
                'Apenas clientes logados podem registrar interesse. Acesse os botões Criar Conta ou Entrar no menu superior.',
            },
          })
        )
      } catch {}
      return
    }

    // Regra 2: cliente já logado → abrir formulário direto
    if (getLoggedCliente()) {
      setFormOpen(true)
      return
    }

    // Regra 3: não logado → salvar dados pendentes e abrir modal de auth via Header
    try {
      sessionStorage.setItem('pendingImovelId', imovelId.toString())
      if (imovelTitulo) sessionStorage.setItem('pendingImovelTitulo', imovelTitulo)
    } catch {}

    // Dispara evento capturado pelo AuthButtons (Header) — abre AuthModal de cliente
    window.dispatchEvent(
      new CustomEvent('open-auth-modal', {
        detail: { mode: 'register', userType: 'cliente', imovelId },
      })
    )
  }, [imovelId, imovelTitulo])

  // ── Retomar fluxo de interesse ao montar (cobre o caso de auto-login já feito) ──
  useEffect(() => {
    // Verificar imediatamente se há interesse pendente E usuário já logado
    // Isso cobre o caso em que public-auth-changed já foi disparado antes de montar
    const stored = sessionStorage.getItem('pendingImovelId')
    if (stored && parseInt(stored, 10) === imovelId && getLoggedCliente()) {
      const lastType = getLastUserType()
      if (!lastType || lastType === 'cliente') {
        sessionStorage.removeItem('pendingImovelId')
        sessionStorage.removeItem('pendingImovelTitulo')
        setFormOpen(true)
      }
    }
  }, []) // só no mount

  // ── Escutar login bem-sucedido para retomar o fluxo de interesse ───────────
  useEffect(() => {
    const handleAuthChanged = () => {
      try {
        const stored = sessionStorage.getItem('pendingImovelId')
        if (!stored || parseInt(stored, 10) !== imovelId) return

        const lastType = getLastUserType()
        if (lastType && lastType !== 'cliente') return
        if (!getLoggedCliente()) return

        sessionStorage.removeItem('pendingImovelId')
        sessionStorage.removeItem('pendingImovelTitulo')
        setFormOpen(true)
      } catch {}
    }

    window.addEventListener('public-auth-changed', handleAuthChanged)
    return () => window.removeEventListener('public-auth-changed', handleAuthChanged)
  }, [imovelId])

  return (
    <>
      <button
        onClick={handleClick}
        type="button"
        className={`inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-300 active:scale-95 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:from-emerald-600 hover:to-teal-600 hover:shadow-emerald-500/30 hover:shadow-xl hover:scale-105 ${className ?? 'px-6 py-3 text-base'}`}
      >
        <Heart className="w-5 h-5" />
        {label}
      </button>

      {/* Formulário real — só abre para cliente já autenticado */}
      <TenhoInteresseFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        imovelId={imovelId}
        imovelTitulo={imovelTitulo}
        onSuccess={() => {
          setFormOpen(false)
          if (onSuccess) onSuccess()
        }}
      />
    </>
  )
}
