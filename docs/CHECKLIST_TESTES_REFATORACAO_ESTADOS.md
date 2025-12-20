# ✅ CHECKLIST DE TESTES - REFATORAÇÃO DE EXIBIÇÃO DE ESTADOS

## 📋 Objetivo
Validar que a refatoração do componente `EstadoSelect` não quebrou funcionalidades existentes e que todos os estados estão sendo exibidos em ordem alfabética.

---

## 🔍 PÁGINAS PÚBLICAS (Landpaging)

### ✅ `/landpaging` - Página Principal
- [ ] **Filtro de Estado no SearchForm**
  - [ ] Dropdown de estados abre corretamente
  - [ ] Estados estão em ordem alfabética (Acre, Alagoas, Amapá...)
  - [ ] Formato exibido: "SP - São Paulo"
  - [ ] Seleção de estado funciona
  - [ ] Ao selecionar estado, carrega cidades corretamente
  - [ ] Opção "Todos os estados" aparece no topo

- [ ] **Modal de Geolocalização**
  - [ ] Abrir modal de geolocalização
  - [ ] Dropdown "Selecione um estado" está em ordem alfabética
  - [ ] Formato exibido: "São Paulo (SP)"
  - [ ] Seleção de estado funciona
  - [ ] Ao selecionar estado, carrega cidades corretamente
  - [ ] Confirmar localização funciona

---

## 🔐 PÁGINAS ADMINISTRATIVAS

### ✅ `/admin/imoveis` - Listagem de Imóveis
- [ ] **Filtro de Estado**
  - [ ] Dropdown de estados está em ordem alfabética
  - [ ] Formato exibido: "SP - São Paulo"
  - [ ] Seleção de estado funciona
  - [ ] Ao selecionar estado, carrega cidades corretamente
  - [ ] Filtro aplica corretamente na listagem

### ✅ `/admin/proprietarios` - Listagem de Proprietários
- [ ] **Filtro de Estado**
  - [ ] Dropdown de estados está em ordem alfabética
  - [ ] Formato exibido: "SP - São Paulo"
  - [ ] Seleção de estado funciona
  - [ ] Ao selecionar estado, carrega cidades corretamente
  - [ ] Filtro aplica corretamente na listagem

### ✅ `/admin/clientes` - Listagem de Clientes
- [ ] **Filtro de Estado**
  - [ ] Dropdown de estados está em ordem alfabética
  - [ ] Formato exibido: "SP - São Paulo"
  - [ ] Seleção de estado funciona
  - [ ] Ao selecionar estado, carrega cidades corretamente
  - [ ] Filtro aplica corretamente na listagem

### ✅ `/admin/proprietarios/novo` - Criar Proprietário
- [ ] **Campo Estado no Formulário**
  - [ ] Dropdown de estados está em ordem alfabética
  - [ ] Formato exibido: "SP - São Paulo"
  - [ ] Seleção de estado funciona
  - [ ] Ao selecionar estado, carrega cidades corretamente
  - [ ] Validação de campo obrigatório funciona
  - [ ] Submissão do formulário funciona

### ✅ `/admin/proprietarios/[id]/editar` - Editar Proprietário
- [ ] **Campo Estado no Formulário**
  - [ ] Estado pré-selecionado está correto
  - [ ] Dropdown de estados está em ordem alfabética
  - [ ] Formato exibido: "SP - São Paulo"
  - [ ] Alteração de estado funciona
  - [ ] Ao alterar estado, carrega cidades corretamente
  - [ ] Salvar alterações funciona

### ✅ `/admin/clientes/novo` - Criar Cliente
- [ ] **Campo Estado no Formulário**
  - [ ] Dropdown de estados está em ordem alfabética
  - [ ] Formato exibido: "SP - São Paulo"
  - [ ] Seleção de estado funciona
  - [ ] Ao selecionar estado, carrega cidades corretamente
  - [ ] Validação de campo obrigatório funciona
  - [ ] Submissão do formulário funciona

### ✅ `/admin/clientes/[id]/editar` - Editar Cliente
- [ ] **Campo Estado no Formulário**
  - [ ] Estado pré-selecionado está correto
  - [ ] Dropdown de estados está em ordem alfabética
  - [ ] Formato exibido: "SP - São Paulo"
  - [ ] Alteração de estado funciona
  - [ ] Ao alterar estado, carrega cidades corretamente
  - [ ] Salvar alterações funciona

