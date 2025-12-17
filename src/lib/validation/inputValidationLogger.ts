// Sistema de logging de entradas inválidas
// Integração com security monitor para capturar tentativas de entrada inválida

import { logInvalidInput } from '@/lib/monitoring/securityMonitor';

export interface InvalidInputEvent {
  endpoint: string;
  method: string;
  ipAddress: string;
  userAgent: string;
  userId?: string;
  errors: string[];
  inputData?: any;
  timestamp: Date;
}

export class InputValidationLogger {
  private static instance: InputValidationLogger;
  
  private constructor() {}
  
  public static getInstance(): InputValidationLogger {
    if (!InputValidationLogger.instance) {
      InputValidationLogger.instance = new InputValidationLogger();
    }
    return InputValidationLogger.instance;
  }

  /**
   * Log de entrada inválida para APIs de usuários
   */
  public logUserValidationError(
    endpoint: string,
    ipAddress: string,
    userAgent: string,
    errors: string[],
    inputData?: any,
    userId?: string
  ): void {
    const event: InvalidInputEvent = {
      endpoint,
      method: 'POST',
      ipAddress,
      userAgent,
      userId,
      errors,
      inputData: this.sanitizeInputData(inputData),
      timestamp: new Date()
    };

    // Log para security monitor
    logInvalidInput(ipAddress, userAgent, endpoint, errors);

    // Log adicional para análise
    console.log('🚫 Invalid Input - Users API:', {
      endpoint,
      errors: errors.length,
      userId,
      ip: ipAddress
    });
  }

  /**
   * Log de entrada inválida para APIs de imóveis
   */
  public logPropertyValidationError(
    endpoint: string,
    ipAddress: string,
    userAgent: string,
    errors: string[],
    inputData?: any,
    userId?: string
  ): void {
    const event: InvalidInputEvent = {
      endpoint,
      method: 'POST',
      ipAddress,
      userAgent,
      userId,
      errors,
      inputData: this.sanitizeInputData(inputData),
      timestamp: new Date()
    };

    // Log para security monitor
    logInvalidInput(ipAddress, userAgent, endpoint, errors);

    console.log('🚫 Invalid Input - Properties API:', {
      endpoint,
      errors: errors.length,
      userId,
      ip: ipAddress
    });
  }

  /**
   * Log de entrada inválida para APIs de clientes
   */
  public logClientValidationError(
    endpoint: string,
    ipAddress: string,
    userAgent: string,
    errors: string[],
    inputData?: any,
    userId?: string
  ): void {
    const event: InvalidInputEvent = {
      endpoint,
      method: 'POST',
      ipAddress,
      userAgent,
      userId,
      errors,
      inputData: this.sanitizeInputData(inputData),
      timestamp: new Date()
    };

    // Log para security monitor
    logInvalidInput(ipAddress, userAgent, endpoint, errors);

    console.log('🚫 Invalid Input - Clients API:', {
      endpoint,
      errors: errors.length,
      userId,
      ip: ipAddress
    });
  }

  /**
   * Log de entrada inválida para APIs de proprietários
   */
  public logOwnerValidationError(
    endpoint: string,
    ipAddress: string,
    userAgent: string,
    errors: string[],
    inputData?: any,
    userId?: string
  ): void {
    const event: InvalidInputEvent = {
      endpoint,
      method: 'POST',
      ipAddress,
      userAgent,
      userId,
      errors,
      inputData: this.sanitizeInputData(inputData),
      timestamp: new Date()
    };

    // Log para security monitor
    logInvalidInput(ipAddress, userAgent, endpoint, errors);

    console.log('🚫 Invalid Input - Owners API:', {
      endpoint,
      errors: errors.length,
      userId,
      ip: ipAddress
    });
  }

  /**
   * Log de entrada inválida para APIs de perfis
   */
  public logProfileValidationError(
    endpoint: string,
    ipAddress: string,
    userAgent: string,
    errors: string[],
    inputData?: any,
    userId?: string
  ): void {
    const event: InvalidInputEvent = {
      endpoint,
      method: 'POST',
      ipAddress,
      userAgent,
      userId,
      errors,
      inputData: this.sanitizeInputData(inputData),
      timestamp: new Date()
    };

    // Log para security monitor
    logInvalidInput(ipAddress, userAgent, endpoint, errors);

    console.log('🚫 Invalid Input - Profiles API:', {
      endpoint,
      errors: errors.length,
      userId,
      ip: ipAddress
    });
  }

  /**
   * Log de entrada inválida para APIs de categorias
   */
  public logCategoryValidationError(
    endpoint: string,
    ipAddress: string,
    userAgent: string,
    errors: string[],
    inputData?: any,
    userId?: string
  ): void {
    const event: InvalidInputEvent = {
      endpoint,
      method: 'POST',
      ipAddress,
      userAgent,
      userId,
      errors,
      inputData: this.sanitizeInputData(inputData),
      timestamp: new Date()
    };

    // Log para security monitor
    logInvalidInput(ipAddress, userAgent, endpoint, errors);

    console.log('🚫 Invalid Input - Categories API:', {
      endpoint,
      errors: errors.length,
      userId,
      ip: ipAddress
    });
  }

