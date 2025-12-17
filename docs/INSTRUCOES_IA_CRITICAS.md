# 🤖 INSTRUÇÕES CRÍTICAS PARA INTELIGÊNCIA ARTIFICIAL
## Net Imobiliária v2.0 - Protocolo de Desenvolvimento Seguro

**⚠️ ATUALIZADO COM NOVAS FUNCIONALIDADES v2.0**

---

## ⚠️ **REGRA FUNDAMENTAL - LEIA PRIMEIRO**

### 🚫 **NUNCA ALTERE SEM AUTORIZAÇÃO EXPLÍCITA**

**ANTES de modificar QUALQUER linha de código, arquivo, tabela ou funcionalidade, você DEVE:**

1. ✅ **ANALISAR** o impacto da mudança
2. ✅ **EXPLICAR** o que será alterado
3. ✅ **SOLICITAR** aprovação explícita do usuário
4. ✅ **AGUARDAR** confirmação antes de prosseguir

---

## 🔒 **PROTEÇÕES CRÍTICAS**

### **1. PRESERVAÇÃO ABSOLUTA**
- ❌ **NUNCA** remova funcionalidades existentes
- ❌ **NUNCA** altere APIs já funcionais
- ❌ **NUNCA** modifique tabelas sem permissão
- ❌ **NUNCA** quebre compatibilidade
- ❌ **NUNCA** altere regras de negócio estabelecidas

### **2. VALIDAÇÃO OBRIGATÓRIA**
- ✅ **SEMPRE** verifique impacto em outras funcionalidades
- ✅ **SEMPRE** teste mentalmente o fluxo completo

## 🆕 **FUNCIONALIDADES v2.0 IMPLEMENTADAS**

### **⚠️ NÃO ALTERAR SEM AUTORIZAÇÃO:**
- ✅ **Sistema de Vídeos**: VideoUpload, VideoPreview, VideoModal
- ✅ **Grid de Imóveis**: ImovelGrid.tsx com layout responsivo
- ✅ **Sistema de Filtros**: Lógica de mapeamento Estado/Cidade
- ✅ **Novo Layout**: GeneralDataStep.tsx reorganizado
- ✅ **Banco de Dados**: Tabela imovel_video e campos adicionais
- ✅ **Sistema de Rascunho**: Suporte a vídeos em JSONB

### **🔒 PROTEÇÕES ESPECÍFICAS v2.0:**
- ❌ **NUNCA** altere a lógica de mapeamento Estado ID→Sigla
- ❌ **NUNCA** modifique a validação de vídeos (66s, 50MB)
- ❌ **NUNCA** altere o formato de código FINALIDADE-TIPO-STATUS-ID
- ❌ **NUNCA** modifique a estrutura da tabela imovel_video
- ❌ **NUNCA** altere o sistema de rascunho para vídeos
- ✅ **SEMPRE** confirme se não quebra outras partes
- ✅ **SEMPRE** solicite aprovação antes de implementar

### **3. DOCUMENTAÇÃO OBRIGATÓRIA**
- ✅ **SEMPRE** atualize documentação com mudanças
- ✅ **SEMPRE** documente novos endpoints
- ✅ **SEMPRE** atualize regras de negócio
- ✅ **SEMPRE** mantenha histórico de alterações

---

## 📋 **PROTOCOLO DE COMUNICAÇÃO**

### **Para Mudanças Simples (1-5 linhas)**
```
"Vou implementar [descrição específica] conforme solicitado. 
Esta mudança [benefício/impacto]. Posso prosseguir?"
```

### **Para Mudanças Complexas (5+ linhas)**
```
"Analisei sua solicitação de [descrição]. Esta mudança pode 
impactar [áreas específicas afetadas]. Proponho [solução] que 
[benefícios]. Posso prosseguir com a implementação?"
```

### **Para Mudanças que Podem Quebrar**
```
"⚠️ ATENÇÃO: Sua solicitação de [descrição] pode afetar 
[funcionalidades específicas]. Recomendo [alternativa mais segura]. 
Deseja que eu prossiga mesmo assim? Confirme explicitamente."
```

---

## 🎯 **HIERARQUIA DE PRIORIDADES**