### ✅ `/admin/imoveis/novo` ou Wizard - Criar Imóvel
- [ ] **Step de Localização (LocationStep)**
  - [ ] ⚠️ **ATENÇÃO**: Este componente usa SIGLA diretamente, não ID
  - [ ] Dropdown de estados está em ordem alfabética
  - [ ] Formato exibido: "São Paulo (SP)"
  - [ ] Seleção de estado funciona
  - [ ] Ao selecionar estado, carrega municípios corretamente
  - [ ] Validação funciona
  - [ ] Navegação entre steps funciona

### ✅ `/admin/imoveis/[id]/editar` ou Wizard - Editar Imóvel
- [ ] **Step de Localização (LocationStep)**
  - [ ] Estado pré-selecionado está correto
  - [ ] Dropdown de estados está em ordem alfabética
  - [ ] Formato exibido: "São Paulo (SP)"
  - [ ] Alteração de estado funciona
  - [ ] Ao alterar estado, carrega municípios corretamente
  - [ ] Salvar alterações funciona

### ✅ `/admin/dashboards/*` - Dashboards
- [ ] **Filtros de Estado nos Dashboards**
  - [ ] Dropdown de estados está em ordem alfabética
  - [ ] Formato exibido: "São Paulo (SP)"
  - [ ] Seleção de estado funciona
  - [ ] Ao selecionar estado, carrega cidades corretamente
  - [ ] Aplicar filtros funciona
  - [ ] Gráficos/relatórios atualizam corretamente

---

## 🧪 TESTES FUNCIONAIS CRÍTICOS

### ✅ Teste de Ordenação
- [ ] Verificar que estados começam com "Acre" (primeiro alfabeticamente)
- [ ] Verificar que estados terminam com "Tocantins" (último alfabeticamente)
- [ ] Verificar que "São Paulo" aparece após "Santa Catarina"
- [ ] Verificar que acentos são respeitados (ex: "Amapá" antes de "Amazonas")

### ✅ Teste de IDs (CRÍTICO)
- [ ] Selecionar estado "SP" (São Paulo)
- [ ] Verificar que `loadMunicipios` carrega cidades de SP corretamente
- [ ] Selecionar estado "RJ" (Rio de Janeiro)
- [ ] Verificar que `loadMunicipios` carrega cidades de RJ corretamente
- [ ] Testar com 3-5 estados diferentes para garantir que IDs estão corretos

### ✅ Teste de Formatação
- [ ] Verificar formato "sigla-nome": "SP - São Paulo"
- [ ] Verificar formato "nome-sigla": "São Paulo (SP)"
- [ ] Verificar formato "nome-only": "São Paulo"

### ✅ Teste de Validação
- [ ] Campos obrigatórios mostram erro quando vazios
- [ ] Mensagens de erro aparecem corretamente
- [ ] Formulários não submetem sem estado selecionado (quando obrigatório)

### ✅ Teste de Performance
- [ ] Dropdown abre rapidamente (< 100ms)
- [ ] Não há lag ao rolar lista de estados
- [ ] Não há re-renders desnecessários

---

## 🐛 PONTOS DE ATENÇÃO ESPECIAIS

### ⚠️ LocationStep (Wizard de Imóveis)
- **CRÍTICO**: Este componente usa `estado.sigla` diretamente, não `estado.id`
- Verificar se ainda funciona corretamente após refatoração
- Se não migrado, verificar se ordenação local ainda funciona

### ⚠️ Formulários de Criação/Edição
- Verificar se estados pré-selecionados (em edição) aparecem corretamente
- Verificar se mudança de estado limpa cidade selecionada
- Verificar se validação funciona corretamente

### ⚠️ Filtros de Listagem
- Verificar se filtros aplicados persistem após navegação
- Verificar se URLs com parâmetros de estado funcionam
- Verificar se limpar filtros funciona

---

## 📝 NOTAS DE TESTE

**Data do Teste:** _______________
**Testador:** _______________
**Ambiente:** [ ] Desenvolvimento [ ] Homologação [ ] Produção

### Problemas Encontrados:
1. 
2. 
3. 

### Observações:
- 

---

## ✅ CRITÉRIOS DE APROVAÇÃO

- [ ] Todas as páginas listadas foram testadas
- [ ] Todos os estados aparecem em ordem alfabética
- [ ] Seleção de estados funciona em 100% dos casos
- [ ] Carregamento de cidades funciona corretamente
- [ ] Nenhum erro no console do navegador
- [ ] Nenhuma funcionalidade quebrada

**Status Final:** [ ] ✅ APROVADO [ ] ❌ REPROVADO [ ] ⚠️ APROVADO COM RESSALVAS








