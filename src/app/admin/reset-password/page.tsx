'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheckIcon, LockClosedIcon, KeyIcon } from '@heroicons/react/24/outline'

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Verificar se existe um token (localStorage ou Cookie) - Suporte Dual
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
    };

    const token = localStorage.getItem('admin_auth_token') || 
                  localStorage.getItem('admin-auth-token') || 
                  getCookie('admin_auth_token') || 
                  getCookie('admin-auth-token');
    
    if (!token) {
      console.log('[RESET] Nenhum token identificado nas origens conhecidas. Redirecionando.');
      router.push('/admin/login');
    }
  }, [router]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/auth/reset-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${
            localStorage.getItem('admin_auth_token') || 
            localStorage.getItem('admin-auth-token') || 
            (typeof document !== 'undefined' ? (document.cookie.split('; ').find(row => row.startsWith('admin_auth_token='))?.split('=')[1] || document.cookie.split('; ').find(row => row.startsWith('admin-auth-token='))?.split('=')[1]) : '')
          }`
        },
        body: JSON.stringify({ newPassword }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Sincronizar novo token e dados limpando o estado de 'reset pendente'
        localStorage.setItem('admin_auth_token', data.token);
        localStorage.setItem('admin-auth-token', data.token);
        localStorage.setItem('admin-user-data', JSON.stringify({
          ...data.user,
          at: Date.now()
        }));
        
        setSuccess(true)
        setTimeout(() => {
          router.push('/admin')
        }, 2000)
      } else {
        setError(data.error || 'Erro ao redefinir senha.')
      }
    } catch (err) {
      setError('Erro de conexão com o servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-6 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-indigo-900/20 pointer-events-none" />
      
      <div className="w-full max-w-md relative animate-in fade-in zoom-in duration-700">
        <div className="backdrop-blur-3xl bg-white/[0.03] border border-white/10 rounded-[2.5rem] shadow-2xl p-10 overflow-hidden">
          
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="h-20 w-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40 mb-6 group hover:scale-110 transition-transform duration-500">
              <ShieldCheckIcon className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Segurança Master</h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">Protocolo de Troca Obrigatória</p>
          </div>

          {!success ? (
            <form onSubmit={handleReset} className="space-y-6">
              <div className="text-center bg-blue-900/20 border border-blue-500/30 p-4 rounded-2xl mb-8">
                <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest leading-relaxed">
                  Detector de Primeiro Acesso Ativado.<br/> 
                  Por favor, escolha uma senha definitiva para liberar seu acesso operacional.
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative group">
                  <KeyIcon className="h-5 w-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    type="password"
                    placeholder="NOVA SENHA"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white font-bold text-xs tracking-widest focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all placeholder:text-gray-700 uppercase"
                  />
                </div>

                <div className="relative group">
                  <LockClosedIcon className="h-5 w-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    type="password"
                    placeholder="CONFIRMAR NOVA SENHA"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white font-bold text-xs tracking-widest focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all placeholder:text-gray-700 uppercase"
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-[10px] font-black uppercase text-center tracking-widest animate-pulse">
                  {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 uppercase text-xs tracking-[0.3em] active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Efetivar Senha'}
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center py-10 text-center animate-in zoom-in duration-500 transform">
               <div className="h-16 w-16 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-500/30">
                 <CheckCircleIcon className="h-10 w-10 text-white" />
               </div>
               <h2 className="text-xl font-black text-white uppercase tracking-tighter">Credenciais Efetivadas</h2>
               <p className="text-gray-400 text-sm mt-2">Sincronizando seu ecossistema...</p>
            </div>
          )}

        </div>
        <p className="text-center text-gray-600 text-[9px] font-bold uppercase tracking-widest mt-8">
          SISTEMA PROTEGIDO POR NET IMOBILIÁRIA INTELLIGENCE &copy; 2026
        </p>
      </div>
    </div>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}
