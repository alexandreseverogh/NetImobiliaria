# 🚀 Migração de Amenidades e Proximidades

## 📋 Resumo da Migração

Esta migração converte o sistema de amenidades e proximidades de dados estáticos (arquivos JSON) para um sistema dinâmico baseado em banco de dados PostgreSQL.

### ✅ **O que foi implementado:**

1. **Novas Tabelas:**
   - `categorias_amenidades` - Categorias para agrupar amenidades
   - `amenidades` - Amenidades individuais dos imóveis
   - `categorias_proximidades` - Categorias para agrupar proximidades
   - `proximidades` - Proximidades individuais dos imóveis
   - `imovel_amenidades` - Relacionamento N:N entre imóveis e amenidades
   - `imovel_proximidades` - Relacionamento N:N entre imóveis e proximidades

2. **Views Otimizadas:**
   - `amenidades_completas` - Amenidades com dados da categoria
   - `proximidades_completas` - Proximidades com dados da categoria
   - `imoveis_amenidades_completas` - Imóveis com suas amenidades
   - `imoveis_proximidades_completas` - Imóveis com suas proximidades

3. **Funções de Banco de Dados:**
   - `src/lib/database/amenidades.ts` - CRUD completo para amenidades
   - `src/lib/database/proximidades.ts` - CRUD completo para proximidades

4. **APIs Atualizadas:**
   - `/api/admin/categorias-amenidades` - Agora consulta o banco
   - `/api/admin/categorias-proximidades` - Agora consulta o banco
   - `/api/admin/amenidades` - Nova API para amenidades
   - `/api/admin/proximidades` - Nova API para proximidades
   - `/api/admin/imoveis/[id]/amenidades` - Gestão de amenidades por imóvel
   - `/api/admin/imoveis/[id]/proximidades` - Gestão de proximidades por imóvel

## 🔧 **Como Executar a Migração**

### 1. **Pré-requisitos**
- PostgreSQL rodando
- Banco de dados `net_imobiliaria` criado
- Variáveis de ambiente configuradas (`.env.local`)

### 2. **Executar a Migração**
```bash
# Executar o script de migração
npm run migrate:amenidades
```

### 3. **Verificar a Migração**
O script irá:
- ✅ Criar todas as tabelas necessárias
- ✅ Popular com dados das categorias e itens
- ✅ Criar views otimizadas
- ✅ Configurar índices para performance
- ✅ Mostrar estatísticas dos dados inseridos

### 4. **Reiniciar o Sistema**
```bash
# Parar o servidor atual (Ctrl+C)
# Reiniciar
npm run dev
```

## 📊 **Dados Migrados**

### **Categorias de Amenidades (9 categorias):**
1. Lazer & Entretenimento (🎉)
2. Esporte & Saúde (💪)
3. Segurança (🔒)
4. Conveniência & Serviços (🛎️)
5. Verde & Sustentabilidade (🌱)
6. Tecnologia & Conectividade (📱)
7. Bem-estar & Relaxamento (🧘‍♀️)
8. Públicos Especiais (👶)
9. Estrutura & Arquitetura (🏛️)

### **Amenidades (~70 itens)**
Todos os itens do arquivo JSON foram migrados com:
- Nome e descrição
- Categoria associada
- Ícone emoji
- Flag de popularidade
- Ordem de exibição

### **Categorias de Proximidades (7 categorias):**
1. Comércio & Shopping (🛍️)
2. Alimentação (🍽️)
3. Saúde & Bem-estar (🏥)
4. Educação (🎓)
5. Transporte (🚌)
6. Lazer & Cultura (🎭)
7. Serviços (🏢)

### **Proximidades (~56 itens)**
Todos os itens foram migrados com estrutura similar às amenidades.

## 🔌 **Novas APIs Disponíveis**

### **Amenidades**
```javascript
// Listar todas as amenidades
GET /api/admin/amenidades

// Filtrar por categoria
GET /api/admin/amenidades?categoria=1

// Apenas populares
GET /api/admin/amenidades?popular=true

// Buscar por texto
GET /api/admin/amenidades?search=piscina
```

