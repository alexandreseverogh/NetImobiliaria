# 📊 FONTES DE DADOS - CARD "ENTRADAS INVÁLIDAS"

## 🎯 **VISÃO GERAL**

O card "Entradas Inválidas" no sistema de monitoramento de segurança é alimentado por eventos de validação que ocorrem em todas as APIs do sistema Net Imobiliária.

---

## 🔍 **FONTES DE DADOS PRINCIPAIS**

### **1. APIs de Usuários** (`/api/admin/usuarios`)
**Tipos de validação que geram eventos:**
- ✅ **Campos obrigatórios vazios**: `nome`, `email`, `senha`
- ✅ **Formato de email inválido**: `email@` (sem domínio)
- ✅ **Senha muito curta**: Menos de 6 caracteres
- ✅ **Nome muito longo**: Mais de 100 caracteres
- ✅ **Cargo inválido**: Mais de 50 caracteres

**Exemplo de dados inválidos:**
```json
{
  "nome": "",
  "email": "email-invalido",
  "senha": "123",
  "cargo": "A".repeat(200)
}
```

### **2. APIs de Imóveis** (`/api/admin/imoveis`)
**Tipos de validação que geram eventos:**
- ✅ **Campos obrigatórios vazios**: `titulo`, `descricao`, `preco`
- ✅ **Título muito curto**: Menos de 5 caracteres
- ✅ **Descrição muito curta**: Menos de 10 caracteres
- ✅ **Preço negativo**: Valores negativos
- ✅ **Área inválida**: Valores não numéricos
- ✅ **Quartos/Banheiros inválidos**: Valores negativos ou muito altos

**Exemplo de dados inválidos:**
```json
{
  "titulo": "",
  "descricao": "abc",
  "preco": -100,
  "area_total": "abc",
  "quartos": 50,
  "banheiros": -1
}
```

### **3. APIs de Clientes** (`/api/admin/clientes`)
**Tipos de validação que geram eventos:**
- ✅ **Campos obrigatórios vazios**: `nome`, `email`, `telefone`, `cpf`
- ✅ **Email inválido**: Formato incorreto
- ✅ **Telefone muito curto**: Menos de 10 dígitos
- ✅ **CPF inválido**: Formato incorreto
- ✅ **Data de nascimento inválida**: Formato incorreto

**Exemplo de dados inválidos:**
```json
{
  "nome": "",
  "email": "email@",
  "telefone": "123",
  "cpf": "123456789",
  "data_nascimento": "data-invalida"
}
```

### **4. APIs de Proprietários** (`/api/admin/proprietarios`)
**Tipos de validação que geram eventos:**
- ✅ **Campos obrigatórios vazios**: `nome`, `email`, `telefone`, `cpf`
- ✅ **Email inválido**: Formato incorreto
- ✅ **Telefone muito curto**: Menos de 10 dígitos
- ✅ **CPF inválido**: Formato incorreto
- ✅ **Data de nascimento inválida**: Formato incorreto

### **5. APIs de Perfis** (`/api/admin/perfis`)
**Tipos de validação que geram eventos:**
- ✅ **Campos obrigatórios vazios**: `nome`
- ✅ **Descrição muito longa**: Mais de 500 caracteres
- ✅ **Boolean inválido**: Valores não booleanos

**Exemplo de dados inválidos:**
```json
{
  "nome": "",
  "descricao": "A".repeat(1000),
  "ativo": "sim"
}
```

### **6. APIs de Categorias** (`/api/admin/categorias`)
**Tipos de validação que geram eventos:**
- ✅ **Campos obrigatórios vazios**: `nome`
- ✅ **Descrição muito longa**: Mais de 500 caracteres
- ✅ **Boolean inválido**: Valores não booleanos

### **7. APIs de Amenidades** (`/api/admin/amenidades`)
**Tipos de validação que geram eventos:**
- ✅ **Campos obrigatórios vazios**: `nome`, `categoria_id`
- ✅ **Descrição muito longa**: Mais de 500 caracteres
- ✅ **Boolean inválido**: Valores não booleanos

**Exemplo de dados inválidos:**
```json
{
  "nome": "",
  "descricao": "A".repeat(1000),
  "categoria_id": "",
  "ativo": "sim"
}
```

### **8. APIs de Proximidades** (`/api/admin/proximidades`)
**Tipos de validação que geram eventos:**
- ✅ **Campos obrigatórios vazios**: `nome`, `categoria_id`
- ✅ **Descrição muito longa**: Mais de 500 caracteres
- ✅ **Boolean inválido**: Valores não booleanos

### **9. APIs de Tipos de Documentos** (`/api/admin/tipos-documentos`)
**Tipos de validação que geram eventos:**
- ✅ **Campos obrigatórios vazios**: `nome`
- ✅ **Descrição muito longa**: Mais de 500 caracteres
- ✅ **Boolean inválido**: Valores não booleanos

**Exemplo de dados inválidos:**
```json
{
  "nome": "",
  "descricao": "A".repeat(1000),
  "obrigatorio": "sim",
  "ativo": "sim"
}
```

### **10. APIs de Tipos de Imóveis** (`/api/admin/tipos-imoveis`)
**Tipos de validação que geram eventos:**
- ✅ **Campos obrigatórios vazios**: `nome`
- ✅ **Descrição muito longa**: Mais de 500 caracteres
- ✅ **Boolean inválido**: Valores não booleanos

