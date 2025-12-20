'use client'

import { useMemo } from 'react'
import { useEstadosCidades } from '@/hooks/useEstadosCidades'

interface EstadoSelectProps {
  value: string
  onChange: (estadoId: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  format?: 'sigla-nome' | 'nome-sigla' | 'nome-only'
  showAllOption?: boolean
  allOptionLabel?: string
}

/**
 * Componente reutilizável para seleção de estados
 * 
 * Características:
 * - Ordenação alfabética automática (pt-BR)
 * - IDs baseados em índice (compatível com sistema existente)
 * - Formatação padronizada
 * - Zero risco de quebrar funcionalidade existente
 * 
 * @example
 * <EstadoSelect
 *   value={selectedEstadoId}
 *   onChange={setSelectedEstadoId}
 *   placeholder="Selecione um estado"
 *   format="sigla-nome"
 * />
 */
export default function EstadoSelect({
  value,
  onChange,
  placeholder = 'Selecione um estado',
  className = '',
  disabled = false,
  format = 'sigla-nome',
  showAllOption = true,
  allOptionLabel = 'Todos os estados'
}: EstadoSelectProps) {
  const { estados } = useEstadosCidades()

  // Ordenar estados alfabeticamente (sem modificar array original)
  const estadosOrdenados = useMemo(() => {
    return [...estados].sort((a, b) => 
      a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
    )
  }, [estados])

  // Formatar opção de estado baseado no formato escolhido
  const formatEstado = (estado: { sigla: string; nome: string }) => {
    switch (format) {
      case 'sigla-nome':
        return `${estado.sigla} - ${estado.nome}`
      case 'nome-sigla':
        return `${estado.nome} (${estado.sigla})`
      case 'nome-only':
        return estado.nome
      default:
        return `${estado.sigla} - ${estado.nome}`
    }
  }

  const defaultClassName = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed'

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={className || defaultClassName}
    >
      {showAllOption && (
        <option value="">{allOptionLabel}</option>
      )}
      {estadosOrdenados.map((estado) => (
        <option key={estado.id} value={estado.id}>
          {formatEstado(estado)}
        </option>
      ))}
    </select>
  )
}








