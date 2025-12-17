# 🎥 PLANEJAMENTO DETALHADO - FUNCIONALIDADE DE VÍDEOS
## Step 5 de Mídias - Net Imobiliária

---

## 📋 **ÍNDICE**
1. [Análise de Requisitos](#análise-de-requisitos)
2. [Estrutura de Dados](#estrutura-de-dados)
3. [APIs e Endpoints](#apis-e-endpoints)
4. [Interface de Usuário](#interface-de-usuário)
5. [Sistema de Rascunho](#sistema-de-rascunho)
6. [Validações e Segurança](#validações-e-segurança)
7. [Etapas de Implementação](#etapas-de-implementação)
8. [Riscos e Mitigações](#riscos-e-mitigações)
9. [Garantias de Preservação](#garantias-de-preservação)
10. [Testes e Validação](#testes-e-validação)

---

## 🎯 **ANÁLISE DE REQUISITOS**

### **Requisitos Funcionais**
1. ✅ **Gestão de vídeos** adicional às imagens e documentos
2. ✅ **Tabela imovel_video** (1 vídeo único por imóvel)
3. ✅ **Upload inteligente** com suporte a principais formatos
4. ✅ **Limitação de duração** máxima de 1 minuto
5. ✅ **Container dedicado** entre imagens e documentos
6. ✅ **Funcionalidades completas** (API, rascunho, remoção, update)
7. ✅ **Preview em popup** grande para exibição

### **Requisitos Não-Funcionais**
- 🚀 **Performance**: Não degradar sistema existente
- 🛡️ **Segurança**: Validações robustas de arquivo
- 📱 **UX**: Interface intuitiva e responsiva
- 🔒 **Compatibilidade**: Funcionar com sistema de rascunho
- 📊 **Escalabilidade**: Suportar crescimento futuro

---

## 🗄️ **ESTRUTURA DE DADOS**

### **Tabela imovel_video**
```sql
-- Nova tabela para vídeos dos imóveis
CREATE TABLE IF NOT EXISTS imovel_video (
    id SERIAL PRIMARY KEY,
    imovel_id INTEGER NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
    video BYTEA NOT NULL,                    -- Conteúdo do vídeo
    nome_arquivo VARCHAR(255) NOT NULL,      -- Nome original do arquivo
    tipo_mime VARCHAR(100) NOT NULL,         -- Tipo MIME (video/mp4, etc.)
    tamanho_bytes BIGINT NOT NULL,           -- Tamanho em bytes
    duracao_segundos INTEGER NOT NULL,       -- Duração em segundos (máx 60)
    resolucao VARCHAR(20),                   -- Resolução (1920x1080, etc.)
    formato VARCHAR(10) NOT NULL,            -- Formato (mp4, webm, etc.)
    ativo BOOLEAN DEFAULT true,              -- Status ativo/inativo
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: apenas 1 vídeo por imóvel
    CONSTRAINT unique_video_per_imovel UNIQUE (imovel_id)
);

-- Índices para performance
CREATE INDEX idx_imovel_video_imovel_id ON imovel_video(imovel_id);
CREATE INDEX idx_imovel_video_ativo ON imovel_video(ativo);
CREATE INDEX idx_imovel_video_tamanho ON imovel_video(tamanho_bytes);
```

### **Formato de Dados**
```typescript
interface ImovelVideo {
  id: number
  imovel_id: number
  video: Buffer
  nome_arquivo: string
  tipo_mime: string
  tamanho_bytes: number
  duracao_segundos: number
  resolucao?: string
  formato: string
  ativo: boolean
  created_at: string
  updated_at: string
}

interface VideoUploadData {
  arquivo: File
  nomeArquivo: string
  tipoMime: string
  tamanhoBytes: number
  duracaoSegundos: number
  resolucao?: string
  formato: string
}
```

---

## 🔌 **APIS E ENDPOINTS**

### **Novos Endpoints**
```typescript
// GET /api/admin/imoveis/[id]/video
// - Buscar vídeo do imóvel
// - Retornar metadados ou conteúdo

// POST /api/admin/imoveis/[id]/video
// - Upload de novo vídeo
// - Substituir vídeo existente
// - Validações de formato e duração

// DELETE /api/admin/imoveis/[id]/video
// - Remover vídeo do imóvel
// - Integração com sistema de rascunho

// GET /api/admin/imoveis/[id]/video/preview
// - Gerar URL de preview
// - Stream do vídeo
```

### **Modificações em Endpoints Existentes**
```typescript
// GET /api/admin/imoveis/[id] - ADICIONAR
// - Incluir dados do vídeo na resposta
// - Manter compatibilidade com versão anterior

// POST /api/admin/imoveis - ADICIONAR
// - Processar vídeo na criação
// - Validações de vídeo

// PUT /api/admin/imoveis/[id] - ADICIONAR
// - Processar vídeo na edição
// - Integração com sistema de rascunho
```

### **Sistema de Rascunho - Modificações**
```typescript
// src/app/api/admin/imoveis/[id]/rascunho/route.ts - ADICIONAR
interface RascunhoAlteracoes {
  // ... campos existentes
  video?: {
    adicionado?: VideoUploadData
    removido?: boolean
  }
}

// src/app/api/admin/imoveis/[id]/rascunho/confirmar/route.ts - ADICIONAR
// - Processar alterações de vídeo
// - Salvar/remover vídeo conforme rascunho
```

---

## 🎨 **INTERFACE DE USUÁRIO**

### **Container de Vídeo no MediaStep**
```typescript
// Posição: Entre container de imagens e container de documentos
<div className="bg-white border border-gray-400 rounded-lg p-6 shadow-sm mb-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-4">
    Vídeo do Imóvel
  </h3>
  
  {/* Área de upload/replace */}
  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
    {/* Conteúdo condicional baseado no estado */}
  </div>
  
  {/* Preview do vídeo atual */}
  {/* Botões de ação */}
</div>
```

### **Estados da Interface**
1. **Sem vídeo**: Área de upload drag & drop
2. **Com vídeo**: Preview + botões (trocar/remover/preview)
3. **Uploading**: Progress bar + cancelar
4. **Editando**: Sistema de rascunho ativo

### **Componente VideoPreview**
```typescript
interface VideoPreviewProps {
  video: ImovelVideo | null
  onReplace: () => void
  onRemove: () => void
  onPreview: () => void
  mode: 'create' | 'edit'
  rascunho?: any
}
```

### **Popup de Preview**
```typescript
// Modal grande para exibição do vídeo
<div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
  <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full mx-4">
    {/* Header com título e botão fechar */}
    {/* Player de vídeo em tamanho grande */}
    {/* Controles de reprodução */}
  </div>
</div>
```

---

## 📝 **SISTEMA DE RASCUNHO**

### **Integração com useRascunho**
```typescript
// src/hooks/useRascunho.ts - MODIFICAÇÃO
interface RascunhoAlteracoes {
  // ... campos existentes
  video: {
    adicionado?: VideoUploadData
    removido?: boolean
  }
}

// Novas funções
const registrarVideoRascunho = async (
  acao: 'adicionar' | 'remover',
  videoData?: VideoUploadData
) => {
  // Registrar alteração no rascunho
}
```

### **Fluxo de Rascunho para Vídeos**
1. **Upload**: Registrar como "adicionado" no rascunho
2. **Remoção**: Registrar como "removido" no rascunho
3. **Confirmação**: Aplicar alterações na tabela
4. **Cancelamento**: Descartar alterações

### **Validações de Rascunho**
```typescript
// Verificar se vídeo pode ser adicionado/removido
// Validar tamanho e duração
// Manter consistência com dados existentes
```

---

## 🛡️ **VALIDAÇÕES E SEGURANÇA**

### **Validações de Arquivo**
```typescript
const VIDEO_VALIDATIONS = {
  // Formatos aceitos
  FORMATOS_ACEITOS: ['video/mp4', 'video/webm', 'video/ogg'],
  EXTENSOES_ACEITAS: ['.mp4', '.webm', '.ogg', '.mov'],
  
  // Limites
  TAMANHO_MAXIMO: 50 * 1024 * 1024, // 50MB
  DURACAO_MAXIMA: 60, // 60 segundos
  RESOLUCAO_MAXIMA: { width: 1920, height: 1080 },
  
  // Validações de segurança
  TIPOS_MIME_PERMITIDOS: ['video/mp4', 'video/webm', 'video/ogg'],
  HEADERS_VALIDOS: ['ftyp', 'moov', 'mdat'] // Headers de vídeo válidos
}

// Função de validação
async function validateVideo(file: File): Promise<ValidationResult> {
  // 1. Validar tipo MIME
  // 2. Validar extensão
  // 3. Validar tamanho
  // 4. Validar duração (usando ffprobe ou similar)
  // 5. Validar headers do arquivo
  // 6. Verificar se não é vídeo malicioso
}
```

### **Sanitização de Dados**
```typescript
// Sanitizar nome do arquivo
// Validar metadados
// Verificar integridade do arquivo
// Proteger contra uploads maliciosos
```

### **Rate Limiting**
```typescript
// Limitar uploads de vídeo por usuário
// Limitar tamanho total de vídeos
// Implementar throttling para uploads grandes
```

---

## 🚀 **ETAPAS DE IMPLEMENTAÇÃO**

### **FASE 1: ESTRUTURA BASE (Semana 1)**
```
Etapa 1.1: Criação da Tabela
├── Criar tabela imovel_video
├── Adicionar índices
├── Criar constraints
└── Testes de estrutura

Etapa 1.2: Tipos TypeScript
├── Interface ImovelVideo
├── Interface VideoUploadData
├── Tipos de validação
└── Integração com tipos existentes

Etapa 1.3: Funções de Banco
├── createImovelVideo()
├── findImovelVideo()
├── updateImovelVideo()
├── deleteImovelVideo()
└── Testes unitários
```

### **FASE 2: APIs (Semana 2)**
```
Etapa 2.1: Endpoints Básicos
├── GET /api/admin/imoveis/[id]/video
├── POST /api/admin/imoveis/[id]/video
├── DELETE /api/admin/imoveis/[id]/video
└── Testes de API

Etapa 2.2: Integração com APIs Existentes
├── Modificar GET /api/admin/imoveis/[id]
├── Modificar POST /api/admin/imoveis
├── Modificar PUT /api/admin/imoveis/[id]
└── Manter compatibilidade

Etapa 2.3: Validações de API
├── Validação de formato
├── Validação de duração
├── Validação de tamanho
└── Tratamento de erros
```

### **FASE 3: INTERFACE (Semana 3)**
```
Etapa 3.1: Componente Base
├── VideoUpload component
├── VideoPreview component
├── VideoModal component
└── Integração com MediaStep

Etapa 3.2: Container no MediaStep
├── Adicionar container de vídeo
├── Posicionar entre imagens e documentos
├── Implementar estados da interface
└── Estilização consistente

Etapa 3.3: Funcionalidades de UX
├── Drag & drop para upload
├── Preview do vídeo atual
├── Modal de preview grande
└── Feedback visual
```

### **FASE 4: SISTEMA DE RASCUNHO (Semana 4)**
```
Etapa 4.1: Integração com Rascunho
├── Modificar useRascunho hook
├── Adicionar suporte a vídeos
├── Implementar registro de alterações
└── Testes de rascunho

Etapa 4.2: Confirmação de Rascunho
├── Modificar API de confirmação
├── Processar alterações de vídeo
├── Salvar/remover conforme rascunho
└── Rollback em caso de erro

Etapa 4.3: Validações de Rascunho
├── Verificar consistência
├── Validar antes de confirmar
├── Tratamento de erros
└── Logs de auditoria
```

### **FASE 5: VALIDAÇÕES E SEGURANÇA (Semana 5)**
```
Etapa 5.1: Validações Robustas
├── Implementar validação de duração
├── Validação de formato e tamanho
├── Verificação de headers
└── Testes de segurança

Etapa 5.2: Otimizações
├── Compressão de vídeo (se necessário)
├── Geração de thumbnail
├── Otimização de performance
└── Monitoramento de recursos

Etapa 5.3: Testes Finais
├── Testes de integração
├── Testes de performance
├── Testes de segurança
└── Validação completa
```

---

## ⚠️ **RISCOS E MITIGAÇÕES**

### **Riscos Técnicos**
```
RISCO: Degradação de performance com vídeos grandes
MITIGAÇÃO: Limitação rigorosa de tamanho (50MB) e duração (1min)

RISCO: Sobrecarga do banco com BYTEA
MITIGAÇÃO: Monitoramento de crescimento e planejamento de migração futura

RISCO: Incompatibilidade com sistema de rascunho
MITIGAÇÃO: Testes extensivos e implementação incremental

RISCO: Problemas de validação de vídeo
MITIGAÇÃO: Múltiplas camadas de validação e fallbacks
```

### **Riscos de UX**
```
RISCO: Interface confusa com nova funcionalidade
MITIGAÇÃO: Design consistente e testes de usabilidade

RISCO: Uploads lentos afetarem experiência
MITIGAÇÃO: Feedback visual e possibilidade de cancelamento

RISCO: Vídeos não carregarem corretamente
MITIGAÇÃO: Fallbacks e mensagens de erro claras
```

### **Riscos de Segurança**
```
RISCO: Upload de vídeos maliciosos
MITIGAÇÃO: Validação rigorosa de headers e tipos MIME

RISCO: Sobrecarga de recursos
MITIGAÇÃO: Rate limiting e monitoramento

RISCO: Vazamento de dados
MITIGAÇÃO: Validação de permissões e auditoria
```

---

## 🛡️ **GARANTIAS DE PRESERVAÇÃO**

### **Funcionalidades que NÃO serão alteradas**
- ✅ **Sistema de imagens** - Mantido integralmente
- ✅ **Sistema de documentos** - Mantido integralmente
- ✅ **APIs existentes** - Compatibilidade mantida
- ✅ **Sistema de rascunho** - Extensão, não modificação
- ✅ **Interface existente** - Adição, não alteração
- ✅ **Validações existentes** - Mantidas e estendidas
- ✅ **Banco de dados** - Apenas nova tabela

### **Compatibilidade Garantida**
```typescript
// APIs existentes continuam funcionando
GET /api/admin/imoveis/[id] // Adiciona campo 'video', não remove nada
POST /api/admin/imoveis     // Processa vídeo se presente, ignora se ausente
PUT /api/admin/imoveis/[id] // Mesmo comportamento

// Componentes existentes não são modificados
MediaStep // Apenas adição de novo container
ImovelWizard // Nenhuma modificação
```

### **Rollback Plan**
```
1. Remover tabela imovel_video
2. Reverter modificações em APIs
3. Remover componentes de vídeo
4. Restaurar versão anterior
5. Validar funcionamento completo
```

---

## 🧪 **TESTES E VALIDAÇÃO**

### **Testes Unitários**
```typescript
// Funções de banco
describe('imovel_video functions', () => {
  test('createImovelVideo')
  test('findImovelVideo')
  test('updateImovelVideo')
  test('deleteImovelVideo')
})

// Validações
describe('video validation', () => {
  test('valid formats')
  test('size limits')
  test('duration limits')
  test('security checks')
})
```

### **Testes de Integração**
```typescript
// APIs
describe('video APIs', () => {
  test('upload video')
  test('get video')
  test('delete video')
  test('integration with existing APIs')
})

// Sistema de rascunho
describe('video rascunho', () => {
  test('register video changes')
  test('confirm changes')
  test('cancel changes')
})
```

### **Testes de Interface**
```typescript
// Componentes
describe('video components', () => {
  test('VideoUpload component')
  test('VideoPreview component')
  test('VideoModal component')
  test('MediaStep integration')
})
```

### **Testes de Performance**
```typescript
// Upload de vídeos
// Renderização de previews
// Impacto no sistema existente
// Uso de memória e CPU
```

---

## 📊 **MÉTRICAS DE SUCESSO**

### **Funcionalidade**
- ✅ **100%** dos vídeos validados corretamente
- ✅ **0** vídeos maliciosos aceitos
- ✅ **< 5s** tempo de upload para vídeos válidos
- ✅ **100%** compatibilidade com sistema existente

### **Performance**
- ✅ **< 10%** aumento no tempo de carregamento do Step 5
- ✅ **< 5%** aumento no uso de memória
- ✅ **0** degradação em funcionalidades existentes

### **UX**
- ✅ **Intuitiva** interface de upload
- ✅ **Responsiva** em todos os dispositivos
- ✅ **Clara** feedback para usuário
- ✅ **Consistente** com design existente

---

## 📅 **CRONOGRAMA DETALHADO**

### **Semana 1: Estrutura Base**
- **Dia 1-2**: Criação da tabela e tipos
- **Dia 3-4**: Funções de banco de dados
- **Dia 5**: Testes unitários e validação

### **Semana 2: APIs**
- **Dia 1-2**: Endpoints básicos de vídeo
- **Dia 3-4**: Integração com APIs existentes
- **Dia 5**: Testes de API e validação

### **Semana 3: Interface**
- **Dia 1-2**: Componentes base de vídeo
- **Dia 3-4**: Integração no MediaStep
- **Dia 5**: Testes de interface

### **Semana 4: Sistema de Rascunho**
- **Dia 1-2**: Integração com useRascunho
- **Dia 3-4**: API de confirmação
- **Dia 5**: Testes de rascunho

### **Semana 5: Validações e Finalização**
- **Dia 1-2**: Validações robustas
- **Dia 3-4**: Testes finais e otimizações
- **Dia 5**: Deploy e monitoramento

---

## 🎯 **PRÓXIMOS PASSOS**

### **Imediato (Esta Semana)**
1. **Aprovação** do planejamento detalhado
2. **Configuração** do ambiente de desenvolvimento
3. **Criação** da tabela imovel_video
4. **Implementação** dos tipos TypeScript

### **Validação Contínua**
1. **Testes** após cada etapa
2. **Validação** de compatibilidade
3. **Monitoramento** de performance
4. **Feedback** do usuário

### **Critérios de Aprovação**
- [ ] **Funcionalidade** completa implementada
- [ ] **Compatibilidade** 100% mantida
- [ ] **Performance** dentro dos limites
- [ ] **Segurança** validada
- [ ] **UX** aprovada pelo usuário

---

**🎯 OBJETIVO FINAL: Implementar funcionalidade completa de vídeos no Step 5 de Mídias, mantendo 100% de compatibilidade com o sistema existente e seguindo rigorosamente as instruções da documentação.**

**📊 RESULTADO ESPERADO: Sistema robusto de gestão de vídeos integrado perfeitamente ao Step 5, com validações rigorosas, sistema de rascunho funcional e interface intuitiva.**
