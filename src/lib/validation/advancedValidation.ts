// Sistema de validação avançada para dados de entrada
// Foco em segurança e integridade dos dados

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'email' | 'url' | 'date' | 'boolean' | 'array' | 'object';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  sanitize?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

export class AdvancedValidator {
  private rules: ValidationRule[] = [];
  private sanitizationEnabled: boolean = true;

  constructor(rules: ValidationRule[] = []) {
    this.rules = rules;
  }

  // Adicionar regra de validação
  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  // Validar dados
  validate(data: any): ValidationResult {
    const errors: string[] = [];
    const sanitizedData: any = {};

    for (const rule of this.rules) {
      const value = data[rule.field];
      
      // Verificar se campo é obrigatório
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`Campo '${rule.field}' é obrigatório`);
        continue;
      }

      // Se campo não é obrigatório e está vazio, pular validação
      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Validar tipo
      const typeError = this.validateType(value, rule.type, rule.field);
      if (typeError) {
        errors.push(typeError);
        continue;
      }

      // Validar comprimento (para strings)
      if (rule.type === 'string' && typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`Campo '${rule.field}' deve ter pelo menos ${rule.minLength} caracteres`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`Campo '${rule.field}' deve ter no máximo ${rule.maxLength} caracteres`);
        }
      }

      // Validar range (para números)
      if (rule.type === 'number' && typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`Campo '${rule.field}' deve ser maior ou igual a ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`Campo '${rule.field}' deve ser menor ou igual a ${rule.max}`);
        }
      }

      // Validar padrão regex
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        errors.push(`Campo '${rule.field}' não atende ao padrão esperado`);
      }

      // Validação customizada
      if (rule.custom) {
        const customResult = rule.custom(value);
        if (customResult !== true) {
          errors.push(typeof customResult === 'string' ? customResult : `Campo '${rule.field}' é inválido`);
        }
      }

      // Sanitizar valor se necessário
      if (this.sanitizationEnabled && rule.sanitize !== false) {
        sanitizedData[rule.field] = this.sanitizeValue(value, rule.type);
      } else {
        sanitizedData[rule.field] = value;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: this.sanitizationEnabled ? sanitizedData : undefined
    };
  }

  // Validar tipo de dados
  private validateType(value: any, expectedType: string, fieldName: string): string | null {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string' ? null : `Campo '${fieldName}' deve ser uma string`;
      case 'number':
        return typeof value === 'number' && !isNaN(value) ? null : `Campo '${fieldName}' deve ser um número válido`;
      case 'email':
        return this.isValidEmail(value) ? null : `Campo '${fieldName}' deve ser um email válido`;
      case 'url':
        return this.isValidUrl(value) ? null : `Campo '${fieldName}' deve ser uma URL válida`;
      case 'date':
        return this.isValidDate(value) ? null : `Campo '${fieldName}' deve ser uma data válida`;
      case 'boolean':
        return typeof value === 'boolean' ? null : `Campo '${fieldName}' deve ser um boolean`;
      case 'array':
        return Array.isArray(value) ? null : `Campo '${fieldName}' deve ser um array`;
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value) ? null : `Campo '${fieldName}' deve ser um objeto`;
      default:
        return null;
    }
  }

  // Validar email
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validar URL
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Validar data
  private isValidDate(date: any): boolean {
    if (date instanceof Date) {
      return !isNaN(date.getTime());
    }
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }
    return false;
  }

  // Sanitizar valor
  private sanitizeValue(value: any, type: string): any {
    if (typeof value === 'string') {
      // Remover caracteres perigosos
      return value
        .replace(/[<>]/g, '') // Remover < e >
        .replace(/javascript:/gi, '') // Remover javascript:
        .replace(/on\w+=/gi, '') // Remover event handlers
        .trim();
    }
    return value;
  }

  // Ativar/desativar sanitização
  setSanitization(enabled: boolean): void {
    this.sanitizationEnabled = enabled;
  }
}

// Validações específicas para diferentes tipos de dados
export const UserValidationRules: ValidationRule[] = [
  {
    field: 'email',
    type: 'email',
    required: true,
    maxLength: 255,
    sanitize: true
  },
  {
    field: 'nome',
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-ZÀ-ÿ\s]+$/,
    sanitize: true
  },
  {
    field: 'ativo',
    type: 'boolean',
    required: false
  }
];

export const PropertyValidationRules: ValidationRule[] = [
  {
    field: 'titulo',
    type: 'string',
    required: true,
    minLength: 5,
    maxLength: 200,
    sanitize: true
  },
  {
    field: 'preco',
    type: 'number',
    required: true,
    min: 0,
    max: 999999999
  },
  {
    field: 'area_total',
    type: 'number',
    required: true,
    min: 1,
    max: 99999
  },
  {
    field: 'quartos',
    type: 'number',
    required: true,
    min: 0,
    max: 20
  },
  {
    field: 'banheiros',
    type: 'number',
    required: true,
    min: 0,
    max: 20
  }
];

export const CategoryValidationRules: ValidationRule[] = [
  {
    field: 'name',
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-ZÀ-ÿ\s\-_]+$/,
    sanitize: true
  },
  {
    field: 'description',
    type: 'string',
    required: false,
    maxLength: 500,
    sanitize: true
  }
];

// Função utilitária para validar dados de entrada
export function validateInput(data: any, rules: ValidationRule[]): ValidationResult {
  const validator = new AdvancedValidator(rules);
  return validator.validate(data);
}

// Função para validar dados de API
export function validateApiInput(data: any, endpoint: string): ValidationResult {
  let rules: ValidationRule[] = [];

  switch (endpoint) {
    case 'users':
      rules = UserValidationRules;
      break;
    case 'properties':
      rules = PropertyValidationRules;
      break;
    case 'categories':
      rules = CategoryValidationRules;
      break;
    default:
      rules = [];
  }

  return validateInput(data, rules);
}




