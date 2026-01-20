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
  mode?: 'active' | 'all'
}

/**
 * Componente reutilizável para seleção de estados
 * ...
 */
export default function EstadoSelect({
  value,
  onChange,
  placeholder = 'Selecione um estado',
  className = '',
  disabled = false,
  format = 'sigla-nome',
  showAllOption = true,
  allOptionLabel = 'Todos os estados',
  mode = 'active'
}: EstadoSelectProps) {
  const { estados } = useEstadosCidades(mode)

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
      {!showAllOption && placeholder && (
        <option value="">{placeholder}</option>
      )}
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








