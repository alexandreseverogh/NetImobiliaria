'use client'

import AccessLogTab from '@/components/admin/master/AccessLogTab'

/**
 * "Administradores das Empresas" (feature id 79, categoria "Master Governance").
 * Escopo único e deliberado: visualizar os acessos de quem ADMINISTRA cada empresa
 * (tenant) — nunca usuários de outros papéis (corretor, atendente, etc.) nem o
 * próprio Master. Ver AccessLogTab para a lógica de captura/filtro.
 */
export default function AdministradoresDasEmpresasPage() {
  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <AccessLogTab />
      </div>
    </div>
  )
}