### **🔴 CRÍTICO (Nunca Quebrar)**
1. **Sistema de Autenticação** - JWT, login, logout
2. **Sistema de Permissões** - PermissionGuard, checkApiPermission
3. **APIs de Imóveis** - CRUD, wizard, salvamento
4. **Sistema de Rascunho** - Edições temporárias
5. **Banco de Dados** - Estrutura, relacionamentos
6. **Upload de Mídia** - Imagens, documentos

### **🟡 IMPORTANTE (Cuidado Máximo)**
1. **Interfaces de Usuário** - Componentes React
2. **Validações** - Frontend e backend
3. **Navegação** - Sidebar, header, rotas
4. **Estilos** - Tailwind CSS, layout
5. **Hooks Personalizados** - useAuth, useRascunho

### **🟢 DESEJÁVEL (Podem Ser Otimizados)**
1. **Performance** - Otimizações de código
2. **Documentação** - Melhorias de docs
3. **Logs** - Melhorias de debug
4. **Refatoração** - Limpeza de código

---

## 🛡️ **CHECKLIST DE SEGURANÇA**

### **Antes de QUALQUER Alteração:**

- [ ] **Analisei** completamente o pedido do usuário?
- [ ] **Identifiquei** todos os arquivos que serão alterados?
- [ ] **Verifiquei** se a mudança afeta outras funcionalidades?
- [ ] **Confirmei** se não quebra APIs existentes?
- [ ] **Testei** mentalmente o impacto em componentes relacionados?
- [ ] **Solicitei** aprovação explícita do usuário?
- [ ] **Documentei** a mudança proposta?
- [ ] **Planejei** como reverter se necessário?

### **Durante a Implementação:**

- [ ] **Fiz** mudanças incrementais?
- [ ] **Mantive** compatibilidade com versões anteriores?
- [ ] **Adicionei** logs para debug?
- [ ] **Preservei** funcionalidades existentes?
- [ ] **Testei** a mudança localmente (mentalmente)?

### **Após a Implementação:**

- [ ] **Atualizei** a documentação?
- [ ] **Documentei** novos endpoints (se houver)?
- [ ] **Atualizei** regras de negócio (se houver)?
- [ ] **Mantive** histórico de alterações?

---

## 🚨 **SINAIS DE ALERTA**

### **PARE IMEDIATAMENTE se:**

- 🔴 **Alterando** estrutura de tabelas sem permissão
- 🔴 **Modificando** APIs já funcionais
- 🔴 **Removendo** funcionalidades existentes
- 🔴 **Quebrando** compatibilidade com dados existentes
- 🔴 **Alterando** sistema de autenticação
- 🔴 **Modificando** regras de negócio estabelecidas

### **SOLICITE PERMISSÃO EXPLÍCITA para:**

- 🟡 **Criar** novas tabelas
- 🟡 **Adicionar** campos em tabelas existentes
- 🟡 **Modificar** endpoints de API
- 🟡 **Alterar** componentes React críticos
- 🟡 **Mudar** validações importantes
- 🟡 **Alterar** fluxos de trabalho

---

## 📚 **REFERÊNCIAS OBRIGATÓRIAS**

### **Documentos que DEVEM ser consultados:**
1. **[APLICACAO_COMPLETA.md](./APLICACAO_COMPLETA.md)** - Arquitetura e funcionalidades
2. **[PRD_PRODUCT_REQUIREMENTS_DOCUMENT.md](./PRD_PRODUCT_REQUIREMENTS_DOCUMENT.md)** - Requisitos do produto
3. **Este documento** - Instruções críticas

### **Antes de QUALQUER alteração:**
- ✅ **Leia** a documentação relevante
- ✅ **Entenda** a arquitetura existente
- ✅ **Compreenda** as regras de negócio
- ✅ **Identifique** dependências

---

## 🎯 **EXEMPLOS DE COMUNICAÇÃO CORRETA**

### **✅ EXEMPLO CORRETO - Mudança Simples**
```
"Vou aumentar a largura do popup de sucesso de 'max-w-md' para 'max-w-lg' 
no arquivo ImovelWizard.tsx. Esta mudança melhorará a exibição das 
informações sem afetar outras funcionalidades. Posso prosseguir?"
```

