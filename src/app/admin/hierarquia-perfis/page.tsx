'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlusIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ChevronRightIcon,
  TrophyIcon,
  SparklesIcon,
  LockClosedIcon,
  EyeIcon,
  Cog6ToothIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import CreatePerfilModal from '@/components/admin/CreatePerfilModal'
import EditPerfilModal from '@/components/admin/EditPerfilModal'

interface Role {
  id: number
  name: string
  description: string
  level: number
  is_active: boolean
  two_fa_required: boolean
  user_count: number
  user_names?: string[]
  is_system_role?: boolean
}

export default function HierarchyPage() {
  const router = useRouter()
  const { get } = useApi()
  const { user: loggedUser } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null)

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true)
      const response = await get('/api/admin/perfis')
      if (response.ok) {
        const data = await response.json()
        setRoles(data.perfis || [])
      }
    } catch (error) {
      console.error('Erro ao carregar perfis:', error)
    } finally {
      setLoading(false)
    }
  }, [get])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  // Agrupar roles por nível para a pirâmide
  const rolesByLevel = useMemo(() => {
    const sorted = [...roles].sort((a, b) => b.level - a.level)
    return sorted
  }, [roles])

  const maxLevel = useMemo(() => {
    return Math.max(...roles.map(r => r.level), 100)
  }, [roles])

  // Variantes de animação
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const cardVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1 }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-gray-500 font-medium animate-pulse">Construindo hierarquia...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* Header Premium */}
      <div className="relative overflow-hidden bg-white border-b border-gray-200 px-8 py-10 mb-8">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">
              <SparklesIcon className="w-4 h-4" />
              Governança Corporativa
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
              Pirâmide de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Autoridade</span>
            </h1>
            <p className="text-gray-500 max-w-2xl font-medium">
              Visualize e gerencie a estrutura de subordinação da sua empresa. 
              A autoridade flui do topo para a base, onde níveis superiores possuem controle total sobre os inferiores.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateModal(true)}
            className="group flex items-center gap-3 bg-gray-900 text-white px-6 py-4 rounded-2xl font-bold shadow-xl shadow-gray-900/10 hover:shadow-gray-900/20 transition-all"
          >
            <div className="bg-white/10 p-2 rounded-xl group-hover:bg-white/20 transition-colors">
              <PlusIcon className="w-5 h-5" />
            </div>
            Novo Perfil
          </motion.button>
        </div>
      </div>

      <div className="px-8 flex gap-12">
        {/* Régua de Autoridade Lateral */}
        <div className="hidden lg:flex flex-col items-center w-24 shrink-0 pt-4">
          <div className="sticky top-10 flex flex-col items-center">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-4">Nível</div>
            
            <div className="relative h-[600px] w-2 bg-amber-100 rounded-full shadow-inner">
              {/* Gradiente de Autoridade - Ouro Imperial Escuro */}
              <div className="absolute inset-0 bg-gradient-to-b from-amber-900 via-amber-600 to-amber-200 rounded-full"></div>
              
              {/* Marcadores Dinâmicos */}
              {(loggedUser?.is_system_role 
                ? [1000, 500, 100, 50, 1] 
                : [100, 75, 50, 25, 1].filter(l => l <= Math.max(100, loggedUser?.role_level || 0))
              ).map((lvl) => (
                <div 
                  key={lvl}
                  className="absolute left-1/2 -translate-x-1/2 flex items-center group"
                  style={{ top: `${100 - (lvl / (loggedUser?.is_system_role ? 1000 : 100) * 100)}%` }}
                >
                  {/* Traço da Régua */}
                  <div className="w-4 h-[1px] bg-gray-400 group-hover:bg-blue-600 transition-colors"></div>
                  
                  {/* Número da Escala */}
                  <div className="ml-2 text-[10px] font-black text-gray-400 group-hover:text-blue-600 transition-colors">
                    {lvl}
                  </div>
                </div>
              ))}
              
              {/* Indicador de Usuário Logado (VOCÊ) */}
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: -40 }}
                className="absolute left-0 flex flex-col items-end gap-1"
                style={{ top: `${100 - ((loggedUser?.role_level || 0) / (loggedUser?.is_system_role ? 1000 : 100) * 100)}%` }}
              >
                <div className="bg-amber-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg border border-amber-400">
                  VOCÊ
                </div>
                <div className="w-10 h-[2px] bg-amber-600 rounded-full"></div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Pirâmide de Cards */}
        <div className="flex-1 space-y-24 pt-4">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-5xl mx-auto space-y-6"
          >
            {rolesByLevel.map((role, index) => (
              <motion.div
                key={role.id}
                variants={cardVariants}
                className="relative group"
                onMouseEnter={() => setHoveredLevel(role.level)}
                onMouseLeave={() => setHoveredLevel(null)}
              >
                {/* Linha de Conexão (Vertical) */}
                {index < rolesByLevel.length - 1 && (
                  <div className="absolute left-[34px] top-full h-24 w-px bg-gradient-to-b from-blue-100 to-transparent"></div>
                )}

                {/* Card Glassmorphism */}
                <div className={`
                  relative overflow-hidden rounded-3xl p-6 transition-all duration-500
                  ${role.is_system_role 
                    ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white border-gray-700 shadow-2xl shadow-gray-900/20' 
                    : 'bg-white border border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-xl hover:shadow-blue-500/5'
                  }
                `}>
                  {/* Background Accents */}
                  <div className="absolute top-0 right-0 p-8 pointer-events-none opacity-5 group-hover:opacity-10 transition-opacity">
                    {role.is_system_role ? <TrophyIcon className="w-32 h-32" /> : <ShieldCheckIcon className="w-32 h-32" />}
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Nível Badge (Hexágono) */}
                    <div className="relative shrink-0 flex items-center justify-center w-16 h-16">
                      <div className={`absolute inset-0 rotate-45 rounded-xl ${role.is_system_role ? 'bg-blue-500' : 'bg-blue-50'}`}></div>
                      <span className={`relative text-xl font-black ${role.is_system_role ? 'text-white' : 'text-blue-600'}`}>
                        {role.level}
                      </span>
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold tracking-tight">{role.name}</h3>
                        {role.is_system_role && (
                          <span className="bg-blue-500/20 text-blue-300 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">
                            Master
                          </span>
                        )}
                        {!role.is_active && (
                          <span className="bg-red-500/20 text-red-500 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">
                            Inativo
                          </span>
                        )}
                      </div>
                      <p className={`text-sm font-medium ${role.is_system_role ? 'text-gray-400' : 'text-gray-500'}`}>
                        {role.description}
                      </p>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-center gap-8 px-6">
                      <div className="flex flex-col items-end min-w-[120px]">
                        <div className="flex -space-x-2 overflow-hidden mb-1">
                          {(role.user_names || []).slice(0, 3).map((name, i) => (
                            <div 
                              key={i}
                              className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600"
                              title={name}
                            >
                              {name.substring(0, 2).toUpperCase()}
                            </div>
                          ))}
                          {(role.user_count > 3) && (
                            <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                              +{role.user_count - 3}
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {role.user_count} Usuários
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            setSelectedRole(role)
                            setShowEditModal(true)
                          }}
                          className={`p-3 rounded-2xl transition-colors ${
                            role.is_system_role ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                          title="Configurações do Perfil"
                        >
                          <Cog6ToothIcon className="w-5 h-5" />
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.1, x: 5 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            setSelectedRole(role)
                            setShowEditModal(true)
                            // Nota: O modal de edição já abre na aba de permissões ou exibe o editor.
                          }}
                          className={`p-3 rounded-2xl transition-colors ${
                            role.is_system_role ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          }`}
                          title="Ver Permissões"
                        >
                          <ChevronRightIcon className="w-5 h-5 stroke-[3]" />
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progresso de Autoridade (Visual Only) */}
                  <div className="absolute bottom-0 left-0 h-1 bg-blue-500/20 w-full">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(role.level / maxLevel) * 100}%` }}
                      className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                    />
                  </div>
                </div>

                {/* Subtext de Contexto */}
                <div className="mt-4 px-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <LockClosedIcon className="w-3.5 h-3.5" />
                      {role.two_fa_required ? '2FA Obrigatório' : '2FA Opcional'}
                    </div>
                    <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                    <div className="flex items-center gap-1.5">
                      <CommandLineIcon className="w-3.5 h-3.5" />
                      ID: {role.id}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Estado Vazio */}
          {roles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center">
                <UserGroupIcon className="w-12 h-12 text-blue-200" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">Nenhum perfil definido</h3>
                <p className="text-gray-500 max-w-sm">
                  Comece criando a estrutura de cargos da sua empresa para definir os níveis de autoridade.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20"
              >
                Criar Primeiro Perfil
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      <CreatePerfilModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchRoles}
      />

      <EditPerfilModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedRole(null)
        }}
        onSuccess={fetchRoles}
        perfil={selectedRole ? {
          id: selectedRole.id,
          nome: selectedRole.name,
          descricao: selectedRole.description,
          nivel: selectedRole.level,
          is_system_role: selectedRole.is_system_role,
          user_count: selectedRole.user_count
        } : null}
      />
    </div>
  )
}

