/* eslint-disable */
// @ts-nocheck
// Sistema de validaÃ§Ã£o robusto e centralizado
// Elimina hardcoding e centraliza todas as regras de validaÃ§Ã£o

import { APP_CONFIG, SECURITY_CONFIG } from '@/lib/config/constants'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

export interface ValidationRule<T = any> {
  field: string
  value: T
  rules: ValidationRuleConfig[]
}

export interface ValidationRuleConfig {
  type: 'required' | 'minLength' | 'maxLength' | 'email' | 'password' | 'number' | 'range' | 'custom'
  message: string
  params?: any
  customValidator?: (value: any) => boolean
}

class ValidationEngine {
  private rules: Map<string, ValidationRuleConfig[]> = new Map()

  /**
   * Adiciona regras de validaÃ§Ã£o para um campo
   */
  addRules(field: string, rules: ValidationRuleConfig[]): void {
    this.rules.set(field, rules)
  }

  /**
   * Valida um campo especÃ­fico
   */
  validateField(field: string, value: any): ValidationResult {
    const fieldRules = this.rules.get(field) || []
    const errors: string[] = []
    const warnings: string[] = []

    for (const rule of fieldRules) {
      const isValid = this.validateRule(value, rule)
      if (!isValid) {
        errors.push(rule.message)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Valida mÃºltiplos campos
   */
  validateFields(fields: Record<string, any>): ValidationResult {
    const allErrors: string[] = []
    const allWarnings: string[] = []

    for (const [field, value] of Object.entries(fields)) {
      const result = this.validateField(field, value)
      allErrors.push(...result.errors)
      if (result.warnings) {
        allWarnings.push(...result.warnings)
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    }
  }

  /**
   * Valida uma regra especÃ­fica
   */
  private validateRule(value: any, rule: ValidationRuleConfig): boolean {
    switch (rule.type) {
      case 'required':
        return this.validateRequired(value)
      case 'minLength':
        return this.validateMinLength(value, rule.params)
      case 'maxLength':
        return this.validateMaxLength(value, rule.params)
      case 'email':
        return this.validateEmail(value)
      case 'password':
        return this.validatePassword(value)
      case 'number':
        return this.validateNumber(value)
      case 'range':
        return this.validateRange(value, rule.params)
      case 'custom':
        return rule.customValidator ? rule.customValidator(value) : true
      default:
        return true
    }
  }

  private validateRequired(value: any): boolean {
    if (value === null || value === undefined) return false
    if (typeof value === 'string') return value.trim().length > 0
    if (Array.isArray(value)) return value.length > 0
    return true
  }

  private validateMinLength(value: any, minLength: number): boolean {
    if (typeof value !== 'string') return true
    return value.length >= minLength
  }

  private validateMaxLength(value: any, maxLength: number): boolean {
    if (typeof value !== 'string') return true
    return value.length <= maxLength
  }

  private validateEmail(value: any): boolean {
    if (typeof value !== 'string') return false
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }

  private validatePassword(value: any): boolean {
    if (typeof value !== 'string') return false

    const config = SECURITY_CONFIG
    let isValid = true

    if (value.length < config.PASSWORD.MIN_LENGTH) return false
    if (config.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(value)) return false
    if (config.PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(value)) return false
    if (config.PASSWORD.REQUIRE_NUMBERS && !/\d/.test(value)) return false
    if (config.PASSWORD.REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) return false

    return isValid
  }

  private validateNumber(value: any): boolean {
    return !isNaN(Number(value)) && isFinite(Number(value))
  }

  private validateRange(value: any, range: { min: number; max: number }): boolean {
    const numValue = Number(value)
    return numValue >= range.min && numValue <= range.max
  }
}

// InstÃ¢ncia global do validador
export const validator = new ValidationEngine()

// ConfiguraÃ§Ãµes de validaÃ§Ã£o para diferentes entidades
export const validationSchemas = {
  // ValidaÃ§Ã£o para usuÃ¡rios
  user: {
    username: [
      { type: 'required', message: 'Nome de usuÃ¡rio Ã© obrigatÃ³rio' },
      { type: 'minLength', message: 'Nome de usuÃ¡rio deve ter pelo menos 3 caracteres', params: 3 },
      { type: 'maxLength', message: 'Nome de usuÃ¡rio deve ter no mÃ¡ximo 50 caracteres', params: 50 }
    ],
    email: [
      { type: 'required', message: 'Email Ã© obrigatÃ³rio' },
      { type: 'email', message: 'Email deve ter um formato vÃ¡lido' }
    ],
    password: [
      { type: 'required', message: 'Senha Ã© obrigatÃ³ria' },
      { type: 'password', message: 'Senha deve atender aos critÃ©rios de seguranÃ§a' }
    ],
    nome: [
      { type: 'required', message: 'Nome Ã© obrigatÃ³rio' },
      { type: 'minLength', message: 'Nome deve ter pelo menos 2 caracteres', params: 2 },
      { type: 'maxLength', message: 'Nome deve ter no mÃ¡ximo 100 caracteres', params: 100 }
    ],
    telefone: [
      { type: 'required', message: 'Telefone Ã© obrigatÃ³rio' },
      { type: 'minLength', message: 'Telefone deve ter pelo menos 10 caracteres', params: 10 }
    ]
  },

  // ValidaÃ§Ã£o para imÃ³veis
  imovel: {
    titulo: [
      { type: 'required', message: 'TÃ­tulo Ã© obrigatÃ³rio' },
      { type: 'minLength', message: 'TÃ­tulo deve ter pelo menos 5 caracteres', params: 5 },
      { type: 'maxLength', message: 'TÃ­tulo deve ter no mÃ¡ximo 200 caracteres', params: 200 }
    ],
    descricao: [
      { type: 'required', message: 'DescriÃ§Ã£o Ã© obrigatÃ³ria' },
      { type: 'minLength', message: 'DescriÃ§Ã£o deve ter pelo menos 10 caracteres', params: 10 },
      { type: 'maxLength', message: 'DescriÃ§Ã£o deve ter no mÃ¡ximo 2000 caracteres', params: 2000 }
    ],
    preco: [
      { type: 'required', message: 'PreÃ§o Ã© obrigatÃ³rio' },
      { type: 'number', message: 'PreÃ§o deve ser um nÃºmero vÃ¡lido' },
      { type: 'range', message: 'PreÃ§o deve estar entre 0 e 999.999.999', params: { min: 0, max: 999999999 } }
    ],
    areaTotal: [
      { type: 'required', message: 'Ãrea total Ã© obrigatÃ³ria' },
      { type: 'number', message: 'Ãrea total deve ser um nÃºmero vÃ¡lido' },
      { type: 'range', message: 'Ãrea total deve estar entre 0 e 999.999', params: { min: 0, max: 99999 } }
    ],
    quartos: [
      { type: 'required', message: 'NÃºmero de quartos Ã© obrigatÃ³rio' },
      { type: 'number', message: 'NÃºmero de quartos deve ser um nÃºmero vÃ¡lido' },
      { type: 'range', message: 'NÃºmero de quartos deve estar entre 0 e 20', params: { min: 0, max: 20 } }
    ],
    banheiros: [
      { type: 'required', message: 'NÃºmero de banheiros Ã© obrigatÃ³rio' },
      { type: 'number', message: 'NÃºmero de banheiros deve ser um nÃºmero vÃ¡lido' },
      { type: 'range', message: 'NÃºmero de banheiros deve estar entre 0 e 20', params: { min: 0, max: 20 } }
    ],
    vagasGaragem: [
      { type: 'required', message: 'NÃºmero de vagas de garagem Ã© obrigatÃ³rio' },
      { type: 'number', message: 'NÃºmero de vagas de garagem deve ser um nÃºmero vÃ¡lido' },
      { type: 'range', message: 'NÃºmero de vagas de garagem deve estar entre 0 e 20', params: { min: 0, max: 20 } }
    ]
  },

  // ValidaÃ§Ã£o para endereÃ§os
  endereco: {
    logradouro: [
      { type: 'required', message: 'Logradouro Ã© obrigatÃ³rio' },
      { type: 'minLength', message: 'Logradouro deve ter pelo menos 3 caracteres', params: 3 },
      { type: 'maxLength', message: 'Logradouro deve ter no mÃ¡ximo 200 caracteres', params: 200 }
    ],
    numero: [
      { type: 'required', message: 'NÃºmero Ã© obrigatÃ³rio' },
      { type: 'minLength', message: 'NÃºmero deve ter pelo menos 1 caractere', params: 1 },
      { type: 'maxLength', message: 'NÃºmero deve ter no mÃ¡ximo 20 caracteres', params: 20 }
    ],
    bairro: [
      { type: 'required', message: 'Bairro Ã© obrigatÃ³rio' },
      { type: 'minLength', message: 'Bairro deve ter pelo menos 2 caracteres', params: 2 },
      { type: 'maxLength', message: 'Bairro deve ter no mÃ¡ximo 100 caracteres', params: 100 }
    ],
    cidade: [
      { type: 'required', message: 'Cidade Ã© obrigatÃ³ria' },
      { type: 'minLength', message: 'Cidade deve ter pelo menos 2 caracteres', params: 2 },
      { type: 'maxLength', message: 'Cidade deve ter no mÃ¡ximo 100 caracteres', params: 100 }
    ],
    estado: [
      { type: 'required', message: 'Estado Ã© obrigatÃ³rio' },
      { type: 'minLength', message: 'Estado deve ter pelo menos 2 caracteres', params: 2 },
      { type: 'maxLength', message: 'Estado deve ter no mÃ¡ximo 2 caracteres', params: 2 }
    ],
    cep: [
      { type: 'required', message: 'CEP Ã© obrigatÃ³rio' },
      { type: 'minLength', message: 'CEP deve ter pelo menos 8 caracteres', params: 8 },
      { type: 'maxLength', message: 'CEP deve ter no mÃ¡ximo 9 caracteres', params: 9 }
    ]
  },

  // ValidaÃ§Ã£o para categorias
  categoria: {
    nome: [
      { type: 'required', message: 'Nome da categoria Ã© obrigatÃ³rio' },
      { type: 'minLength', message: 'Nome deve ter pelo menos 2 caracteres', params: 2 },
      { type: 'maxLength', message: 'Nome deve ter no mÃ¡ximo 100 caracteres', params: 100 }
    ],
    descricao: [
      { type: 'maxLength', message: 'DescriÃ§Ã£o deve ter no mÃ¡ximo 500 caracteres', params: 500 }
    ]
  }
}

// FunÃ§Ãµes utilitÃ¡rias de validaÃ§Ã£o
export const validationUtils = {
  /**
   * Valida um objeto completo baseado em um schema
   */
  validateObject<T extends Record<string, any>>(
    obj: T,
    schema: keyof typeof validationSchemas
  ): ValidationResult {
    const schemaRules = validationSchemas[schema]
    const errors: string[] = []
    const warnings: string[] = []

    for (const [field, rules] of Object.entries(schemaRules)) {
      const value = obj[field]
      for (const rule of rules as ValidationRuleConfig[]) {
        const isValid = validator['validateRule'](value, rule)
        if (!isValid) {
          errors.push(rule.message)
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  },

  /**
   * Valida um campo especÃ­fico
   */
  validateField(
    field: string,
    value: any,
    schema: keyof typeof validationSchemas
  ): ValidationResult {
    const schemaRules = validationSchemas[schema]
    const fieldRules = schemaRules[field as keyof typeof schemaRules]

    if (!fieldRules) {
      return { isValid: true, errors: [] }
    }

    const errors: string[] = []
    for (const rule of fieldRules as ValidationRuleConfig[]) {
      const isValid = validator['validateRule'](value, rule)
      if (!isValid) {
        errors.push(rule.message)
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Sanitiza uma string removendo caracteres perigosos
   */
  sanitizeString(value: string): string {
    return value
      .trim()
      .replace(/[<>]/g, '') // Remove < e >
      .replace(/javascript:/gi, '') // Remove javascript:
      .replace(/on\w+=/gi, '') // Remove event handlers
  },

  /**
   * Valida e sanitiza um email
   */
  validateAndSanitizeEmail(email: string): { isValid: boolean; email: string; error?: string } {
    const sanitized = this.sanitizeString(email).toLowerCase()
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)

    return {
      isValid,
      email: sanitized,
      error: isValid ? undefined : 'Email invÃ¡lido'
    }
  },

  /**
   * Valida CEP brasileiro
   */
  validateCEP(cep: string): boolean {
    const cleanCEP = cep.replace(/\D/g, '')
    return /^\d{8}$/.test(cleanCEP)
  },

  /**
   * Valida telefone brasileiro
   */
  validatePhone(phone: string): boolean {
    const cleanPhone = phone.replace(/\D/g, '')
    return /^(\d{10}|\d{11})$/.test(cleanPhone)
  },

  /**
   * Formata CEP brasileiro
   */
  formatCEP(cep: string): string {
    const cleanCEP = cep.replace(/\D/g, '')
    return cleanCEP.replace(/(\d{5})(\d{3})/, '$1-$2')
  },

  /**
   * Formata telefone brasileiro
   */
  formatPhone(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length === 11) {
      return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    } else if (cleanPhone.length === 10) {
      return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }
    return phone
  }
}

// Inicializa as regras de validaÃ§Ã£o
export const initializeValidation = () => {
  // Registra todas as regras de validaÃ§Ã£o
  for (const [schemaName, schema] of Object.entries(validationSchemas)) {
    for (const [field, rules] of Object.entries(schema)) {
      validator.addRules(`${schemaName}.${field}`, rules as ValidationRuleConfig[])
    }
  }
}

// Inicializa automaticamente
initializeValidation()