  /**
   * Log de entrada inválida para APIs de amenidades
   */
  public logAmenityValidationError(
    endpoint: string,
    ipAddress: string,
    userAgent: string,
    errors: string[],
    inputData?: any,
    userId?: string
  ): void {
    const event: InvalidInputEvent = {
      endpoint,
      method: 'POST',
      ipAddress,
      userAgent,
      userId,
      errors,
      inputData: this.sanitizeInputData(inputData),
      timestamp: new Date()
    };

    // Log para security monitor
    logInvalidInput(ipAddress, userAgent, endpoint, errors);

    console.log('🚫 Invalid Input - Amenities API:', {
      endpoint,
      errors: errors.length,
      userId,
      ip: ipAddress
    });
  }

  /**
   * Log de entrada inválida para APIs de proximidades
   */
  public logProximityValidationError(
    endpoint: string,
    ipAddress: string,
    userAgent: string,
    errors: string[],
    inputData?: any,
    userId?: string
  ): void {
    const event: InvalidInputEvent = {
      endpoint,
      method: 'POST',
      ipAddress,
      userAgent,
      userId,
      errors,
      inputData: this.sanitizeInputData(inputData),
      timestamp: new Date()
    };

    // Log para security monitor
    logInvalidInput(ipAddress, userAgent, endpoint, errors);

    console.log('🚫 Invalid Input - Proximities API:', {
      endpoint,
      errors: errors.length,
      userId,
      ip: ipAddress
    });
  }

  /**
   * Log de entrada inválida para APIs de tipos de documentos
   */
  public logDocumentTypeValidationError(
    endpoint: string,
    ipAddress: string,
    userAgent: string,
    errors: string[],
    inputData?: any,
    userId?: string
  ): void {
    const event: InvalidInputEvent = {
      endpoint,
      method: 'POST',
      ipAddress,
      userAgent,
      userId,
      errors,
      inputData: this.sanitizeInputData(inputData),
      timestamp: new Date()
    };

    // Log para security monitor
    logInvalidInput(ipAddress, userAgent, endpoint, errors);

    console.log('🚫 Invalid Input - Document Types API:', {
      endpoint,
      errors: errors.length,
      userId,
      ip: ipAddress
    });
  }

  /**
   * Log de entrada inválida para APIs de tipos de imóveis
   */
  public logPropertyTypeValidationError(
    endpoint: string,
    ipAddress: string,
    userAgent: string,
    errors: string[],
    inputData?: any,
    userId?: string
  ): void {
    const event: InvalidInputEvent = {
      endpoint,
      method: 'POST',
      ipAddress,
      userAgent,
      userId,
      errors,
      inputData: this.sanitizeInputData(inputData),
      timestamp: new Date()
    };

    // Log para security monitor
    logInvalidInput(ipAddress, userAgent, endpoint, errors);

    console.log('🚫 Invalid Input - Property Types API:', {
      endpoint,
      errors: errors.length,
      userId,
      ip: ipAddress
    });
  }

  /**
   * Log de entrada inválida para APIs de finalidades
   */
  public logPurposeValidationError(
    endpoint: string,
    ipAddress: string,
    userAgent: string,
    errors: string[],
    inputData?: any,
    userId?: string
  ): void {
    const event: InvalidInputEvent = {
      endpoint,
      method: 'POST',
      ipAddress,
      userAgent,
      userId,
      errors,
      inputData: this.sanitizeInputData(inputData),
      timestamp: new Date()
    };

    // Log para security monitor
    logInvalidInput(ipAddress, userAgent, endpoint, errors);

    console.log('🚫 Invalid Input - Purposes API:', {
      endpoint,
      errors: errors.length,
      userId,
      ip: ipAddress
    });
  }

  /**
   * Log de entrada inválida para APIs de status de imóveis
   */
  public logPropertyStatusValidationError(
    endpoint: string,
    ipAddress: string,
    userAgent: string,
    errors: string[],
    inputData?: any,
    userId?: string
  ): void {
    const event: InvalidInputEvent = {
      endpoint,
      method: 'POST',
      ipAddress,
      userAgent,
      userId,
      errors,
      inputData: this.sanitizeInputData(inputData),
      timestamp: new Date()
    };

    // Log para security monitor
    logInvalidInput(ipAddress, userAgent, endpoint, errors);

    console.log('🚫 Invalid Input - Property Status API:', {
      endpoint,
      errors: errors.length,
      userId,
      ip: ipAddress
    });
  }

  /**
   * Sanitizar dados de entrada para logging seguro
   */
  private sanitizeInputData(data: any): any {
    if (!data) return null;
    
    const sanitized = { ...data };
    
    // Remover campos sensíveis
    delete sanitized.senha;
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.jwt;
    
    // Limitar tamanho dos dados
    const jsonString = JSON.stringify(sanitized);
    if (jsonString.length > 1000) {
      return { 
        ...sanitized, 
        _truncated: true,
        _originalSize: jsonString.length
      };
    }
    
    return sanitized;
  }

  /**
   * Obter estatísticas de entradas inválidas
   */
  public async getInvalidInputStats(): Promise<{
    total: number;
    byEndpoint: Record<string, number>;
    byType: Record<string, number>;
    recent: InvalidInputEvent[];
  }> {
    // Esta implementação seria conectada ao banco de dados
    // Por enquanto, retorna dados mockados
    return {
      total: 0,
      byEndpoint: {},
      byType: {},
      recent: []
    };
  }
}

// Instância singleton
export const inputValidationLogger = InputValidationLogger.getInstance();
