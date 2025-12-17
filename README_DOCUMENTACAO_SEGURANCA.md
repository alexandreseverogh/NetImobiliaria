# 📚 DOCUMENTAÇÃO DO SISTEMA DE SEGURANÇA - ÍNDICE GERAL

**Sistema Net Imobiliária**  
**Versão:** 2.0  
**Data:** 2025-10-08

---

## 📋 DOCUMENTOS DISPONÍVEIS

### 1. 📖 **DOCUMENTACAO_SISTEMA_SEGURANCA.md** ⭐ PRINCIPAL
**Documentação completa e detalhada**

**Conteúdo:**
- ✅ Visão geral do sistema
- ✅ Arquitetura completa em camadas
- ✅ Descrição detalhada de todas as 13 tabelas
- ✅ Estrutura de cada coluna (tipo, nullable, default)
- ✅ Foreign keys e relacionamentos
- ✅ Índices e constraints
- ✅ Regras de negócio
- ✅ Fluxos de autenticação (login, 2FA, logout)
- ✅ Fluxos de autorização (RBAC, hierarquia)
- ✅ Sistema de email (templates, logs, configurações)
- ✅ Sistema 2FA (configurações, códigos, validação)
- ✅ Auditoria e logs
- ✅ Segurança (proteções, rate limiting, etc)
- ✅ Casos de uso práticos
- ✅ Glossário de termos

**Quando usar:** Para entendimento profundo do sistema, arquitetura e implementação.

---

### 2. 📊 **DIAGRAMAS_SISTEMA_SEGURANCA.md** ⭐ VISUAL
**Diagramas visuais em Mermaid**

**Conteúdo:**
- ✅ Diagrama ER (Entidade-Relacionamento) completo
- ✅ Fluxos de autenticação (sequência)
- ✅ Fluxos de autorização (flowchart)
- ✅ Diagramas de estados (usuário, sessão, 2FA)
- ✅ Diagrama de componentes (arquitetura)
- ✅ Diagramas de sequência (casos de uso)
- ✅ Ciclo de vida de dados
- ✅ Métricas e monitoramento

**Quando usar:** Para visualizar relacionamentos, fluxos e arquitetura do sistema.

**Nota:** Os diagramas Mermaid são renderizados automaticamente no GitHub, VS Code e outros viewers Markdown.

---

### 3. ⚡ **GUIA_RAPIDO_SEGURANCA.md** ⭐ REFERÊNCIA
**Guia rápido para desenvolvedores**

**Conteúdo:**
- ✅ Resumo em 30 segundos
- ✅ Queries SQL mais usadas
- ✅ Operações comuns (criar usuário, dar permissão, etc)
- ✅ Mapeamento de permissões
- ✅ Troubleshooting rápido
- ✅ Referências rápidas (JWT, endpoints, variáveis)
- ✅ Dicas pro
- ✅ Checklist de segurança

**Quando usar:** Para consultas rápidas no dia a dia, queries prontas e troubleshooting.

---

### 4. 📄 **security-tables-analysis.json**
**Análise técnica completa em JSON**

**Conteúdo:**
- ✅ Estrutura de todas as tabelas
- ✅ Tipos de dados de cada coluna
- ✅ Foreign keys
- ✅ Índices
- ✅ Constraints
- ✅ Contagem de registros
- ✅ Amostras de dados

**Quando usar:** Para análise programática, scripts automatizados ou integração com ferramentas.

---

## 🎯 GUIA DE USO

### Para Desenvolvedores Novos no Projeto

1. **Comece aqui:** `GUIA_RAPIDO_SEGURANCA.md`
   - Entenda o básico em 5 minutos
   - Veja queries prontas para usar

2. **Depois leia:** `DOCUMENTACAO_SISTEMA_SEGURANCA.md`
   - Entenda a arquitetura completa
   - Estude os fluxos detalhados

3. **Visualize:** `DIAGRAMAS_SISTEMA_SEGURANCA.md`
   - Veja os relacionamentos visualmente
   - Entenda os fluxos de dados

### Para Desenvolvedores Experientes

