# 🔍 EXPLICAÇÃO - DE ONDE VÊM OS NOMES DOS RECURSOS

## 📋 **RESUMO DA IMAGEM**

A imagem mostra a **correção aplicada** na sidebar para resolver o problema de mapeamento de recursos. O problema era que a sidebar estava usando **nomes descritivos** (como aparecem na interface) em vez dos **identificadores técnicos** que o sistema espera.

## 🎯 **DE ONDE VÊM ESSES NOMES?**

### **1️⃣ FONTE PRIMÁRIA: TABELA `system_features`**

Os nomes originais vêm da coluna `name` da tabela `system_features`:

```sql
SELECT id, name FROM system_features ORDER BY name;
```

**Resultado atual:**
```
ID:  8 | Amenidades
ID:  7 | Categorias de Amenidades  
ID:  1 | Categorias de Funcionalidades
ID:  9 | Categorias de Proximidades
ID: 17 | Clientes
ID: 19 | Dashboard
ID: 13 | Finalidades de Imóveis
ID:  2 | Funcinalidades do Sistema      ← Nome com erro de digitação
ID:  4 | Gestão de Perfis
ID:  5 | Gestão de permissões
ID:  3 | Hierarquia de Perfis
ID: 16 | Imóveis
ID: 15 | Mudança de Status
ID: 18 | Proprietários
ID: 10 | Proximidades
ID: 20 | Relatórios
ID: 14 | Status de Imóveis
ID: 11 | Tipos de Documentos
ID: 12 | Tipos de Imóveis
ID:  6 | Usuários
```

### **2️⃣ MAPEAMENTO AUTOMÁTICO: FUNÇÃO `mapFeatureToResource`**

**Arquivo:** `src/lib/database/userPermissions.ts` (linhas 136-172)

Esta função converte os nomes das funcionalidades para identificadores técnicos:

```typescript
function mapFeatureToResource(funcionalidade: string): string {
  const featureMapping: { [key: string]: string } = {
    // Sistema/Admin
    'Categorias de Funcionalidades': 'system-features',
    'Funcionalidades do Sistema': 'system-features',     // ← Mapeamento correto
    'Funcinalidades do Sistema': 'funcinalidades-do-sistema', // ← Nome com erro
    'Gestão de Perfis': 'roles',
    'Gestão de permissões': 'permissions',
    'Hierarquia de Perfis': 'hierarchy',
    'Usuários': 'usuarios',
    
    // Imóveis
    'Imóveis': 'imoveis',
    'Tipos de Imóveis': 'tipos-imoveis',
    'Finalidades de Imóveis': 'finalidades',
    'Status de Imóveis': 'status-imovel',
    'Mudança de Status': 'mudancas-status',
    
    // Amenidades e Proximidades
    'Amenidades': 'amenidades',
    'Categorias de Amenidades': 'categorias-amenidades',
    'Proximidades': 'proximidades',
    'Categorias de Proximidades': 'categorias-proximidades',
    
    // Documentos
    'Tipos de Documentos': 'tipos-de-documentos',
    
    // Clientes e Proprietários
    'Clientes': 'clientes',
    'Proprietários': 'proprietarios',
    
    // Dashboard e Relatórios
    'Dashboard': 'dashboards',
    'Relatórios': 'relatorios'
  }
  
  return featureMapping[funcionalidade] || funcionalidade.toLowerCase().replace(/\s+/g, '-')
}
```

### **3️⃣ FLUXO COMPLETO DO MAPEAMENTO**

```
1. BANCO DE DADOS
   └── system_features.name = "Funcionalidades do Sistema"
   
2. QUERY SQL (userPermissions.ts)
   └── SELECT sf.name as funcionalidade FROM system_features sf...
   
3. MAPEAMENTO (mapFeatureToResource)
   └── "Funcionalidades do Sistema" → "system-features"
   
4. FRONTEND
   └── permissions["system-features"] = "ADMIN"
```

## 🔧 **PROBLEMA IDENTIFICADO NA IMAGEM**

### **❌ ANTES (não funcionava):**
```typescript
resource: 'Funcinalidades do Sistema'  // ❌ Nome exato do banco (com erro de digitação)
resource: 'Categorias de Funcionalidades'  // ❌ Nome exato do banco
resource: 'Hierarquia de Perfis'  // ❌ Nome exato do banco
resource: 'Gestão de Perfis'  // ❌ Nome exato do banco
resource: 'Gestão de permissões'  // ❌ Nome exato do banco
resource: 'Usuários'  // ❌ Nome exato do banco
```

### **✅ DEPOIS (funcionando):**
```typescript
resource: 'funcinalidades-do-sistema'  // ✅ Recurso mapeado
resource: 'system-features'  // ✅ Recurso mapeado
resource: 'hierarchy'  // ✅ Recurso mapeado
resource: 'roles'  // ✅ Recurso mapeado
resource: 'permissions'  // ✅ Recurso mapeado
resource: 'usuarios'  // ✅ Recurso mapeado
```

## 🎯 **EXPLICAÇÃO DETALHADA DOS NOMES**

### **`funcinalidades-do-sistema`**
- **Origem**: `system_features.name = "Funcinalidades do Sistema"` (com erro de digitação)
- **Mapeamento**: `mapFeatureToResource` → `'funcinalidades-do-sistema'`
- **Por que**: Mantém o erro de digitação do banco, mas converte para formato técnico

### **`system-features`**
- **Origem**: `system_features.name = "Categorias de Funcionalidades"`
- **Mapeamento**: `mapFeatureToResource` → `'system-features'`
- **Por que**: Tradução lógica para inglês + formato técnico

### **`hierarchy`**
- **Origem**: `system_features.name = "Hierarquia de Perfis"`
- **Mapeamento**: `mapFeatureToResource` → `'hierarchy'`
- **Por que**: Tradução para inglês + simplificação

### **`roles`**
- **Origem**: `system_features.name = "Gestão de Perfis"`
- **Mapeamento**: `mapFeatureToResource` → `'roles'`
- **Por que**: Tradução para inglês (roles = perfis)

### **`permissions`**
- **Origem**: `system_features.name = "Gestão de permissões"`
- **Mapeamento**: `mapFeatureToResource` → `'permissions'`
- **Por que**: Tradução para inglês + simplificação

### **`usuarios`**
- **Origem**: `system_features.name = "Usuários"`
- **Mapeamento**: `mapFeatureToResource` → `'usuarios'`
- **Por que**: Mantém português mas remove acentos + lowercase

## 🔄 **COMO FUNCIONA O SISTEMA**

1. **Banco de Dados**: Armazena nomes descritivos em português
2. **Backend**: Converte nomes para identificadores técnicos via `mapFeatureToResource`
3. **Frontend**: Usa identificadores técnicos para verificar permissões
4. **Sidebar**: Deve usar os **identificadores técnicos**, não os nomes descritivos

## 🎯 **CONCLUSÃO**

Os nomes como `funcinalidades-do-sistema`, `system-features`, `hierarchy`, etc. **NÃO são buscados** - eles são **mapeados automaticamente** pela função `mapFeatureToResource` a partir dos nomes originais armazenados na tabela `system_features`.

A imagem mostra a correção necessária na sidebar para usar os **identificadores técnicos corretos** em vez dos **nomes descritivos do banco**.