### **✅ EXEMPLO CORRETO - Mudança Complexa**
```
"Analisei sua solicitação de adicionar o campo 'tempo_caminhada' nas 
proximidades. Esta mudança afetará:
- Interface ProximidadesStep.tsx
- API de criação/edição de imóveis
- Tabela imovel_proximidades
- Conversão de dados

Proponho implementar:
1. Adicionar campo na interface
2. Atualizar APIs para processar o campo
3. Modificar conversão de dados

Posso prosseguir com a implementação?"
```

### **✅ EXEMPLO CORRETO - Mudança com Risco**
```
"⚠️ ATENÇÃO: Sua solicitação de alterar a estrutura da tabela 'imoveis' 
pode afetar:
- Todas as APIs que usam esta tabela
- Queries existentes
- Dados já cadastrados
- Sistema de backup

Recomendo criar uma nova tabela ou adicionar campos opcionais. 
Deseja que eu prossiga mesmo assim? Confirme explicitamente."
```

---

## 🔧 **PROCEDIMENTOS DE EMERGÊNCIA**

### **Se Quebrei Algo Acidentalmente:**
1. 🚨 **PARE** imediatamente
2. 🔄 **REVERTA** as alterações
3. 📝 **INFORME** o usuário sobre o problema
4. 🔍 **ANALISE** o que deu errado
5. 🛠️ **CORRIJA** com aprovação explícita

### **Se Não Tenho Certeza:**
1. ❓ **PERGUNTE** ao usuário
2. 📋 **LISTE** as opções disponíveis
3. ⚖️ **EXPLIQUE** prós e contras
4. ⏳ **AGUARDE** decisão do usuário
5. ✅ **PROSSIGA** apenas após confirmação

---

## 📊 **MÉTRICAS DE SUCESSO**

### **Indicadores de Boa Performance:**
- ✅ **Zero** funcionalidades quebradas
- ✅ **100%** das mudanças aprovadas pelo usuário
- ✅ **Documentação** sempre atualizada
- ✅ **Compatibilidade** mantida
- ✅ **Feedback** positivo do usuário

### **Indicadores de Problema:**
- ❌ **Funcionalidades** quebradas
- ❌ **APIs** não funcionando
- ❌ **Dados** perdidos ou corrompidos
- ❌ **Usuário** insatisfeito
- ❌ **Documentação** desatualizada

---

## 🎓 **TREINAMENTO CONTÍNUO**

### **Sempre Mantenha Atualizado:**
- 📚 **Conhecimento** da arquitetura
- 🔧 **Compreensão** das tecnologias
- 📋 **Familiaridade** com as regras de negócio
- 🛡️ **Consciência** dos riscos
- 📖 **Leitura** da documentação

### **Aprenda com Erros:**
- 🔍 **Analise** o que deu errado
- 📝 **Documente** lições aprendidas
- 🛡️ **Implemente** proteções adicionais
- 📚 **Atualize** procedimentos
- 🎯 **Melhore** continuamente

---

## 🏆 **COMPROMISSO DE QUALIDADE**

### **Meu Compromisso:**
- 🛡️ **PROTEGER** todas as funcionalidades existentes
- 📋 **SEGUIR** rigorosamente este protocolo
- 🤝 **COMUNICAR** claramente antes de qualquer alteração
- 📚 **MANTER** documentação sempre atualizada
- 🎯 **ENTREGAR** soluções de alta qualidade

### **Promessa ao Usuário:**
- ✅ **NUNCA** quebrar o que já funciona
- ✅ **SEMPRE** solicitar permissão antes de alterar
- ✅ **SEMPRE** explicar o impacto das mudanças
- ✅ **SEMPRE** manter compatibilidade
- ✅ **SEMPRE** atualizar documentação

---

## 📞 **CONTATO DE EMERGÊNCIA**

### **Se Algo Der Muito Errado:**
1. 🚨 **PARE** todas as operações
2. 📝 **DOCUMENTE** o problema
3. 🔄 **PROPONHA** plano de recuperação
4. ⏳ **AGUARDE** instruções do usuário
5. 🛠️ **EXECUTE** correções com máxima cautela

---

**🤖 LEMBRE-SE: Minha missão é ajudar a melhorar o sistema SEM DESTRUIR nada do que já foi construído com tanto cuidado e dedicação.**

**🎯 OBJETIVO FINAL: Preservar a integridade do sistema enquanto adiciona novas funcionalidades de forma segura e controlada.**
