// Sistema de validação unificado para todas as APIs
// Integração com logging de entradas inválidas

import { AdvancedValidator, ValidationRule } from './advancedValidation';
import { inputValidationLogger } from './inputValidationLogger';

export interface ValidationConfig {
  rules: ValidationRule[];
  endpoint: string;
  apiType: 'users' | 'properties' | 'clients' | 'owners' | 'profiles' | 'categories' | 'amenities' | 'proximities' | 'document-types' | 'property-types' | 'purposes' | 'property-status';
}

export class UnifiedValidator {
  private validator: AdvancedValidator;
  private config: ValidationConfig;

  constructor(config: ValidationConfig) {
    this.config = config;
    this.validator = new AdvancedValidator(config.rules);
  }

  /**
   * Validar dados e logar entradas inválidas
   */
  public async validateAndLog(
    data: any,
    ipAddress: string,
    userAgent: string,
    userId?: string
  ): Promise<{
    isValid: boolean;
    errors: string[];
    sanitizedData?: any;
  }> {
    // Validar dados
    const validation = this.validator.validate(data);

    // Se houver erros, logar entrada inválida
    if (!validation.isValid && validation.errors.length > 0) {
      this.logInvalidInput(ipAddress, userAgent, validation.errors, data, userId);
    }

    return validation;
  }

  /**
   * Logar entrada inválida baseada no tipo de API
   */
  private logInvalidInput(
    ipAddress: string,
    userAgent: string,
    errors: string[],
    inputData: any,
    userId?: string
  ): void {
    const endpoint = this.config.endpoint;

    switch (this.config.apiType) {
      case 'users':
        inputValidationLogger.logUserValidationError(
          endpoint, ipAddress, userAgent, errors, inputData, userId
        );
        break;
      
      case 'properties':
        inputValidationLogger.logPropertyValidationError(
          endpoint, ipAddress, userAgent, errors, inputData, userId
        );
        break;
      
      case 'clients':
        inputValidationLogger.logClientValidationError(
          endpoint, ipAddress, userAgent, errors, inputData, userId
        );
        break;
      
      case 'owners':
        inputValidationLogger.logOwnerValidationError(
          endpoint, ipAddress, userAgent, errors, inputData, userId
        );
        break;
      
      case 'profiles':
        inputValidationLogger.logProfileValidationError(
          endpoint, ipAddress, userAgent, errors, inputData, userId
        );
        break;
      
      case 'categories':
        inputValidationLogger.logCategoryValidationError(
          endpoint, ipAddress, userAgent, errors, inputData, userId
        );
        break;
      
      case 'amenities':
        inputValidationLogger.logAmenityValidationError(
          endpoint, ipAddress, userAgent, errors, inputData, userId
        );
        break;
      
      case 'proximities':
        inputValidationLogger.logProximityValidationError(
          endpoint, ipAddress, userAgent, errors, inputData, userId
        );
        break;
      
      case 'document-types':
        inputValidationLogger.logDocumentTypeValidationError(
          endpoint, ipAddress, userAgent, errors, inputData, userId
        );
        break;
      
      case 'property-types':
        inputValidationLogger.logPropertyTypeValidationError(
          endpoint, ipAddress, userAgent, errors, inputData, userId
        );
        break;
      
      case 'purposes':
        inputValidationLogger.logPurposeValidationError(
          endpoint, ipAddress, userAgent, errors, inputData, userId
        );
        break;
      
      case 'property-status':
        inputValidationLogger.logPropertyStatusValidationError(
          endpoint, ipAddress, userAgent, errors, inputData, userId
        );
        break;
      
      default:
        // Log genérico
        inputValidationLogger.logUserValidationError(
          endpoint, ipAddress, userAgent, errors, inputData, userId
        );
    }
  }
}

