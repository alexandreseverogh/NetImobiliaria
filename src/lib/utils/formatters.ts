/**
 * Funções de formatação e validação
 * Podem ser usadas tanto no cliente quanto no servidor
 */

// ========================================
// VALIDAÇÕES
// ========================================

export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '')
  
  if (cleanCPF.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false
  
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i)
  }
  let remainder = sum % 11
  let firstDigit = remainder < 2 ? 0 : 11 - remainder
  
  if (parseInt(cleanCPF.charAt(9)) !== firstDigit) return false
  
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i)
  }
  remainder = sum % 11
  let secondDigit = remainder < 2 ? 0 : 11 - remainder
  
  return parseInt(cleanCPF.charAt(10)) === secondDigit
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateTelefone(telefone: string): boolean {
  const cleanTelefone = telefone.replace(/\D/g, '')
  return cleanTelefone.length === 10 || cleanTelefone.length === 11
}

// ========================================
// FORMATAÇÕES
// ========================================

export function formatCPF(value: string): string {
  const cleanValue = value.replace(/\D/g, '')
  if (cleanValue.length <= 11) {
    return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  return cleanValue.substring(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function formatTelefone(value: string): string {
  const cleanValue = value.replace(/\D/g, '')
  if (cleanValue.length <= 10) {
    return cleanValue.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  } else {
    return cleanValue.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
}

export function formatCEP(value: string): string {
  const cleanValue = value.replace(/\D/g, '')
  return cleanValue.replace(/(\d{5})(\d{3})/, '$1-$2')
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}