1. **Referência rápida:** `GUIA_RAPIDO_SEGURANCA.md`
   - Queries prontas
   - Troubleshooting

2. **Consulta específica:** `DOCUMENTACAO_SISTEMA_SEGURANCA.md`
   - Busque pela tabela ou funcionalidade
   - Veja regras de negócio

### Para Arquitetos / Tech Leads

1. **Visão geral:** `DOCUMENTACAO_SISTEMA_SEGURANCA.md` (seção Arquitetura)
2. **Diagramas:** `DIAGRAMAS_SISTEMA_SEGURANCA.md`
3. **Análise técnica:** `security-tables-analysis.json`

### Para DBAs

1. **Estrutura:** `security-tables-analysis.json`
2. **Queries:** `GUIA_RAPIDO_SEGURANCA.md`
3. **Relacionamentos:** `DOCUMENTACAO_SISTEMA_SEGURANCA.md`

---

## 📊 VISÃO GERAL DO SISTEMA

### Estatísticas

| Métrica | Valor |
|---------|-------|
| **Total de Tabelas** | 13 |
| **Total de Colunas** | 111 |
| **Foreign Keys** | 10 |
| **Índices** | 35+ |
| **Usuários Cadastrados** | 9 |
| **Perfis Disponíveis** | 7 |
| **Permissões Definidas** | 80 |
| **Features do Sistema** | 19 |

### Tabelas por Categoria

**Autenticação (3 tabelas):**
- `users` - Usuários
- `user_sessions` - Sessões ativas
- `login_attempts` - Tentativas de login

**Autorização (6 tabelas):**
- `user_roles` - Perfis
- `user_role_assignments` - Atribuição de perfis
- `permissions` - Permissões
- `role_permissions` - Permissões por perfil
- `user_permissions` - Permissões diretas
- `system_features` - Funcionalidades

**Email (3 tabelas):**
- `email_settings` - Configurações SMTP
- `email_templates` - Templates HTML
- `email_logs` - Logs de envio

**2FA (1 tabela):**
- `system_2fa_settings` - Configurações 2FA

---

## 🔗 RELACIONAMENTOS PRINCIPAIS

```
users (9)
  ├─→ user_role_assignments (9)
  │   └─→ user_roles (7)
  │       └─→ role_permissions (93)
  │           └─→ permissions (80)
  │               └─→ system_features (19)
  ├─→ user_permissions (28)
  └─→ user_sessions (0)
```

---

## 🚀 QUICK START

### Ver permissões de um usuário

```sql
-- Copie e cole no pgAdmin ou psql
SELECT 
  sf.category as recurso,
  p.action as acao
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN role_permissions rp ON ura.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin';
```

### Criar novo usuário

```sql
-- 1. Inserir usuário
INSERT INTO users (username, email, password, nome, ativo)
VALUES ('novo.usuario', 'novo@example.com', '$2b$10$hash...', 'Novo Usuário', true)
RETURNING id;

-- 2. Atribuir perfil (substitua os UUIDs)
INSERT INTO user_role_assignments (user_id, role_id, assigned_by)
VALUES ('uuid-do-novo-usuario', 3, 'uuid-do-admin');
```

### Verificar configurações de email

```sql
SELECT 
  smtp_host,
  smtp_port,
  from_email,
  is_active,
  environment
FROM email_settings
WHERE is_active = true;
```

---

## 📞 SUPORTE

### Dúvidas Frequentes

**Q: Como adicionar uma nova permissão?**
A: Veja `DOCUMENTACAO_SISTEMA_SEGURANCA.md` → Casos de Uso → Caso 3

**Q: Como ativar 2FA para um usuário?**
A: Veja `GUIA_RAPIDO_SEGURANCA.md` → Operações Comuns

**Q: Como ver os logs de login?**
A: Veja `GUIA_RAPIDO_SEGURANCA.md` → Queries Mais Usadas

**Q: Onde estão os diagramas de fluxo?**
A: Veja `DIAGRAMAS_SISTEMA_SEGURANCA.md`

### Problemas Comuns

