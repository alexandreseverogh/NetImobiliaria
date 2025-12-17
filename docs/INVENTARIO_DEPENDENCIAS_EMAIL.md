# Inventário de Dependências – Serviços de E-mail & Notificações

**Versão:** 0.1  
**Data:** 07/11/25  
**Relacionado a:** `docs/INVENTARIO_DEPENDENCIAS_SISTEMA.md`

## 1. Visão Geral do Domínio
- **Escopo:** infraestrutura responsável por envio de e-mails transacionais (2FA, notificações administrativas, contato), gerenciamento de templates/configurações, logs de envio e integração com fluxos críticos.
- **Objetivo:** garantir entregabilidade confiável, com configurações centralizadas em banco, templates versionáveis e auditoria completa, alinhado às Guardian Rules (sem hardcoding de credenciais/template, fallback seguro).
- **Componentes-chave:** `src/services/emailService.ts`, tabelas `email_settings`, `email_templates`, `email_logs`, scripts de configuração, integrações com 2FA e fluxos públicos.

## 2. Banco de Dados e Migrações
- **Tabelas:**
  - `email_settings` – credenciais SMTP (`smtp_host`, `smtp_port`, `smtp_secure`, `smtp_username`, `smtp_password`, `from_name`, `from_email`, `is_active`).
  - `email_templates` – templates ativos (`name`, `subject`, `html_content`, `text_content`, `variables`).
  - `email_logs` – histórico de envio (`template_name`, `to_email`, `success`, `error_message`, `sent_at`).
- **Scripts relevantes:**
  - `database/04_create_email_templates.sql`, `database/04_create_email_templates_simple.sql` – cria estrutura e registros iniciais.
  - `database/03_configure_email.bat`, `database/setup_database.bat` – instruções de setup.
- **Constraints:** garantir apenas uma configuração ativa (`is_active`), índices em `email_logs (sent_at)` e `template_name`.

## 3. Serviço de E-mail (`src/services/emailService.ts`)
- **Inicialização:** `initialize()` carrega configurações do banco (Pool Postgres) e templates, cria `nodemailer.Transporter`, verifica conexão (`transporter.verify()`).
- **Templates:** armazenados em `Map` (chave = `template.name`); variáveis substituídas via `{{key}}` em subject/html/text.
- **Envio:**
  - `sendTemplateEmail(templateName, to, variables, attachments)` – usa template e registra log.
  - `sendSimpleEmail(to, subject, htmlContent, textContent)` – fallback sem template.
  - `send2FACode(email, code)` – template `2fa_verification` (expiração 10 min).
- **Logs:** `logEmailSend` salva resultado em `email_logs` (success/error). Falhas de log não derrubam operação principal.
- **Lazy loading:** wrapper `emailService` garante `ensureInitialized()` antes de qualquer envio; `reload()` recarrega configs/templates.
- **Fallback:** credenciais padrão (host localhost) para ambiente dev; Guardian Rules requerem secret em `.env`.
- **Emails complementares:** arquivos `emailServiceHybrid.ts`, `emailServiceSimple.ts` (versões simplificadas/legado) – avaliar ao migrar.

```115:218:src/services/emailService.ts
const template = this.templates.get(templateName)
const info = await this.transporter.sendMail(mailOptions)
await this.logEmailSend(templateName, to, 'success', info.messageId)
```

## 4. Integrações e Consumidores
- **2FA:** `unifiedTwoFactorAuthService.sendCodeByEmail` e `twoFactorAuthService.sendCodeByEmail` consomem `emailService.send2FACode`.
- **Autenticação pública:** fluxo de recuperação/contato pode reutilizar templates (planejamento futuro).
- **Logs & Auditoria:** `email_logs` analisados em relatórios (pendente dashboard específico); garantir integridade.
- **Configurações avançadas:** possibilidade de recarregar templates via painel (planejado; seguir instruções em `docs/INSTRUCOES_ADICIONAR_CONFIG_2FA.md`).

## 5. Segurança e Boas Práticas
- **Credenciais:** nunca hardcode; usar variáveis de ambiente / tabela `email_settings` com acesso restrito.
- **TLS/SSL:** `smtp_secure` configurável; verificar suporte do provedor.
- **Logs de erro:** capturar stack trace (sem expor dados sensíveis), garantir fallback seguro em caso de falha.
- **Attachments:** permitir anexos via `sendTemplateEmail` (validação de tipo/tamanho). Implementar antivirus se necessário.
- **Retentativa:** atualmente não implementado; considerar fila/retry com job scheduler para alta disponibilidade.

## 6. Testes e Checklists Obrigatórios
- **Documentos:** `docs/IMPLEMENTACAO_AUTENTICACAO_PUBLICA_COMPLETA.md`, `docs/INSTRUCOES_EXECUTAR_2FA_SCRIPT.md` (mencionam envios de e-mail), `docs/PROBLEMA_BOTAO_2FA.md` (lições aprendidas).
- **Scripts:** configurar `email_settings` via SQL antes de usar; testar `transporter.verify()` em ambientes de staging.
- **Guardian Checklist:** confirmar template existente antes de usar, validar variáveis obrigatórias, garantir log de envio, testar fallback (erro SMTP).

## 7. Dependências Cruzadas
- **Autenticação/2FA:** envio de códigos depende do serviço.
- **Logs & Auditoria:** falhas/sucesso em e-mail podem ser correlacionadas com tentativas de login.
- **Dashboard futuro:** criar visualização a partir de `email_logs`.
- **Landing público:** formulários de contato/recuperação poderão usar templates (planejar endpoints).

## 8. Plano de Atualização Contínua
1. Atualizar o inventário ao adicionar novos templates/configurações ou serviços de notificação (SMS, push).
2. Incluir testes automáticos (mock SMTP) para garantir envio e formatação de templates.
3. Monitorar métricas de entrega (bounce/spam) – integrar com provedores externos.
4. Documentar processo de rotação de credenciais e backup de templates.

---

**Responsável pela atualização:** _(preencher)_


