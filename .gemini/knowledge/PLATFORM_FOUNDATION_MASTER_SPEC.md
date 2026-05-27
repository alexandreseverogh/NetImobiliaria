# 📘 ESPECIFICAÇÃO MESTRE DA FUNDAÇÃO v5.1 (THE ARCHITECT)

Este documento detalha cada micro-ação da transição para uma plataforma de classe mundial.

---

## 🏗️ PILLAR 1: INTELIGÊNCIA E GOVERNANÇA

### 1.1 Consolidação do Cérebro Documental
- **Escopo:** Criação da infraestrutura `.gemini` que serve de bússola para a IA.
- **Micro-actions:**
  - Instalação dos "Guardas de Compliance" (scripts que impedem commits fora do padrão).
  - Escrita dos SSDs fundamentais (Core, IAM, Ingestion).
- **Tests:** Execução de scripts de linting de documentação.
- **Rollback:** Retorno ao modelo de documentação externa ou root.

---

## 🔐 PILLAR 2: IDENTIDADE E MULTI-TENANCY (SSO & MEMBERSHIP)

### 2.1 Desacoplamento Identidade vs Vínculo
- **Escopo:** Separar o usuário do seu contrato com a empresa.
- **Micro-actions:**
  - Refatorar tabela `users` (Identidade Global).
  - Criar `user_tenant_membership` (Status, Role, Vínculo Por Empresa).
- **Tests:** Simular demissão em um Tenant e verificar persistência em outros.
- **Rollback:** Manter a coluna `role` em `users` como fallback dinâmico.

---

## 🏛️ PILLAR 3: ADMINISTRAÇÃO MASTER (PLATAFORMA)

### 3.1 Painel Master e Segment Manager UI
- **Escopo:** Interface para você (Dono) criar empresas e mercados.
- **Micro-actions:**
  - Desenvolver o "Blueprint Creator": Interface onde se define campos, kanban e cognição de novos segmentos (Saúde, etc).
  - Implementar o "Tenant Provisioner": Cadastro de CNPJ, Subdomínio e módulos contratados.
- **Tests:** Criar um segmento "Automotivo" via UI e validar carregamento instantâneo.
- **Rollback:** Cadastro manual direto no SQL para garantir continuidade se a UI falhar.

---

## 🧠 PILLAR 4: MOTOR AGNÓSTICO E COGNIÇÃO I.A.

### 4.1 Ingestão Universal e Bridge de Cognição
- **Escopo:** Receber dados de qualquer fonte e traduzir em intenções ativas.
- **Micro-actions:**
  - Implementar `Tag_Cognicao` como objeto JSONB.
  - Desenvolver o "Matchmaking Engine": Script que usa o `IntentTag` para disparar queries parametrizadas no banco de estoque/serviços.
- **Tests:** Lead envia "perto de escolas" -> Sistema traz 3 matches em < 1s.
- **Rollback:** Fallback para busca textual simples configurável.

---

## 🚀 PILLAR 5: DEVOPS E DEPLOYMENT INDEPENDENTE

### 5.1 Estrutura Monorepo e Pipelines de Isolamento
- **Escopo:** Garantir que uma correção no Site não quebre o CRM.
- **Micro-actions:**
  - Separação física em `/apps` e `/packages`.
  - Configurar Dockerfiles para omitir código de domínios estranhos (Hardening).
- **Tests:** Tentar "quebrar" o build do Admin inserindo erro proposital no CRM.
- **Rollback:** Branch de emergência com estrutura monolítica.

### 5.2 Roteamento por Domínio (Multi-Vitrine Strategy)
- **Escopo:** Sustentar múltiplos domínios (ex: `imovtec.com.br` e `saudetec.com.br`) no mesmo motor.
- **Micro-actions:**
  - Implementar middleware de detecção de `Host` header.
  - Criar mapeamento no banco: `Domain -> SegmentContext`.
  - Configurar o Caddy (Reverse Proxy) para aceitar múltiplos Hostnames apontando para o mesmo container.
- **Tests:** Simular acesso via `Host: imovtec.com.br` e validar carregamento do módulo imobiliário.
- **Rollback:** Retornar ao roteamento fixo por variável de ambiente.

### 📸 ANEXO: RELATÓRIO DE AUDITORIA DE INFRAESTRUTURA (FOTO v1.0)
*Mapeamento realizado em 08/04/2026 para garantia de Zero Downtime.*

| Item | Estado Atual (v1.0) | Observação de Segurança |
| :--- | :--- | :--- |
| **Orquestrador** | Docker Compose v2 | Rodando `prod_app` e `staging_app` |
| **Proxy Reverso** | Caddy 2 (Alpine) | SSL Automático via Let's Encrypt |
| **Base de Dados** | Postgres 17 (Alpine) | Volumes isolados para Prod e Staging |
| **Usuário Docker** | `nextjs` (UID: 1001) | **Ponto Positivo:** Já roda sem privilégios de root |
| **Ambiente** | Staging em porta paralela | **Garantia:** Permite teste do "Módulo Sombra" |
| **Contextos de Build** | Root-based (`COPY . .`) | **Ação Futura:** Mover para build modular |

---

## ⚔️ PILLAR 6: CYBERSECURITY E HARDENING

### 6.1 Defesa contra Intrusão e RLS
- **Escopo:** Proteção contra hackers, malwares e vazamento de dados entre empresas.
- **Micro-actions:**
  - Ativar Row Level Security (RLS) em TODAS as tabelas críticas.
  - Implementar Honeytokens (armadilhas de intrusão).
- **Tests:** Simular tentativa de escalação de privilégio entre Tenants.
- **Rollback:** Bypass temporário em cache de servidor se RLS causar lentidão crítica.

---

## ⚡ PILLAR 7: ALTA PERFORMANCE E OTIMIZAÇÃO

### 7.1 Pipeline de Performance Universal
- **Escopo:** Garantir percepção de "velocidade instantânea".
- **Micro-actions:**
  - Geração automática de WebP/Avif para Landpages.
  - Índices GIN otimizados para as buscas cognitivas (JSONB).
- **Tests:** Google Lighthouse acima de 95 em dispositivos móveis.
- **Rollback:** Servir imagens originais e bypass em índices se houver deadlock.

---

## 📊 PILLAR 8: GESTÃO DE MUTAÇÃO DE DADOS (SQL MIGRATIONS)

### 8.1 Protocolo de Sincronia Local/VPS
- **Escopo:** Garantir que nenhuma alteração de banco seja esquecida na produção.
- **Micro-actions:**
  - Criar pasta `database/migrations/v5_foundation/` para scripts isolados da nova fase.
  - Implementar o `DEPLOY_MANIFEST.md` na pasta `.gemini/compliance/`.
- **Regra de Ouro:** Cada arquivo `.sql` deve obrigatoriamente ter um arquivo `.rollback.sql` correspondente antes de ser aplicado.
- **Tests:** Rodar migração e rollback em ambiente de staging antes de marcar como válida.
- **Rollback:** Execução do script `.rollback.sql` correspondente ao ID da falha.