// Configurações de validação para cada tipo de API
export const validationConfigs: Record<string, Omit<ValidationConfig, 'endpoint'>> = {
  users: {
    rules: [
      { field: 'nome', type: 'string', required: true, minLength: 2, maxLength: 100 },
      { field: 'email', type: 'email', required: true, maxLength: 255 },
      { field: 'senha', type: 'string', required: true, minLength: 6, maxLength: 255 },
      { field: 'ativo', type: 'boolean', required: false }
    ],
    apiType: 'users' as const
  },
  
  properties: {
    rules: [
      { field: 'titulo', type: 'string', required: true, minLength: 5, maxLength: 200 },
      { field: 'descricao', type: 'string', required: true, minLength: 10, maxLength: 2000 },
      { field: 'preco', type: 'number', required: true, min: 0 },
      { field: 'area_total', type: 'number', required: true, min: 0 },
      { field: 'area_construida', type: 'number', required: false, min: 0 },
      { field: 'quartos', type: 'number', required: true, min: 0, max: 20 },
      { field: 'banheiros', type: 'number', required: true, min: 0, max: 20 },
      { field: 'vagas', type: 'number', required: false, min: 0, max: 10 },
      { field: 'tipo_imovel_id', type: 'string', required: true },
      { field: 'finalidade_id', type: 'string', required: true },
      { field: 'status_id', type: 'string', required: true }
    ],
    apiType: 'properties' as const
  },
  
  clients: {
    rules: [
      { field: 'nome', type: 'string', required: true, minLength: 2, maxLength: 100 },
      { field: 'email', type: 'email', required: true, maxLength: 255 },
      { field: 'telefone', type: 'string', required: true, minLength: 10, maxLength: 20 },
      { 
        field: 'cpf', 
        type: 'string', 
        required: true, 
        custom: (value: string) => {
          // Validação de CPF mais flexível
          const cleanCPF = value.replace(/\D/g, '')
          if (cleanCPF.length !== 11) return 'CPF deve ter 11 dígitos'
          if (/^(\d)\1{10}$/.test(cleanCPF)) return 'CPF inválido (números repetidos)'
          
          // Algoritmo de validação de CPF
          let sum = 0
          for (let i = 0; i < 9; i++) {
            sum += parseInt(cleanCPF.charAt(i)) * (10 - i)
          }
          let remainder = sum % 11
          let firstDigit = remainder < 2 ? 0 : 11 - remainder
          
          if (parseInt(cleanCPF.charAt(9)) !== firstDigit) return 'CPF inválido (primeiro dígito)'
          
          sum = 0
          for (let i = 0; i < 10; i++) {
            sum += parseInt(cleanCPF.charAt(i)) * (11 - i)
          }
          remainder = sum % 11
          let secondDigit = remainder < 2 ? 0 : 11 - remainder
          
          if (parseInt(cleanCPF.charAt(10)) !== secondDigit) return 'CPF inválido (segundo dígito)'
          
          return true
        }
      },
      { field: 'estado_fk', type: 'string', required: true },
      { field: 'cidade_fk', type: 'string', required: true },
      { field: 'data_nascimento', type: 'date', required: false }
    ],
    apiType: 'clients' as const
  },
  
  owners: {
    rules: [
      { field: 'nome', type: 'string', required: true, minLength: 2, maxLength: 100 },
      { field: 'email', type: 'email', required: true, maxLength: 255 },
      { field: 'telefone', type: 'string', required: true, minLength: 10, maxLength: 20 },
      { 
        field: 'cpf', 
        type: 'string', 
        required: true, 
        custom: (value: string) => {
          // Validação de CPF mais flexível
          const cleanCPF = value.replace(/\D/g, '')
          if (cleanCPF.length !== 11) return 'CPF deve ter 11 dígitos'
          if (/^(\d)\1{10}$/.test(cleanCPF)) return 'CPF inválido (números repetidos)'
          
          // Algoritmo de validação de CPF
          let sum = 0
          for (let i = 0; i < 9; i++) {
            sum += parseInt(cleanCPF.charAt(i)) * (10 - i)
          }
          let remainder = sum % 11
          let firstDigit = remainder < 2 ? 0 : 11 - remainder
          
          if (parseInt(cleanCPF.charAt(9)) !== firstDigit) return 'CPF inválido (primeiro dígito)'
          
          sum = 0
          for (let i = 0; i < 10; i++) {
            sum += parseInt(cleanCPF.charAt(i)) * (11 - i)
          }
          remainder = sum % 11
          let secondDigit = remainder < 2 ? 0 : 11 - remainder
          
          if (parseInt(cleanCPF.charAt(10)) !== secondDigit) return 'CPF inválido (segundo dígito)'
          
          return true
        }
      },
      { field: 'estado_fk', type: 'string', required: true },
      { field: 'cidade_fk', type: 'string', required: true },
      { field: 'data_nascimento', type: 'date', required: false }
    ],
    apiType: 'owners' as const
  },
  
  profiles: {
    rules: [
      { field: 'nome', type: 'string', required: true, minLength: 2, maxLength: 100 },
      { field: 'descricao', type: 'string', required: false, maxLength: 500 },
      { field: 'ativo', type: 'boolean', required: false }
    ],
    apiType: 'profiles' as const
  },
  
  categories: {
    rules: [
      { field: 'nome', type: 'string', required: true, minLength: 2, maxLength: 100 },
      { field: 'descricao', type: 'string', required: false, maxLength: 500 },
      { field: 'ativo', type: 'boolean', required: false }
    ],
    apiType: 'categories' as const
  },
  
  amenities: {
    rules: [
      { field: 'nome', type: 'string', required: true, minLength: 2, maxLength: 100 },
      { field: 'descricao', type: 'string', required: false, maxLength: 500 },
      { field: 'categoria_id', type: 'string', required: true },
      { field: 'ativo', type: 'boolean', required: false }
    ],
    apiType: 'amenities' as const
  },
  
  proximities: {
    rules: [
      { field: 'nome', type: 'string', required: true, minLength: 2, maxLength: 100 },
      { field: 'descricao', type: 'string', required: false, maxLength: 500 },
      { field: 'categoria_id', type: 'string', required: true },
      { field: 'ativo', type: 'boolean', required: false }
    ],
    apiType: 'proximities' as const
  },
  
  'document-types': {
    rules: [
      { field: 'nome', type: 'string', required: true, minLength: 2, maxLength: 100 },
      { field: 'descricao', type: 'string', required: false, maxLength: 500 },
      { field: 'obrigatorio', type: 'boolean', required: false },
      { field: 'ativo', type: 'boolean', required: false }
    ],
    apiType: 'document-types' as const
  },
  
  'property-types': {
    rules: [
      { field: 'nome', type: 'string', required: true, minLength: 2, maxLength: 100 },
      { field: 'descricao', type: 'string', required: false, maxLength: 500 },
      { field: 'ativo', type: 'boolean', required: false }
    ],
    apiType: 'property-types' as const
  },
  
  purposes: {
    rules: [
      { field: 'nome', type: 'string', required: true, minLength: 2, maxLength: 100 },
      { field: 'descricao', type: 'string', required: false, maxLength: 500 },
      { field: 'ativo', type: 'boolean', required: false }
    ],
    apiType: 'purposes' as const
  },
  
  'property-status': {
    rules: [
      { field: 'nome', type: 'string', required: true, minLength: 2, maxLength: 100 },
      { field: 'descricao', type: 'string', required: false, maxLength: 500 },
      { field: 'cor', type: 'string', required: false, maxLength: 7 },
      { field: 'ativo', type: 'boolean', required: false }
    ],
    apiType: 'property-status' as const
  }
};

// Função helper para criar validador
export function createValidator(
  apiType: keyof typeof validationConfigs,
  endpoint: string
): UnifiedValidator {
  const config = validationConfigs[apiType];
  return new UnifiedValidator({
    rules: config.rules,
    endpoint,
    apiType: config.apiType
  });
}
