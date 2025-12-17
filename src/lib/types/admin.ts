// Tipos para usuários administrativos
export interface AdminUser {
  id: string
  username: string
  nome: string
  email: string
  telefone?: string
  ativo?: boolean
  ultimo_login?: string
  created_at?: string
  updated_at?: string
  permissoes: UserPermissions
  ultimoAcesso?: string
  status: 'ATIVO' | 'INATIVO'
  role_name?: string
  role_description?: string
  role_level?: number  // Nível hierárquico do perfil (1-6)
}

/**
 * NOVO SISTEMA DE PERMISSÕES - 100% DINÂMICO
 * Mapa de permissões por slug (sem hardcoding de recursos)
 */
export type UserPermissions = Record<string, Permission>

/**
 * Níveis de permissão (5 níveis granulares)
 * - CREATE: Criar novos registros
 * - READ: Visualizar/listar
 * - UPDATE: Editar existentes
 * - DELETE: Excluir
 * - EXECUTE: Executar ação
 * - ADMIN: Controle total
 */
export type Permission = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE' | 'ADMIN' | 'WRITE'

// Tipo mais específico para recursos
export type Resource = 
  | 'imoveis' 
  | 'proximidades' 
  | 'amenidades' 
  | 'categorias-amenidades' 
  | 'categorias-proximidades' 
  | 'tipos-imoveis'
  | 'tipos-documentos'
  | 'status'
  | 'finalidades'
  | 'status-imovel'
  | 'clientes'
  | 'proprietarios'
  | 'usuarios' 
  | 'relatorios'
  | 'sistema'
  | 'system-features'
  | 'system_categorias'
  | 'sessions'

// Tipos para categorias
export interface CategoriaAmenidade {
  id: string
  nome: string
  descricao?: string
  icone: string
  cor?: string
  ativo: boolean
  ordem: number
}

export interface CategoriaProximidade {
  id: string
  nome: string
  descricao?: string
  icone: string
  cor?: string
  ativo: boolean
  ordem: number
}

// Tipos para imóveis - Updated with codigo and taxaExtra
export interface Imovel {
  id: string
  codigo?: string
  titulo: string
  descricao: string
  tipo: 'CASA' | 'APARTAMENTO' | 'COBERTURA' | 'TERRENO' | 'COMERCIAL' | 'RURAL'
  finalidade: 'VENDA' | 'ALUGUEL' | 'TEMPORADA'
  tipo_fk?: string
  finalidade_fk?: string
  proprietario_uuid?: string | null
  preco: number
  precoCondominio?: number
  precoIPTU?: number
  taxaExtra?: number
  
  // Localização
  endereco: {
    endereco: string
    numero: string
    complemento?: string
    bairro: string
    cidade: string
    estado: string
    cep: string
    latitude?: number
    longitude?: number
  }
  
  // Características físicas
  areaTotal: number
  areaConstruida?: number
  quartos: number
  banheiros: number
  suites: number
  vagasGaragem: number
  varanda?: number
  andar?: number
  totalAndares?: number
  
  // Detalhes
  mobiliado: boolean
  aceitaPets: boolean
  aceitaCriancas: boolean
  aceitaFumantes: boolean
  aceita_permuta?: boolean
  aceita_financiamento?: boolean
  
  // Status
  status: 'ATIVO' | 'INATIVO' | 'VENDIDO' | 'ALUGADO'
  destaque: boolean
  dataCadastro: string
  dataAtualizacao: string
  
  // Exclusão lógica
  dataExclusao?: string
  userExclusao?: string
  
  // Relacionamentos
  imagens: Imagem[]
  documentos: ImovelDocumento[]
  amenidades: ImovelAmenidade[]
  proximidades: ImovelProximidadeSimplificada[]
  video?: any // Tipo será definido quando necessário
  
  // Usuário responsável
  corretorId: string
  corretorNome: string
}

// Tipos para imagens
export interface Imagem {
  id: string
  url: string
  nome: string
  descricao?: string
  ordem: number
  principal: boolean
  dataUpload: string
  tamanho: number
  tipo: string
}

export interface ImovelDocumento {
  id: number
  imovelId: number
  tipoDocumentoId: number
  tipoDocumentoDescricao: string
  nomeArquivo: string
  arquivo: string
  tipoMime: string
  tamanhoBytes: number
  dataUpload: string
}


// Tipos para amenidades do imóvel
export interface Amenidade {
  id: string
  nome: string
  categoriaId: string
  categoria: CategoriaAmenidade
  descricao?: string
  icone: string
  ativo: boolean
}

// Interface para o relacionamento imóvel-amenidade
export interface ImovelAmenidade {
  amenidadeId: string
  amenidade: Amenidade
  destaque: boolean
}

// Tipos para proximidades unificados
export interface ProximidadeBase {
  id: string
  nome: string
  descricao?: string
  icone?: string
  ativo: boolean
  ordem: number
  popular: boolean
  created_at: string
  updated_at: string
}

