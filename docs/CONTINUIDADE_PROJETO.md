# 🔄 Guia de Continuidade do Projeto - Net Imobiliária

**Criado em:** 2025-11-15  
**Última atualização:** 2025-11-15  
**Status:** ✅ Ativo

---

## 📚 Documentos Essenciais para Continuidade

### 🛡️ **GUARDIAN RULES - OBRIGATÓRIO**
**Arquivo:** `GUARDIAN_RULES.md` (raiz do projeto)

**⚠️ CRÍTICO:** Este documento contém as regras INVIOLÁVEIS do desenvolvimento. **SEMPRE** consultar antes de qualquer implementação.

**Principais Regras:**
1. **INCREMENTAL SIM, DESTRUTIVO NUNCA!** - Regra primordial
2. **Protocolo de Impacto Obrigatório** - Análise antes de implementar
3. **Regras de Segurança** - Nunca bypass de autenticação, RBAC, 2FA
4. **Regras de Banco de Dados** - Sem operações destrutivas
5. **Checklist Guardian** - Verificar antes de finalizar

### 📋 **Histórico da Última Sessão**
**Arquivo:** `docs/HISTORICO_SESSAO_2025-01-XX.md`

Contém todo o trabalho realizado na última sessão, incluindo:
- Implementações realizadas
- Arquivos criados/modificados
- Detalhes técnicos
- Estado atual do sistema

### 🏗️ **Arquitetura do Sistema**
**Arquivo:** `docs/ARQUITETURA_GUARDIAN_OVERVIEW.md`

Visão geral da arquitetura, camadas, estrutura de pastas, APIs principais, modelo de dados.

### 📊 **Análise de Impacto**
**Arquivo:** `docs/ANALISE_IMPACTO_FILTRAGEM_PUBLICA.md`

Exemplo de análise de impacto para funcionalidades públicas.

---

## 🎯 Contexto Atual do Projeto

### **Aplicação Admin (Interna)**
- Sistema de gestão imobiliária com usuários e permissões
- Sidebar dinâmica controlada por banco de dados
- CRUDs protegidos por RBAC
- Sistema de 2FA obrigatório

### **Aplicação Pública (Web)**
- Visualização de imóveis para compra/aluguel
- Filtros avançados de busca
- Cadastro/login de clientes e proprietários
- Sistema de interesse em imóveis (prospects)
- **NOVO:** E-mail automático de notificação de interesse

---

## ✅ Últimas Implementações (2025-11-15)

### **Sistema de E-mail de Interesse em Imóveis**

**Objetivo:** Enviar e-mail automático para `alexandreseverog@gmail.com` quando cliente registra interesse.

**Implementações:**
1. ✅ Template de e-mail criado (`imovel-interesse`)
2. ✅ Campos adicionados à tabela `imovel_prospects`:
   - `preferencia_contato` (VARCHAR(20))
   - `mensagem` (TEXT)
3. ✅ API atualizada para enviar e-mail após registro
4. ✅ Formatação de valores (moeda, data, endereço)
5. ✅ Correção: campo `varanda` exibe número (não booleano)

**Arquivos Modificados:**
- `src/app/api/public/imoveis/prospects/route.ts`
- `database/migrations/create_email_template_imovel_interesse.sql`
- `database/migrations/add_campos_imovel_prospects.sql`

**Status:** ✅ Completo e funcional

---

## 🔧 Tecnologias e Ferramentas

### **Stack Principal:**
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Node.js
- **Banco de Dados:** PostgreSQL
- **Autenticação:** JWT, bcryptjs
- **E-mail:** Nodemailer (via `emailService`)
- **Rate Limiting:** `rate-limiter-flexible`

### **Bibliotecas Importantes:**
- `lucide-react` - Ícones
- `pg` - Cliente PostgreSQL
- `nodemailer` - Envio de e-mails

---

## 📁 Estrutura de Pastas Relevante

```
net-imobiliaria/
├── GUARDIAN_RULES.md          # ⚠️ OBRIGATÓRIO - Regras invioláveis
├── docs/
│   ├── HISTORICO_SESSAO_*.md  # Histórico de sessões
│   ├── ARQUITETURA_GUARDIAN_OVERVIEW.md
│   └── CONTINUIDADE_PROJETO.md  # Este arquivo
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin/         # APIs administrativas
│   │   │   └── public/        # APIs públicas
│   │   ├── admin/             # Páginas admin
│   │   └── landpaging/        # Página pública
│   ├── components/
│   │   ├── public/            # Componentes públicos
│   │   └── admin/             # Componentes admin
│   ├── lib/
│   │   ├── database/          # Funções de banco
│   │   └── utils/             # Utilitários
│   └── services/
│       ├── emailService.ts    # Serviço de e-mail
│       └── twoFactorAuthService.ts
├── database/
│   └── migrations/            # Migrations SQL
└── README.md
```