### **11. APIs de Finalidades** (`/api/admin/finalidades`)
**Tipos de validação que geram eventos:**
- ✅ **Campos obrigatórios vazios**: `nome`
- ✅ **Descrição muito longa**: Mais de 500 caracteres
- ✅ **Boolean inválido**: Valores não booleanos

### **12. APIs de Status de Imóveis** (`/api/admin/status-imovel`)
**Tipos de validação que geram eventos:**
- ✅ **Campos obrigatórios vazios**: `nome`
- ✅ **Descrição muito longa**: Mais de 500 caracteres
- ✅ **Cor inválida**: Formato de cor incorreto
- ✅ **Boolean inválido**: Valores não booleanos

**Exemplo de dados inválidos:**
```json
{
  "nome": "",
  "descricao": "A".repeat(1000),
  "cor": "cor-invalida",
  "ativo": "sim"
}
```

---

## 🔧 **IMPLEMENTAÇÃO TÉCNICA**

### **Sistema de Validação Unificado**
```typescript
// src/lib/validation/unifiedValidation.ts
export class UnifiedValidator {
  public async validateAndLog(
    data: any,
    ipAddress: string,
    userAgent: string,
    userId?: string
  ): Promise<ValidationResult> {
    // Validar dados
    const validation = this.validator.validate(data);
    
    // Se houver erros, logar entrada inválida
    if (!validation.isValid && validation.errors.length > 0) {
      this.logInvalidInput(ipAddress, userAgent, validation.errors, data, userId);
    }
    
    return validation;
  }
}
```

### **Logger de Entradas Inválidas**
```typescript
// src/lib/validation/inputValidationLogger.ts
export class InputValidationLogger {
  public logUserValidationError(
    endpoint: string,
    ipAddress: string,
    userAgent: string,
    errors: string[],
    inputData?: any,
    userId?: string
  ): void {
    // Log para security monitor
    logInvalidInput(ipAddress, userAgent, endpoint, errors);
  }
}
```

### **Integração com Security Monitor**
```typescript
// src/lib/monitoring/securityMonitor.ts
export function logInvalidInput(
  ipAddress: string,
  userAgent: string,
  endpoint: string,
  errors: string[]
): void {
  securityMonitor.logEvent({
    type: 'invalid_input',
    severity: 'low',
    source: 'validation',
    description: `Entrada inválida em ${endpoint}`,
    metadata: { endpoint, errors },
    ipAddress,
    userAgent
  });
}
```

---

## 📊 **MÉTRICAS E ESTATÍSTICAS**

### **Dados Capturados por Evento**
- **Timestamp**: Data e hora do evento
- **IP Address**: Endereço IP do usuário
- **User Agent**: Navegador/dispositivo
- **Endpoint**: API que recebeu a entrada inválida
- **User ID**: ID do usuário (se autenticado)
- **Errors**: Lista de erros de validação
- **Input Data**: Dados enviados (sanitizados)

### **Categorização de Eventos**
- **Por API**: Usuários, Imóveis, Clientes, etc.
- **Por Tipo de Erro**: Campos obrigatórios, formato inválido, etc.
- **Por Severidade**: Low (entrada inválida), Medium (tentativa de ataque)
- **Por Usuário**: IP, User ID, padrões de comportamento

---

## 🧪 **TESTE E GERAÇÃO DE DADOS**

### **Script de Teste**
```bash
# Executar script de teste
node test-invalid-inputs.js
```

### **Dados de Teste Gerados**
- **12 APIs diferentes** testadas
- **Múltiplos tipos de validação** por API
- **Dados maliciosos** simulados
- **Padrões de ataque** comuns

---

## 📈 **IMPACTO NO CARD "ENTRADAS INVÁLIDAS"**

### **Contagem de Eventos**
- **Cada validação falhada** = 1 evento
- **Múltiplos erros** em uma requisição = 1 evento
- **Diferentes APIs** = eventos separados
- **Diferentes usuários** = eventos separados

### **Atualização em Tempo Real**
- **Eventos imediatos**: Logged instantaneamente
- **Estatísticas atualizadas**: A cada carregamento da página
- **Filtros por data**: Últimas 24h, semana, mês
- **Filtros por API**: Específico por endpoint

---

## 🔍 **MONITORAMENTO E ALERTAS**

### **Alertas Configurados**
- **Alto volume de entradas inválidas**: > 100/hora
- **Padrões suspeitos**: Múltiplas tentativas do mesmo IP
- **Tentativas de ataque**: Dados maliciosos detectados

### **Dashboard de Monitoramento**
- **Total de entradas inválidas**: Contador geral
- **Por API**: Distribuição por endpoint
- **Por tipo de erro**: Categorização de erros
- **Timeline**: Gráfico temporal
- **Top IPs**: IPs com mais tentativas

---

## 🎯 **CONCLUSÃO**

O card "Entradas Inválidas" é alimentado por um sistema robusto de validação que monitora **12 APIs diferentes** do sistema Net Imobiliária, capturando **múltiplos tipos de erros de validação** e gerando eventos em tempo real para análise de segurança.

**Benefícios:**
- ✅ **Detecção precoce** de tentativas de ataque
- ✅ **Monitoramento abrangente** de todas as APIs
- ✅ **Análise de padrões** de comportamento
- ✅ **Alertas em tempo real** para administradores
- ✅ **Dados para melhoria** do sistema

---

**Data de Criação**: 23/10/2025  
**Versão**: 1.0  
**Status**: Implementação Completa