export interface ProximidadeCompleta extends ProximidadeBase {
  tipo: ProximidadeTipo
  categoriaId: string
  categoria: CategoriaProximidade
  distancia: Distancia
  tempoCaminhada: TempoCaminhada
}

// Interface para o relacionamento imóvel-proximidade (versão simplificada)
export interface ImovelProximidadeSimplificada {
  proximidadeId: string
  proximidade: ProximidadeCompleta
  destaque: boolean
}

// Interface para seleção de proximidades (compatível com componentes)
export interface ProximidadeSelecao {
  id: string
  nome: string
  categoria_id?: string
  categoria_nome?: string
  descricao?: string
  icone?: string
  popular: boolean
  ordem: number
  ativo: boolean
  created_at: string
  updated_at: string
}

export enum ProximidadeTipo {
  // COMÉRCIO
  SHOPPING = 'SHOPPING',
  SUPERMERCADO = 'SUPERMERCADO',
  FARMACIA = 'FARMACIA',
  BANCO = 'BANCO',
  
  // ALIMENTAÇÃO
  RESTAURANTE = 'RESTAURANTE',
  PADARIA = 'PADARIA',
  LANCHONETE = 'LANCHONETE',
  
  // SAÚDE
  HOSPITAL = 'HOSPITAL',
  POSTO_SAUDE = 'POSTO_SAUDE',
  CLINICA = 'CLINICA',
  
  // EDUCAÇÃO
  ESCOLA = 'ESCOLA',
  UNIVERSIDADE = 'UNIVERSIDADE',
  CRECHE = 'CRECHE',
  
  // TRANSPORTE
  METRO = 'METRO',
  ONIBUS = 'ONIBUS',
  TAXI = 'TAXI',
  
  // LAZER
  PRAIA = 'PRAIA',
  PARQUE = 'PARQUE',
  CINEMA = 'CINEMA',
  ACADEMIA = 'ACADEMIA',
  
  // SERVIÇOS
  CORREIOS = 'CORREIOS',
  POLICIA = 'POLICIA',
  BOMBEIROS = 'BOMBEIROS'
}

export enum Distancia {
  MUITO_PROXIMO = 'MUITO_PROXIMO',    // 0-500m
  PROXIMO = 'PROXIMO',                 // 500m-1km
  MEDIO = 'MEDIO',                     // 1km-2km
  LONGE = 'LONGE'                      // 2km+
}

export enum TempoCaminhada {
  CINCO_MIN = '5_MIN',                 // 0-5 min
  DEZ_MIN = '10_MIN',                  // 5-10 min
  QUINZE_MIN = '15_MIN',               // 10-15 min
  VINTE_MIN = '20_MIN',                // 15-20 min
  MAIS_VINTE = 'MAIS_20_MIN'           // 20+ min
}

export interface Proximidade {
  id: string
  tipo: ProximidadeTipo
  categoriaId: string
  categoria: CategoriaProximidade
  nome?: string
  distancia: Distancia
  tempoCaminhada: TempoCaminhada
  ativo: boolean
}

// Tipos para formulários
export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthResult {
  success: boolean
  user?: AdminUser
  sessionId?: string
  error?: string
}

export interface Session {
  id: string
  userId: string
  user: AdminUser
  createdAt: string
  expiresAt: string
  userAgent?: string
  ipAddress?: string
}

// Tipos para configurações
export interface EnvironmentConfig {
  NODE_ENV: string
  DATABASE_URL: string
  JWT_SECRET: string
  UPLOAD_DIR: string
  MAX_FILE_SIZE: number
  ALLOWED_FILE_TYPES: string[]
}

// Tipos para estatísticas
export interface DashboardStats {
  totalImoveis: number
  totalProximidades: number
  totalUsuarios: number
  imoveisVenda: number
  imoveisAluguel: number
  imoveisDestaque: number
  imoveisAtivos: number
  recemCadastrados: number
}

// Tipos para filtros e busca
export interface ImovelFilters {
  tipo?: string[]
  finalidade?: string[]
  precoMin?: number
  precoMax?: number
  quartos?: number
  banheiros?: number
  bairro?: string[]
  status?: string[]
  destaque?: boolean
}

export interface ProximidadeFilters {
  tipo?: string[]
  categoria?: string[]
  bairro?: string[]
  distancia?: number
  avaliacao?: number
}

// Tipos para operações CRUD
export interface CreateImovelData {
  titulo: string
  descricao: string
  tipo: Imovel['tipo']
  finalidade: Imovel['finalidade']
  preco: number
  precoCondominio?: number
  precoIPTU?: number
  endereco: Imovel['endereco']
  areaTotal: number
  areaConstruida?: number
  quartos: number
  banheiros: number
  suites: number
  vagasGaragem: number
  andar?: number
  totalAndares?: number
  mobiliado: boolean
  aceitaPets: boolean
  aceitaCriancas: boolean
  aceitaFumantes: boolean
  corretorId: string
}

export interface UpdateImovelData extends Partial<CreateImovelData> {
  id: string
}

// Tipos para resposta de API
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}







