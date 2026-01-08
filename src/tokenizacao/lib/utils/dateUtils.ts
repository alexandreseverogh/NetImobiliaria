/* eslint-disable */
import { TIMESTAMP_CONFIG } from '@/lib/config/constants'

/**
 * UtilitÃ¡rios para formataÃ§Ã£o e manipulaÃ§Ã£o de datas
 */

/**
 * Formata uma data para o padrÃ£o brasileiro (dd/MM/yyyy)
 */
export function formatDateBrazil(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return date.toLocaleDateString(TIMESTAMP_CONFIG.DATE_FORMATS.BRAZIL)
}

/**
 * Formata uma data para o padrÃ£o brasileiro com hora (dd/MM/yyyy HH:mm)
 */
export function formatDateTimeBrazil(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return date.toLocaleDateString(TIMESTAMP_CONFIG.DATE_FORMATS.BRAZIL, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Formata uma data para ISO string
 */
export function formatDateISO(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return date.toISOString()
}

/**
 * Retorna timestamp atual em ISO string
 */
export function getCurrentTimestamp(): string {
  return TIMESTAMP_CONFIG.JS.ISO_STRING()
}

/**
 * Retorna timestamp atual em milissegundos
 */
export function getCurrentTimestampMs(): number {
  return TIMESTAMP_CONFIG.JS.TIMESTAMP()
}

/**
 * Retorna objeto Date atual
 */
export function getCurrentDate(): Date {
  return TIMESTAMP_CONFIG.JS.DATE_OBJECT()
}

/**
 * Verifica se uma data Ã© vÃ¡lida
 */
export function isValidDate(dateString: string | Date): boolean {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return !isNaN(date.getTime())
}

/**
 * Adiciona dias a uma data
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Adiciona horas a uma data
 */
export function addHours(date: Date, hours: number): Date {
  const result = new Date(date)
  result.setHours(result.getHours() + hours)
  return result
}

/**
 * Calcula diferenÃ§a em dias entre duas datas
 */
export function daysDifference(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Retorna string SQL para timestamp atual
 */
export function getSQLCurrentTimestamp(): string {
  return TIMESTAMP_CONFIG.SQL.CURRENT_TIMESTAMP
}

/**
 * Retorna string SQL para NOW()
 */
export function getSQLNow(): string {
  return TIMESTAMP_CONFIG.SQL.NOW
}

/**
 * Formata data para exibiÃ§Ã£o relativa (ex: "hÃ¡ 2 dias")
 */
export function formatRelativeDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) {
    return 'Hoje'
  } else if (diffInDays === 1) {
    return 'Ontem'
  } else if (diffInDays < 7) {
    return `HÃ¡ ${diffInDays} dias`
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7)
    return `HÃ¡ ${weeks} semana${weeks > 1 ? 's' : ''}`
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30)
    return `HÃ¡ ${months} mÃªs${months > 1 ? 'es' : ''}`
  } else {
    const years = Math.floor(diffInDays / 365)
    return `HÃ¡ ${years} ano${years > 1 ? 's' : ''}`
  }
}

