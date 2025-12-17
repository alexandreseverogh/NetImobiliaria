// Sistema de validação robusto e centralizado
// Elimina hardcoding e centraliza todas as regras de validação

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
   * Adiciona regras de validação para um campo
   */
  addRules(field: string, rules: ValidationRuleConfig[]): void {
    this.rules.set(field, rules)
  }

  /**
   * Valida um campo específico
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
   * Valida múltiplos campos
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
   * Valida uma regra específica
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

    if (value.length < config.PASSWORD_MIN_LENGTH) return false
    if (config.PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(value)) return false
    if (config.PASSWORD_REQUIRE_LOWERCASE && !/[a-z]/.test(value)) return false
    if (config.PASSWORD_REQUIRE_NUMBERS && !/\d/.test(value)) return false
    if (config.PASSWORD_REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) return false

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

// Instância global do validador
export const validator = new ValidationEngine()

// Configurações de validação para diferentes entidades
export const validationSchemas = {
  // Validação para usuários
  user: {
    username: [
      { type: 'required', message: 'Nome de usuário é obrigatório' },
      { type: 'minLength', message: 'Nome de usuário deve ter pelo menos 3 caracteres', params: APP_CONFIG.VALIDATION.MIN_USERNAME_LENGTH },
      { type: 'maxLength', message: 'Nome de usuário deve ter no máximo 50 caracteres', params: APP_CONFIG.VALIDATION.MAX_USERNAME_LENGTH }
    ],
    email: [
      { type: 'required', message: 'Email é obrigatório' },
      { type: 'email', message: 'Email deve ter um formato válido' }
    ],
    password: [
      { type: 'required', message: 'Senha é obrigatória' },
      { type: 'password', message: 'Senha deve atender aos critérios de segurança' }
    ],
    nome: [
      { type: 'required', message: 'Nome é obrigatório' },
      { type: 'minLength', message: 'Nome deve ter pelo menos 2 caracteres', params: APP_CONFIG.VALIDATION.MIN_NAME_LENGTH },
      { type: 'maxLength', message: 'Nome deve ter no máximo 100 caracteres', params: APP_CONFIG.VALIDATION.MAX_NAME_LENGTH }
    ],
    telefone: [
      { type: 'required', message: 'Telefone é obrigatório' },
      { type: 'minLength', message: 'Telefone deve ter pelo menos 10 caracteres', params: 10 }
    ]
  },

  // Validação para imóveis
  imovel: {
    titulo: [
      { type: 'required', message: 'Título é obrigatório' },
      { type: 'minLength', message: 'Título deve ter pelo menos 5 caracteres', params: 5 },
      { type: 'maxLength', message: 'Título deve ter no máximo 200 caracteres', params: APP_CONFIG.VALIDATION.MAX_TITLE_LENGTH }
    ],
    descricao: [
      { type: 'required', message: 'Descrição é obrigatória' },
      { type: 'minLength', message: 'Descrição deve ter pelo menos 10 caracteres', params: 10 },
      { type: 'maxLength', message: 'Descrição deve ter no máximo 2000 caracteres', params: APP_CONFIG.VALIDATION.MAX_DESCRIPTION_LENGTH }
    ],
    preco: [
      { type: 'required', message: 'Preço é obrigatório' },
      { type: 'number', message: 'Preço deve ser um número válido' },
      { type: 'range', message: 'Preço deve estar entre 0 e 999.999.999', params: { min: APP_CONFIG.VALIDATION.MIN_PRICE, max: APP_CONFIG.VALIDATION.MAX_PRICE } }
    ],
    areaTotal: [
      { type: 'required', message: 'Área total é obrigatória' },
      { type: 'number', message: 'Área total deve ser um número válido' },
      { type: 'range', message: 'Área total deve estar entre 0 e 999.999', params: { min: APP_CONFIG.VALIDATION.MIN_AREA, max: APP_CONFIG.VALIDATION.MAX_AREA } }
    ],
    quartos: [
      { type: 'required', message: 'Número de quartos é obrigatório' },
      { type: 'number', message: 'Número de quartos deve ser um número válido' },
      { type: 'range', message: 'Número de quartos deve estar entre 0 e 20', params: { min: 0, max: APP_CONFIG.VALIDATION.MAX_QUARTOS } }
    ],
    banheiros: [
      { type: 'required', message: 'Número de banheiros é obrigatório' },
      { type: 'number', message: 'Número de banheiros deve ser um número válido' },
      { type: 'range', message: 'Número de banheiros deve estar entre 0 e 20', params: { min: 0, max: APP_CONFIG.VALIDATION.MAX_BANHEIROS } }
    ],
    vagasGaragem: [
      { type: 'required', message: 'Número de vagas de garagem é obrigatório' },
      { type: 'number', message: 'Número de vagas de garagem deve ser um número válido' },
      { type: 'range', message: 'Número de vagas de garagem deve estar entre 0 e 20', params: { min: 0, max: APP_CONFIG.VALIDATION.MAX_VAGAS_GARAGEM } }
    ]
  },

  // Validação para endereços
  endereco: {
    logradouro: [
      { type: 'required', message: 'Logradouro é obrigatório' },
      { type: 'minLength', message: 'Logradouro deve ter pelo menos 3 caracteres', params: APP_CONFIG.VALIDATION.MIN_LOGRADOURO_LENGTH },
      { type: 'maxLength', message: 'Logradouro deve ter no máximo 200 caracteres', params: APP_CONFIG.VALIDATION.MAX_LOGRADOURO_LENGTH }
    ],
    numero: [
      { type: 'required', message: 'Número é obrigatório' },
      { type: 'minLength', message: 'Número deve ter pelo menos 1 caractere', params: APP_CONFIG.VALIDATION.MIN_NUMERO_LENGTH },
      { type: 'maxLength', message: 'Número deve ter no máximo 20 caracteres', params: APP_CONFIG.VALIDATION.MAX_NUMERO_LENGTH }
    ],
    bairro: [
      { type: 'required', message: 'Bairro é obrigatório' },
      { type: 'minLength', message: 'Bairro deve ter pelo menos 2 caracteres', params: APP_CONFIG.VALIDATION.MIN_BAIRRO_LENGTH },
      { type: 'maxLength', message: 'Bairro deve ter no máximo 100 caracteres', params: APP_CONFIG.VALIDATION.MAX_BAIRRO_LENGTH }
    ],
    cidade: [
      { type: 'required', message: 'Cidade é obrigatória' },
      { type: 'minLength', message: 'Cidade deve ter pelo menos 2 caracteres', params: APP_CONFIG.VALIDATION.MIN_CIDADE_LENGTH },
      { type: 'maxLength', message: 'Cidade deve ter no máximo 100 caracteres', params: APP_CONFIG.VALIDATION.MAX_CIDADE_LENGTH }
    ],
    estado: [
      { type: 'required', message: 'Estado é obrigatório' },
      { type: 'minLength', message: 'Estado deve ter pelo menos 2 caracteres', params: APP_CONFIG.VALIDATION.MIN_ESTADO_LENGTH },
      { type: 'maxLength', message: 'Estado deve ter no máximo 2 caracteres', params: APP_CONFIG.VALIDATION.MAX_ESTADO_LENGTH }
    ],
    cep: [
      { type: 'required', message: 'CEP é obrigatório' },
      { type: 'minLength', message: 'CEP deve ter pelo menos 8 caracteres', params: APP_CONFIG.VALIDATION.MIN_CEP_LENGTH },
      { type: 'maxLength', message: 'CEP deve ter no máximo 9 caracteres', params: APP_CONFIG.VALIDATION.MAX_CEP_LENGTH }
    ]
  },

  // Validação para categorias
  categoria: {
    nome: [
      { type: 'required', message: 'Nome da categoria é obrigatório' },
      { type: 'minLength', message: 'Nome deve ter pelo menos 2 caracteres', params: 2 },
      { type: 'maxLength', message: 'Nome deve ter no máximo 100 caracteres', params: 100 }
    ],
    descricao: [
      { type: 'maxLength', message: 'Descrição deve ter no máximo 500 caracteres', params: APP_CONFIG.VALIDATION.MAX_CATEGORIA_DESCRICAO_LENGTH }
    ]
  }
}

// Funções utilitárias de validação
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
   * Valida um campo específico
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
      error: isValid ? undefined : 'Email inválido'
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

// Inicializa as regras de validação
export const initializeValidation = () => {
  // Registra todas as regras de validação
  for (const [schemaName, schema] of Object.entries(validationSchemas)) {
    for (const [field, rules] of Object.entries(schema)) {
      validator.addRules(`${schemaName}.${field}`, rules as ValidationRuleConfig[])
    }
  }
}

// Inicializa automaticamente
initializeValidation()