---

## 🚀 Como Continuar Amanhã

### **1. Ler Documentos Essenciais:**
```bash
# Ordem recomendada:
1. GUARDIAN_RULES.md
2. docs/HISTORICO_SESSAO_2025-01-XX.md
3. docs/ARQUITETURA_GUARDIAN_OVERVIEW.md
4. Este arquivo (CONTINUIDADE_PROJETO.md)
```

### **2. Verificar Estado Atual:**
- ✅ Sistema de e-mail de interesse está funcional
- ✅ Template criado e testado
- ✅ Campos adicionados ao banco
- ✅ API atualizada

### **3. Antes de Qualquer Implementação:**
1. ✅ Consultar `GUARDIAN_RULES.md`
2. ✅ Verificar `docs/INVENTARIO_DEPENDENCIAS_CLIENTES_PROPRIETARIOS.md` (se aplicável)
3. ✅ Criar `ANALISE_IMPACTO_[NOME].md` (se necessário)
4. ✅ Obter autorização expressa (se impacto em funcionalidades existentes)

---

## 🔐 Segurança e Boas Práticas

### **Regras Críticas:**
- ❌ **NUNCA** bypass de autenticação
- ❌ **NUNCA** hardcodar valores
- ❌ **NUNCA** operações destrutivas no banco
- ❌ **NUNCA** remover funcionalidades existentes
- ✅ **SEMPRE** usar prepared statements (SQL)
- ✅ **SEMPRE** validar inputs
- ✅ **SEMPRE** tratar erros adequadamente
- ✅ **SEMPRE** seguir RBAC

### **Sistema de Permissões:**
- 6 níveis hierárquicos: `admin`, `delete`, `update`, `create`, `execute`, `read`
- Permissões baseadas em `system_features.slug`
- Guards específicos no frontend

---

## 📊 Banco de Dados

### **Tabelas Principais:**
- `users` - Usuários administrativos
- `clientes` - Clientes públicos
- `proprietarios` - Proprietários públicos
- `imoveis` - Imóveis cadastrados
- `imovel_prospects` - Interesses de clientes em imóveis
- `email_templates` - Templates de e-mail
- `email_settings` - Configurações SMTP
- `email_logs` - Logs de envio

### **Migrations:**
- Todas as migrations estão em `database/migrations/`
- Sempre usar transações (BEGIN/COMMIT)
- Nunca fazer DROP sem backup

---

## 🧪 Testes e Validações

### **Antes de Finalizar Qualquer Implementação:**
1. ✅ Verificar lint (`npm run lint`)
2. ✅ Testar funcionalidade manualmente
3. ✅ Verificar logs do servidor
4. ✅ Validar banco de dados
5. ✅ Confirmar que não quebrou funcionalidades existentes

---

## 📝 Próximos Passos Sugeridos

### **Curto Prazo:**
- [ ] Testar envio de e-mail em produção
- [ ] Verificar se há necessidade de personalizar destinatário
- [ ] Considerar adicionar imagem do imóvel no e-mail

### **Médio Prazo:**
- [ ] Dashboard de prospects para admin
- [ ] Relatórios de interesse
- [ ] Notificações em tempo real

---

## 🆘 Em Caso de Problemas

### **Protocolo de Emergência (GUARDIAN RULES):**
1. **PARAR** imediatamente
2. **NÃO** fazer mais alterações
3. **VERIFICAR** logs e backups
4. **COMUNICAR** problema
5. **AGUARDAR** autorização antes de corrigir

### **Recursos de Ajuda:**
- `GUARDIAN_RULES.md` - Seção "Protocolo de Emergência"
- `docs/ARQUITETURA_GUARDIAN_OVERVIEW.md` - Visão geral
- Histórico de sessões anteriores

---

## 📌 Notas Importantes

1. **GUARDIAN RULES é INVIOLÁVEL** - Sempre consultar antes de implementar
2. **Incremental, nunca destrutivo** - Regra primordial
3. **Análise de impacto obrigatória** - Para mudanças que afetam funcionalidades existentes
4. **Segurança primeiro** - Nunca comprometer segurança por conveniência
5. **Documentação é essencial** - Sempre documentar mudanças significativas

---

## 🎯 Checklist de Continuidade

Antes de começar a trabalhar:

- [ ] Li `GUARDIAN_RULES.md`
- [ ] Li o histórico da última sessão
- [ ] Entendi o contexto atual do projeto
- [ ] Verifiquei o estado do banco de dados
- [ ] Testei as funcionalidades principais
- [ ] Identifiquei o que preciso fazer
- [ ] Criei análise de impacto (se necessário)
- [ ] Obtenho autorização (se necessário)

---

**🚀 Pronto para continuar com total segurança!**

**Última atualização:** 2025-11-15  
**Mantido por:** Equipe de Desenvolvimento Net Imobiliária









