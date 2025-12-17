// Exemplo de integração do sistema de validação unificado
// Como usar em APIs existentes para capturar entradas inválidas

import { createValidator } from './unifiedValidation';
import { NextRequest } from 'next/server';

/**
 * EXEMPLO 1: Integração na API de Usuários
 */
export async function validateUserInput(
  request: NextRequest,
  data: any,
  userId?: string
) {
  const validator = createValidator('users', '/api/admin/usuarios');
  
  const validation = await validator.validateAndLog(
    data,
    request.ip || 'unknown',
    request.headers.get('user-agent') || 'unknown',
    userId
  );
  
  return validation;
}

/**
 * EXEMPLO 2: Integração na API de Imóveis
 */
export async function validatePropertyInput(
  request: NextRequest,
  data: any,
  userId?: string
) {
  const validator = createValidator('properties', '/api/admin/imoveis');
  
  const validation = await validator.validateAndLog(
    data,
    request.ip || 'unknown',
    request.headers.get('user-agent') || 'unknown',
    userId
  );
  
  return validation;
}

/**
 * EXEMPLO 3: Integração na API de Clientes
 */
export async function validateClientInput(
  request: NextRequest,
  data: any,
  userId?: string
) {
  const validator = createValidator('clients', '/api/admin/clientes');
  
  const validation = await validator.validateAndLog(
    data,
    request.ip || 'unknown',
    request.headers.get('user-agent') || 'unknown',
    userId
  );
  
  return validation;
}

/**
 * EXEMPLO 4: Integração na API de Proprietários
 */
export async function validateOwnerInput(
  request: NextRequest,
  data: any,
  userId?: string
) {
  const validator = createValidator('owners', '/api/admin/proprietarios');
  
  const validation = await validator.validateAndLog(
    data,
    request.ip || 'unknown',
    request.headers.get('user-agent') || 'unknown',
    userId
  );
  
  return validation;
}

/**
 * EXEMPLO 5: Integração na API de Perfis
 */
export async function validateProfileInput(
  request: NextRequest,
  data: any,
  userId?: string
) {
  const validator = createValidator('profiles', '/api/admin/perfis');
  
  const validation = await validator.validateAndLog(
    data,
    request.ip || 'unknown',
    request.headers.get('user-agent') || 'unknown',
    userId
  );
  
  return validation;
}

/**
 * EXEMPLO 6: Integração na API de Categorias
 */
export async function validateCategoryInput(
  request: NextRequest,
  data: any,
  userId?: string
) {
  const validator = createValidator('categories', '/api/admin/categorias');
  
  const validation = await validator.validateAndLog(
    data,
    request.ip || 'unknown',
    request.headers.get('user-agent') || 'unknown',
    userId
  );
  
  return validation;
}

/**
 * EXEMPLO 7: Integração na API de Amenidades
 */
export async function validateAmenityInput(
  request: NextRequest,
  data: any,
  userId?: string
) {
  const validator = createValidator('amenities', '/api/admin/amenidades');
  
  const validation = await validator.validateAndLog(
    data,
    request.ip || 'unknown',
    request.headers.get('user-agent') || 'unknown',
    userId
  );
  
  return validation;
}

/**
 * EXEMPLO 8: Integração na API de Proximidades
 */
export async function validateProximityInput(
  request: NextRequest,
  data: any,
  userId?: string
) {
  const validator = createValidator('proximities', '/api/admin/proximidades');
  
  const validation = await validator.validateAndLog(
    data,
    request.ip || 'unknown',
    request.headers.get('user-agent') || 'unknown',
    userId
  );
  
  return validation;
}

/**
 * EXEMPLO 9: Integração na API de Tipos de Documentos
 */
export async function validateDocumentTypeInput(
  request: NextRequest,
  data: any,
  userId?: string
) {
  const validator = createValidator('document-types', '/api/admin/tipos-documentos');
  
  const validation = await validator.validateAndLog(
    data,
    request.ip || 'unknown',
    request.headers.get('user-agent') || 'unknown',
    userId
  );
  
  return validation;
}

/**
 * EXEMPLO 10: Integração na API de Tipos de Imóveis
 */
export async function validatePropertyTypeInput(
  request: NextRequest,
  data: any,
  userId?: string
) {
  const validator = createValidator('property-types', '/api/admin/tipos-imoveis');
  
  const validation = await validator.validateAndLog(
    data,
    request.ip || 'unknown',
    request.headers.get('user-agent') || 'unknown',
    userId
  );
  
  return validation;
}

/**
 * EXEMPLO 11: Integração na API de Finalidades
 */
export async function validatePurposeInput(
  request: NextRequest,
  data: any,
  userId?: string
) {
  const validator = createValidator('purposes', '/api/admin/finalidades');
  
  const validation = await validator.validateAndLog(
    data,
    request.ip || 'unknown',
    request.headers.get('user-agent') || 'unknown',
    userId
  );
  
  return validation;
}

/**
 * EXEMPLO 12: Integração na API de Status de Imóveis
 */
export async function validatePropertyStatusInput(
  request: NextRequest,
  data: any,
  userId?: string
) {
  const validator = createValidator('property-status', '/api/admin/status-imovel');
  
  const validation = await validator.validateAndLog(
    data,
    request.ip || 'unknown',
    request.headers.get('user-agent') || 'unknown',
    userId
  );
  
  return validation;
}

/**
 * EXEMPLO DE USO EM UMA API ROUTE
 */
export async function exampleApiRoute(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validar entrada
    const validation = await validateUserInput(request, data);
    
    if (!validation.isValid) {
      return Response.json(
        { 
          error: 'Dados inválidos',
          details: validation.errors 
        },
        { status: 400 }
      );
    }
    
    // Continuar com a lógica da API...
    return Response.json({ success: true });
    
  } catch (error) {
    return Response.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}




