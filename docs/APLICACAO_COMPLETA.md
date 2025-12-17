# 🏢 Net Imobiliária v2.0 - Documentação Completa da Aplicação

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Novas Funcionalidades v2.0](#novas-funcionalidades-v20)
3. [Arquitetura](#arquitetura)
4. [Tecnologias](#tecnologias)
5. [Estrutura de Pastas](#estrutura-de-pastas)
6. [Banco de Dados](#banco-de-dados)
7. [APIs](#apis)
8. [Autenticação e Permissões](#autenticação-e-permissões)
9. [Interfaces](#interfaces)
10. [Funcionalidades](#funcionalidades)
11. [Middlewares](#middlewares)
12. [Regras de Negócio](#regras-de-negócio)
13. [Instruções para IA](#instruções-para-ia)

---

## 🆕 Novas Funcionalidades v2.0

### ✅ **Sistema de Vídeos Completo**
- **Upload de Vídeos**: Step 5 (Mídia) do wizard com validação completa
- **Formatos Suportados**: MP4, AVI, MOV, WebM
- **Validações**: Duração (máx 66s), Tamanho (máx 50MB), Formato
- **Preview Modal**: Visualização em tela cheia com player HTML5
- **Sistema de Rascunho**: Persistência e preview de vídeos em edição
- **Armazenamento**: BYTEA no PostgreSQL com metadados

### ✅ **Interface Modernizada**
- **Novo Layout Dados Gerais**: Campos reorganizados horizontalmente
- **Grid de Imóveis**: Layout responsivo substituindo lista linear
- **Sistema de Filtros**: Filtros avançados com validação
- **Melhorias de UX**: Scroll automático, containers estilizados
- **Validações**: Campos numéricos, máscaras de entrada

### ✅ **Banco de Dados Aprimorado**
- **Nova Tabela**: `imovel_video` para armazenamento de vídeos
- **Campos Adicionais**: varanda, complemento, aceita_permuta, aceita_financiamento
- **Geração de Códigos**: Formato FINALIDADE-TIPO-STATUS-ID
- **Sistema de Auditoria**: created_by, updated_by em todas as tabelas
- **Status Padrão**: Registro automático para novos imóveis

### ✅ **Sistema de Rascunho Aprimorado**
- **Suporte a Vídeos**: Persistência em JSONB com conversão File→Buffer
- **Preview Funcional**: Visualização de vídeos em modo rascunho
- **Confirmação de Mudanças**: Sistema de confirmação antes de salvar
- **Rollback Automático**: Reversão em caso de erro
- **Validação de Dados**: Verificação antes da persistência

---

## 🎯 Visão Geral

### **Objetivo Principal**
Sistema completo de gestão imobiliária para administração de propriedades, incluindo:
- Cadastro e gestão de imóveis
- Sistema de amenidades e proximidades
- Gestão de usuários e permissões
- Upload e gestão de mídia (imagens/documentos/vídeos)
- Sistema de rascunho para edições
- Sistema avançado de filtros e busca
- Visualização moderna em grid

### **Público-Alvo**
- Administradores de imobiliárias
- Agentes imobiliários
- Gestores de propriedades

### **Características Principais**
- ✅ Interface administrativa completa
- ✅ Sistema de autenticação robusto
- ✅ Gestão granular de permissões
- ✅ Upload de mídia com preview
- ✅ Sistema de rascunho para edições
- ✅ Responsive design
- ✅ Validações em tempo real

---

## 🏗️ Arquitetura

### **Padrão Arquitetural**
- **Frontend**: Next.js 14 com App Router
- **Backend**: Next.js API Routes
- **Banco de Dados**: PostgreSQL
- **Autenticação**: JWT + Session
- **Upload**: Base64 para mídia
- **Estilização**: Tailwind CSS

### **Camadas da Aplicação**

```
┌─────────────────────────────────────┐
│           PRESENTATION LAYER        │
│  - React Components                 │
│  - Tailwind CSS                     │
│  - Next.js App Router               │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│           BUSINESS LAYER            │
│  - API Routes (/api/*)              │
│  - Middlewares                      │
│  - Hooks personalizados             │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│           DATA LAYER                │
│  - PostgreSQL Database              │
│  - Database Functions               │
│  - Connection Pool                  │
└─────────────────────────────────────┘
```

---

## 🛠️ Tecnologias

### **Frontend**
- **Next.js 14**: Framework React com App Router
- **React 18**: Biblioteca de interface
- **TypeScript**: Tipagem estática
- **Tailwind CSS**: Framework CSS utilitário
- **Heroicons**: Biblioteca de ícones

### **Backend**
- **Next.js API Routes**: Endpoints da API
- **PostgreSQL**: Banco de dados relacional
- **node-postgres**: Driver PostgreSQL para Node.js
- **JWT**: Autenticação por tokens

### **Ferramentas de Desenvolvimento**
- **ESLint**: Linter JavaScript/TypeScript
- **Prettier**: Formatador de código
- **TypeScript**: Verificação de tipos

---

## 📁 Estrutura de Pastas

```
src/
├── app/                          # Next.js App Router
│   ├── admin/                   # Área administrativa
│   │   ├── layout.tsx           # Layout admin (AuthProvider + AdminLayoutContent)
│   │   ├── AdminLayoutContent.tsx # Header + Sidebar + Main
│   │   ├── login/               # Login admin
│   │   ├── imoveis/             # CRUD imóveis
│   │   ├── amenidades/          # CRUD amenidades
│   │   ├── proximidades/        # CRUD proximidades
│   │   ├── tipos-imoveis/       # CRUD tipos de imóveis
│   │   ├── finalidades/         # CRUD finalidades
│   │   ├── status-imovel/       # CRUD status
│   │   ├── tipos-documentos/    # CRUD tipos de documentos
│   │   └── usuarios/            # CRUD usuários
│   ├── (with-header)/           # Páginas públicas com header/footer
│   ├── api/                     # API Routes
│   │   └── admin/               # Endpoints administrativos
│   └── layout.tsx               # Layout raiz
├── components/                   # Componentes React
│   ├── admin/                   # Componentes administrativos
│   │   ├── ImovelWizard.tsx     # Wizard de criação/edição
│   │   ├── AdminHeader.tsx      # Header administrativo
│   │   ├── AdminSidebar.tsx     # Sidebar de navegação
│   │   ├── wizard/              # Componentes do wizard
│   │   └── PermissionGuard.tsx  # Guard de permissões
│   └── Header.tsx               # Header público
├── hooks/                       # Hooks personalizados
│   ├── useAuth.ts              # Hook de autenticação
│   └── useRascunho.ts          # Hook de rascunho
├── lib/                        # Utilitários e configurações
│   ├── database/               # Funções de banco
│   ├── middleware/             # Middlewares
│   ├── types/                  # Tipos TypeScript
│   └── utils/                  # Funções utilitárias
└── middleware.ts               # Middleware Next.js
```

---

## 🗄️ Banco de Dados

### **Estrutura Principal**

#### **Tabelas de Usuários e Autenticação**
```sql
-- Usuários do sistema
users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  telefone VARCHAR(20),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

-- Perfis de usuário
perfis (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(50) UNIQUE NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

-- Relacionamento usuários-perfis
user_perfis (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  perfil_id INTEGER REFERENCES perfis(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, perfil_id)
)

-- Permissões
permissoes (
  id SERIAL PRIMARY KEY,
  recurso VARCHAR(50) NOT NULL,
  acao VARCHAR(20) NOT NULL,
  descricao TEXT,
  UNIQUE(recurso, acao)
)

-- Relacionamento perfis-permissões
perfil_permissoes (
  perfil_id INTEGER REFERENCES perfis(id) ON DELETE CASCADE,
  permissao_id INTEGER REFERENCES permissoes(id) ON DELETE CASCADE,
  PRIMARY KEY (perfil_id, permissao_id)
)
```

#### **Tabelas de Imóveis**
```sql
-- Imóveis principais
imoveis (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  descricao TEXT,
  endereco TEXT NOT NULL,
  numero VARCHAR(10),
  complemento VARCHAR(100),
  bairro VARCHAR(100) NOT NULL,
  cidade_fk INTEGER REFERENCES municipios(id),
  estado_fk INTEGER REFERENCES estados(id),
  cep VARCHAR(10),
  preco DECIMAL(12,2),
  preco_condominio DECIMAL(12,2),
  preco_iptu DECIMAL(12,2),
  taxa_extra DECIMAL(12,2),
  area_total INTEGER,
  area_construida INTEGER,
  quartos INTEGER,
  banheiros INTEGER,
  suites INTEGER,
  varanda INTEGER,
  vagas_garagem INTEGER,
  andar INTEGER,
  total_andares INTEGER,
  mobiliado BOOLEAN DEFAULT false,
  aceita_permuta BOOLEAN DEFAULT false,
  aceita_financiamento BOOLEAN DEFAULT false,
  tipo_fk INTEGER REFERENCES tipos_imovel(id),
  finalidade_fk INTEGER REFERENCES finalidades_imovel(id),
  status_fk INTEGER REFERENCES status_imovel(id) DEFAULT 1,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

-- Sistema de Rascunho
imovel_rascunho (
  id SERIAL PRIMARY KEY,
  imovel_id INTEGER REFERENCES imoveis(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT true,
  alteracoes JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

#### **Sistema de Amenidades**
```sql
-- Categorias de amenidades
categorias_amenidades (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) UNIQUE NOT NULL,
  descricao TEXT,
  icone VARCHAR(50),
  cor VARCHAR(7) DEFAULT '#3B82F6',
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

-- Amenidades
amenidades (
  id SERIAL PRIMARY KEY,
  categoria_id INTEGER REFERENCES categorias_amenidades(id) ON DELETE SET NULL,
  nome VARCHAR(150) NOT NULL,
  descricao TEXT,
  icone VARCHAR(50),
  popular BOOLEAN DEFAULT false,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(categoria_id, nome)
)

-- Relacionamento imóveis-amenidades
imovel_amenidades (
  id SERIAL PRIMARY KEY,
  imovel_id INTEGER REFERENCES imoveis(id) ON DELETE CASCADE,
  amenidade_id INTEGER REFERENCES amenidades(id) ON DELETE CASCADE,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(imovel_id, amenidade_id)
)
```

#### **Sistema de Proximidades**
```sql
-- Categorias de proximidades
categorias_proximidades (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) UNIQUE NOT NULL,
  descricao TEXT,
  icone VARCHAR(50),
  cor VARCHAR(7) DEFAULT '#3B82F6',
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

-- Proximidades
proximidades (
  id SERIAL PRIMARY KEY,
  categoria_id INTEGER REFERENCES categorias_proximidades(id) ON DELETE SET NULL,
  nome VARCHAR(150) NOT NULL,
  descricao TEXT,
  icone VARCHAR(50),
  popular BOOLEAN DEFAULT false,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(categoria_id, nome)
)

-- Relacionamento imóveis-proximidades
imovel_proximidades (
  id SERIAL PRIMARY KEY,
  imovel_id INTEGER REFERENCES imoveis(id) ON DELETE CASCADE,
  proximidade_id INTEGER REFERENCES proximidades(id) ON DELETE CASCADE,
  distancia_metros INTEGER,
  tempo_caminhada VARCHAR(50),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(imovel_id, proximidade_id)
)
```

#### **Sistema de Mídia**
```sql
-- Imagens dos imóveis
imovel_imagens (
  id SERIAL PRIMARY KEY,
  imovel_id INTEGER REFERENCES imoveis(id) ON DELETE CASCADE,
  imagem BYTEA NOT NULL,
  tipo_mime VARCHAR(100) NOT NULL,
  tamanho_bytes BIGINT NOT NULL,
  ordem INTEGER DEFAULT 0,
  principal BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

-- Tipos de documentos
tipos_documento (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) UNIQUE NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

-- Documentos dos imóveis
imovel_documentos (
  id SERIAL PRIMARY KEY,
  id_tipo_documento INTEGER REFERENCES tipos_documento(id),
  id_imovel INTEGER REFERENCES imoveis(id) ON DELETE CASCADE,
  documento BYTEA NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  tipo_mime VARCHAR(100) NOT NULL,
  tamanho_bytes BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(id_tipo_documento, id_imovel)
)
```

---

## 🔌 APIs

### **Estrutura de Endpoints**

#### **Autenticação**
```
POST /api/admin/auth/login
POST /api/admin/auth/logout
GET  /api/admin/auth/me
```

#### **Usuários**
```
GET    /api/admin/usuarios
POST   /api/admin/usuarios
GET    /api/admin/usuarios/[id]
PUT    /api/admin/usuarios/[id]
DELETE /api/admin/usuarios/[id]
```

#### **Imóveis**
```
GET    /api/admin/imoveis
POST   /api/admin/imoveis
GET    /api/admin/imoveis/[id]
PUT    /api/admin/imoveis/[id]
DELETE /api/admin/imoveis/[id]

# Sub-recursos
GET    /api/admin/imoveis/[id]/amenidades
PUT    /api/admin/imoveis/[id]/amenidades
GET    /api/admin/imoveis/[id]/proximidades
PUT    /api/admin/imoveis/[id]/proximidades
GET    /api/admin/imoveis/[id]/imagens
POST   /api/admin/imoveis/[id]/imagens
DELETE /api/admin/imoveis/[id]/imagens/[imageId]
GET    /api/admin/imoveis/[id]/documentos
POST   /api/admin/imoveis/[id]/documentos
DELETE /api/admin/imoveis/[id]/documentos/[docId]

# Sistema de Rascunho
GET    /api/admin/imoveis/[id]/rascunho
POST   /api/admin/imoveis/[id]/rascunho
PUT    /api/admin/imoveis/[id]/rascunho
DELETE /api/admin/imoveis/[id]/rascunho
POST   /api/admin/imoveis/[id]/rascunho/confirmar
```

#### **Amenidades**
```
GET    /api/admin/categorias-amenidades
POST   /api/admin/categorias-amenidades
GET    /api/admin/categorias-amenidades/[id]
PUT    /api/admin/categorias-amenidades/[id]
DELETE /api/admin/categorias-amenidades/[id]

GET    /api/admin/amenidades
POST   /api/admin/amenidades
GET    /api/admin/amenidades/[id]
PUT    /api/admin/amenidades/[id]
DELETE /api/admin/amenidades/[id]
```

#### **Proximidades**
```
GET    /api/admin/categorias-proximidades
POST   /api/admin/categorias-proximidades
GET    /api/admin/categorias-proximidades/[id]
PUT    /api/admin/categorias-proximidades/[id]
DELETE /api/admin/categorias-proximidades/[id]

GET    /api/admin/proximidades
POST   /api/admin/proximidades
GET    /api/admin/proximidades/[id]
PUT    /api/admin/proximidades/[id]
DELETE /api/admin/proximidades/[id]
```

### **Padrões de Resposta**

#### **Sucesso**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operação realizada com sucesso"
}
```

#### **Erro**
```json
{
  "success": false,
  "error": "Mensagem de erro",
  "details": [ "Detalhes adicionais" ]
}
```

---

## 🔐 Autenticação e Permissões

### **Sistema de Autenticação**
- **JWT Tokens**: Para autenticação de sessão
- **Session Storage**: Para persistência no frontend
- **Middleware**: Verificação automática de autenticação
- **Logout**: Limpeza de tokens e redirecionamento

### **Sistema de Permissões**

#### **Recursos Protegidos**
- `imoveis`: CRUD de imóveis
- `amenidades`: CRUD de amenidades
- `proximidades`: CRUD de proximidades
- `tipos-imoveis`: CRUD de tipos
- `finalidades`: CRUD de finalidades
- `status-imovel`: CRUD de status
- `tipos-documentos`: CRUD de tipos de documentos
- `usuarios`: CRUD de usuários

#### **Ações Disponíveis**
- `READ`: Visualizar/Listar
- `WRITE`: Criar/Editar
- `DELETE`: Excluir
- `ADMIN`: Acesso administrativo completo

#### **Componente PermissionGuard**
```typescript
<PermissionGuard resource="imoveis" action="WRITE">
  {children}
</PermissionGuard>
```

---

## 🎨 Interfaces

### **Layout Administrativo**

#### **AdminHeader**
- Logo da aplicação
- Menu hambúrguer (mobile)
- Informações do usuário
- Botão de logout
- Notificações

#### **AdminSidebar**
- Navegação principal
- Menu colapsível
- Ícones por seção
- Indicadores de permissão
- Responsive design

#### **AdminLayoutContent**
- Container principal
- Grid layout (sidebar + main)
- Gerenciamento de estado do sidebar
- Integração com autenticação

### **Componentes Principais**

#### **ImovelWizard**
- Wizard de 5 etapas para criação/edição
- Validação em tempo real
- Navegação entre etapas
- Salvamento automático de rascunho

#### **MediaStep**
- Upload de imagens com preview
- Upload de documentos
- Sistema de rascunho
- Seleção de imagem principal

#### **PermissionGuard**
- Verificação de permissões
- Renderização condicional
- Fallback para usuários sem permissão

### **Design System**

#### **Cores**
- **Primária**: Blue-600 (#2563eb)
- **Sucesso**: Green-600 (#16a34a)
- **Erro**: Red-600 (#dc2626)
- **Aviso**: Yellow-600 (#ca8a04)
- **Neutro**: Gray-900 (#111827)

#### **Tipografia**
- **Títulos**: text-2xl font-bold
- **Subtítulos**: text-lg font-medium
- **Corpo**: text-sm
- **Pequeno**: text-xs

#### **Espaçamento**
- **Container**: max-w-7xl mx-auto
- **Padding**: p-4, p-6, p-8
- **Margin**: mb-4, mb-6, mb-8
- **Gap**: gap-4, gap-6

---

## ⚙️ Funcionalidades

### **Gestão de Imóveis**

#### **Criação de Imóveis**
1. **Etapa 1 - Localização**
   - Endereço completo
   - CEP com validação
   - Estado/Município (dropdowns dinâmicos)
   - Bairro

2. **Etapa 2 - Dados Gerais**
   - Título e descrição
   - Tipo de imóvel (dropdown)
   - Finalidade (dropdown)
   - Valores (preço, condomínio, IPTU, taxa extra)
   - Áreas (total, construída)
   - Características (quartos, banheiros, suítes, varanda)
   - Vagas de garagem
   - Andar/Total de andares
   - Opções (mobiliado, aceita permuta, aceita financiamento)

3. **Etapa 3 - Amenidades**
   - Seleção por categoria
   - Botão "Marcar todas" por categoria
   - Busca de amenidades
   - Contador de selecionadas

4. **Etapa 4 - Proximidades**
   - Seleção por categoria
   - Campos de distância e tempo de caminhada
   - Observações por proximidade
   - Botão "Marcar todas" por categoria

5. **Etapa 5 - Mídia**
   - Upload de imagens (até 10)
   - Seleção de imagem principal
   - Upload de documentos por tipo
   - Preview de mídia
   - Sistema de rascunho

#### **Edição de Imóveis**
- Carregamento de dados existentes
- Sistema de rascunho para mudanças
- Confirmação de alterações
- Cancelamento sem perda de dados

#### **Listagem de Imóveis**
- Filtros avançados (código, bairro, estado, cidade, tipo, finalidade, status)
- Paginação
- Informações em duas linhas por imóvel
- Botões de ação (editar, excluir)

### **Sistema de Amenidades**

#### **Categorias de Amenidades**
- CRUD completo
- Ícones personalizados
- Cores por categoria
- Ordenação

#### **Amenidades**
- CRUD completo
- Associação a categorias
- Status ativo/inativo
- Ordenação dentro da categoria

### **Sistema de Proximidades**

#### **Categorias de Proximidades**
- CRUD completo
- Ícones personalizados
- Cores por categoria
- Ordenação

#### **Proximidades**
- CRUD completo
- Associação a categorias
- Status ativo/inativo
- Ordenação dentro da categoria

### **Sistema de Mídia**

#### **Imagens**
- Upload com preview
- Redimensionamento automático
- Suporte a JPG, PNG, GIF
- Seleção de imagem principal
- Ordenação por posição

#### **Documentos**
- Upload por tipo
- Suporte a PDF, DOCX, planilhas
- Preview de documentos
- Associação a tipos de documentos

### **Sistema de Rascunho**

#### **Funcionalidades**
- Rascunho automático ao editar
- Alterações não são salvas até confirmação
- Possibilidade de cancelar alterações
- Status visual de rascunho ativo
- Confirmação de alterações

#### **Tipos de Alterações Rastreadas**
- Remoção de imagens
- Remoção de documentos
- Alteração de imagem principal
- Outras alterações futuras

---

## 🔧 Middlewares

### **Middleware de Autenticação**
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  // Verificação de token JWT
  // Redirecionamento para login se não autenticado
  // Proteção de rotas administrativas
}
```

### **Middleware de Permissões**
```typescript
// checkApiPermission
export async function checkApiPermission(request: NextRequest) {
  // Verificação de permissões por recurso/ação
  // Retorno de erro 403 se sem permissão
  // Log de auditoria
}
```

### **Middleware de Auditoria**
```typescript
// logAuditEvent
export async function logAuditEvent(event: AuditEvent) {
  // Log de ações do usuário
  // Rastreamento de alterações
  // Histórico de auditoria
}
```

---

## 📋 Regras de Negócio

### **Imóveis**
1. **Código Único**: Gerado automaticamente no formato `FINALIDADE-TIPO-STATUS-ID`
2. **Status Padrão**: Todos os imóveis iniciam com status "Ativo" (ID: 1)
3. **Campos Obrigatórios**: Endereço, bairro, tipo, finalidade
4. **Validações**: CEP, valores numéricos, áreas inteiras
5. **Mídia**: Máximo 10 imagens por imóvel

### **Amenidades e Proximidades**
1. **Categorização Obrigatória**: Todas devem pertencer a uma categoria
2. **Nomes Únicos**: Dentro da mesma categoria
3. **Status Ativo**: Por padrão, novos itens são ativos
4. **Ordenação**: Por ordem definida na categoria

### **Usuários**
1. **Usernames Únicos**: Não podem ser duplicados
2. **Emails Únicos**: Não podem ser duplicados
3. **Perfis Obrigatórios**: Todo usuário deve ter pelo menos um perfil
4. **Permissões Herdadas**: Do perfil do usuário

### **Sistema de Rascunho**
1. **Um Rascunho por Imóvel**: Apenas um rascunho ativo por vez
2. **Confirmação Obrigatória**: Alterações só são salvas após confirmação
3. **Cancelamento**: Possível descartar alterações
4. **Persistência**: Rascunho persiste entre sessões

---

## 🤖 Instruções para IA

### **⚠️ REGRAS CRÍTICAS - LEIA PRIMEIRO**

#### **🚫 NUNCA FAÇA SEM AUTORIZAÇÃO:**
1. **Alterar estrutura de tabelas existentes**
2. **Modificar APIs já funcionais**
3. **Alterar interfaces já implementadas**
4. **Remover funcionalidades existentes**
5. **Alterar regras de negócio estabelecidas**
6. **Modificar sistema de autenticação**
7. **Alterar sistema de permissões**

#### **✅ SEMPRE PERGUNTE ANTES DE:**
1. **Criar novas tabelas**
2. **Adicionar novos campos em tabelas existentes**
3. **Modificar endpoints de API**
4. **Alterar componentes React**
5. **Mudar validações**
6. **Alterar fluxos de trabalho**
7. **Modificar estilos ou layout**

### **📋 Processo de Desenvolvimento**

#### **1. Análise de Requisitos**
- Sempre analise o pedido do usuário
- Identifique impactos em funcionalidades existentes
- Proponha soluções que não quebrem o existente
- Documente mudanças propostas

#### **2. Validação de Mudanças**
- Verifique se a mudança afeta outras funcionalidades
- Confirme se não quebra APIs existentes
- Teste mentalmente o impacto em componentes relacionados
- Solicite aprovação explícita antes de implementar

#### **3. Implementação Segura**
- Faça mudanças incrementais
- Mantenha compatibilidade com versões anteriores
- Adicione logs para debug
- Preserve funcionalidades existentes

#### **4. Documentação**
- Atualize esta documentação com mudanças
- Documente novos endpoints
- Atualize regras de negócio
- Mantenha histórico de alterações

### **🎯 Prioridades de Desenvolvimento**

#### **Alta Prioridade (Crítico)**
- Correção de bugs existentes
- Melhorias de performance
- Correções de segurança
- Problemas de UX críticos

#### **Média Prioridade (Importante)**
- Novas funcionalidades solicitadas
- Melhorias de interface
- Otimizações de código
- Adição de validações

#### **Baixa Prioridade (Desejável)**
- Refatorações de código
- Melhorias de documentação
- Otimizações de banco
- Novos recursos experimentais

### **🔍 Checklist de Validação**

Antes de implementar qualquer mudança, verifique:

- [ ] A mudança foi explicitamente solicitada pelo usuário?
- [ ] A mudança não quebra funcionalidades existentes?
- [ ] A mudança não afeta outras partes do sistema?
- [ ] A mudança está alinhada com a arquitetura existente?
- [ ] A mudança foi aprovada pelo usuário?
- [ ] A documentação será atualizada?

### **📞 Protocolo de Comunicação**

#### **Para Mudanças Simples:**
"Vou implementar [descrição da mudança] conforme solicitado. Esta mudança [impacto/benefício]."

#### **Para Mudanças Complexas:**
"Analisei sua solicitação de [descrição]. Esta mudança pode impactar [áreas afetadas]. Proponho [solução] que [benefícios]. Posso prosseguir?"

#### **Para Mudanças que Podem Quebrar:**
"⚠️ ATENÇÃO: Sua solicitação de [descrição] pode afetar [funcionalidades existentes]. Recomendo [alternativa mais segura]. Deseja que eu prossiga mesmo assim?"

### **🛡️ Proteções Implementadas**

#### **Backup Automático**
- Sempre faça backup antes de mudanças estruturais
- Mantenha versões anteriores de arquivos críticos
- Documente rollback procedures

#### **Validação de Dados**
- Mantenha todas as validações existentes
- Adicione novas validações sem remover as antigas
- Teste validações em cenários edge cases

#### **Compatibilidade**
- APIs devem manter compatibilidade com versões anteriores
- Campos opcionais devem ter valores padrão
- Migrations devem ser reversíveis

---

## 📊 Métricas e Monitoramento

### **Logs de Auditoria**
- Todas as ações de usuário são logadas
- Alterações em dados críticos são rastreadas
- Tentativas de acesso não autorizado são registradas

### **Performance**
- Queries de banco otimizadas
- Lazy loading implementado
- Debounce em operações frequentes

### **Segurança**
- Validação de entrada em todas as APIs
- Sanitização de dados
- Proteção contra SQL injection
- Autenticação JWT robusta

---

## 🚀 Deploy e Manutenção

### **Ambiente de Desenvolvimento**
- Next.js dev server na porta 3002
- PostgreSQL local
- Hot reload ativo
- Logs detalhados

### **Ambiente de Produção**
- Build otimizado
- Variáveis de ambiente configuradas
- Banco de dados em produção
- Monitoramento ativo

### **Backup e Recuperação**
- Backup diário do banco de dados
- Versionamento de código
- Rollback procedures documentados

---

## 📞 Suporte e Contato

### **Documentação Técnica**
- Esta documentação deve ser sempre atualizada
- Novos desenvolvedores devem ler completamente
- Mudanças devem ser documentadas imediatamente

### **Protocolo de Bugs**
1. Identificar o problema
2. Analisar impacto
3. Propor solução
4. Implementar correção
5. Testar solução
6. Documentar correção

---

**🎯 OBJETIVO FINAL: Manter um sistema robusto, seguro e escalável, preservando todas as funcionalidades existentes enquanto adiciona novas capacidades de forma controlada e documentada.**