### **Proximidades**
```javascript
// Listar todas as proximidades
GET /api/admin/proximidades

// Filtrar por categoria
GET /api/admin/proximidades?categoria=1

// Apenas populares
GET /api/admin/proximidades?popular=true

// Buscar por texto
GET /api/admin/proximidades?search=shopping
```

### **Gestão por Imóvel**
```javascript
// Amenidades do imóvel
GET /api/admin/imoveis/1/amenidades
PUT /api/admin/imoveis/1/amenidades
POST /api/admin/imoveis/1/amenidades
DELETE /api/admin/imoveis/1/amenidades?amenidadeId=1

// Proximidades do imóvel
GET /api/admin/imoveis/1/proximidades
PUT /api/admin/imoveis/1/proximidades
POST /api/admin/imoveis/1/proximidades
DELETE /api/admin/imoveis/1/proximidades?proximidadeId=1
```

## 🧪 **Como Testar**

### 1. **Testar APIs**
```bash
# Categorias de amenidades
curl http://localhost:3000/api/admin/categorias-amenidades

# Todas as amenidades
curl http://localhost:3000/api/admin/amenidades

# Amenidades populares
curl "http://localhost:3000/api/admin/amenidades?popular=true"

# Buscar amenidades
curl "http://localhost:3000/api/admin/amenidades?search=piscina"
```

### 2. **Testar Interface**
1. Acesse o admin: `http://localhost:3000/admin`
2. Faça login
3. Vá para "Cadastrar Imóvel" ou "Editar Imóvel"
4. Teste os seletores de amenidades e proximidades
5. Salve um imóvel com amenidades/proximidades
6. Verifique se os dados foram salvos corretamente

### 3. **Verificar Banco de Dados**
```sql
-- Verificar dados inseridos
SELECT COUNT(*) FROM categorias_amenidades;
SELECT COUNT(*) FROM amenidades;
SELECT COUNT(*) FROM categorias_proximidades;
SELECT COUNT(*) FROM proximidades;

-- Testar views
SELECT * FROM amenidades_completas LIMIT 5;
SELECT * FROM proximidades_completas LIMIT 5;

-- Verificar relacionamentos (após cadastrar imóvel)
SELECT * FROM imovel_amenidades;
SELECT * FROM imovel_proximidades;
```

## 🚨 **Possíveis Problemas e Soluções**

### **Erro de Conexão com Banco**
```
Erro: connection to server failed
```
**Solução:** Verificar se PostgreSQL está rodando e configurações no `.env.local`

### **Tabelas já existem**
```
Erro: relation already exists
```
**Solução:** Normal, o script usa `IF NOT EXISTS`

### **Dados duplicados**
```
Erro: duplicate key value
```
**Solução:** O script usa `ON CONFLICT DO NOTHING` para evitar duplicatas

### **Componentes não carregam dados**
**Solução:** 
1. Verificar se as APIs estão respondendo
2. Verificar console do navegador
3. Reiniciar o servidor Next.js

## 📈 **Benefícios da Migração**

1. **Performance:** Consultas otimizadas com índices
2. **Flexibilidade:** Fácil adicionar/editar amenidades via admin
3. **Escalabilidade:** Suporte a milhares de itens
4. **Relacionamentos:** Dados de distância e observações
5. **Busca:** Busca por texto em tempo real
6. **Estatísticas:** Contagem de uso por amenidade/proximidade

## 🎯 **Próximos Passos Sugeridos**

1. **Interface Admin:** Criar CRUD para amenidades/proximidades
2. **Importação:** Sistema para importar dados via CSV
3. **Geolocalização:** Calcular distâncias automaticamente
4. **Relatórios:** Dashboard com estatísticas de uso
5. **Cache:** Implementar cache Redis para performance
6. **API Pública:** Expor APIs para site público

---

## 📞 **Suporte**

Se encontrar problemas durante a migração:
1. Verifique os logs do console
2. Consulte este documento
3. Verifique as configurações do banco de dados
4. Teste as APIs manualmente