1. **Usuário não consegue fazer login**
   → `GUIA_RAPIDO_SEGURANCA.md` → Troubleshooting

2. **Permissão negada**
   → `GUIA_RAPIDO_SEGURANCA.md` → Troubleshooting

3. **Email não está sendo enviado**
   → `GUIA_RAPIDO_SEGURANCA.md` → Troubleshooting

4. **2FA não funciona**
   → `GUIA_RAPIDO_SEGURANCA.md` → Troubleshooting

---

## 🔒 SEGURANÇA

### Checklist Rápido

- [x] Senhas hasheadas com bcrypt
- [x] JWT com secret seguro
- [x] 2FA disponível
- [x] Rate limiting implementado
- [x] SQL injection protegido
- [x] Auditoria completa
- [x] Logs de acesso

### Configurações Recomendadas

**Desenvolvimento:**
- 2FA: Opcional
- HTTPS: Não obrigatório
- Rate Limit: Relaxado

**Produção:**
- 2FA: Obrigatório para admins
- HTTPS: Obrigatório
- Rate Limit: Estrito
- Backup: Diário

---

## 📈 MÉTRICAS

### Cobertura da Documentação

| Aspecto | Cobertura |
|---------|-----------|
| **Tabelas** | 100% (13/13) |
| **Colunas** | 100% (111/111) |
| **Relacionamentos** | 100% (10/10) |
| **Fluxos** | 100% |
| **Casos de Uso** | 5 principais |
| **Queries Prontas** | 15+ |
| **Diagramas** | 10+ |

### Documentos

| Documento | Páginas | Palavras | Linhas de Código |
|-----------|---------|----------|------------------|
| DOCUMENTACAO_SISTEMA_SEGURANCA.md | ~50 | ~8,000 | ~200 SQL |
| DIAGRAMAS_SISTEMA_SEGURANCA.md | ~30 | ~3,000 | ~500 Mermaid |
| GUIA_RAPIDO_SEGURANCA.md | ~15 | ~2,000 | ~100 SQL |
| **TOTAL** | **~95** | **~13,000** | **~800** |

---

## 🎯 ROADMAP DA DOCUMENTAÇÃO

### ✅ Concluído

- [x] Documentação completa das 13 tabelas
- [x] Diagramas ER
- [x] Fluxos de autenticação e autorização
- [x] Guia rápido de referência
- [x] Queries SQL prontas
- [x] Casos de uso práticos
- [x] Troubleshooting

### 📝 Futuro (se necessário)

- [ ] Vídeos tutoriais
- [ ] Exemplos de código (TypeScript)
- [ ] Testes automatizados de documentação
- [ ] Swagger/OpenAPI para APIs
- [ ] Postman collection

---

## 📝 CHANGELOG

### Versão 2.0 (2025-10-08)
- ✅ Documentação completa criada
- ✅ Diagramas visuais adicionados
- ✅ Guia rápido criado
- ✅ Análise JSON gerada
- ✅ Índice geral criado

### Versão 1.0 (2025-08-21)
- ✅ Sistema implementado
- ✅ Tabelas criadas
- ✅ Dados iniciais inseridos

---

## 🤝 CONTRIBUINDO

Para atualizar esta documentação:

1. **Mudou estrutura de tabela?**
   - Atualize `DOCUMENTACAO_SISTEMA_SEGURANCA.md`
   - Regenere `security-tables-analysis.json`
   - Atualize diagramas se necessário

2. **Adicionou nova funcionalidade?**
   - Documente em `DOCUMENTACAO_SISTEMA_SEGURANCA.md`
   - Adicione query em `GUIA_RAPIDO_SEGURANCA.md`
   - Crie diagrama se aplicável

3. **Encontrou erro?**
   - Corrija o documento
   - Atualize versão no changelog

---

## 📧 CONTATO

**Dúvidas sobre a documentação?**
- Consulte primeiro os documentos listados acima
- Verifique o troubleshooting no guia rápido
- Revise os casos de uso na documentação completa

---

**Última atualização:** 2025-10-08  
**Versão:** 2.0  
**Mantenedor:** Equipe de Desenvolvimento Net Imobiliária


