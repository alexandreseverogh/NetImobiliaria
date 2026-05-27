# Estratégia de Branches e Deploy por Módulos

**Data:** 2026-05-04  
**Status:** 📋 Planejamento  
**Prioridade:** 🚨 CRÍTICA (pré-requisito para trabalho paralelo)

---

## 1. Estado Atual

| Item | Valor |
|---|---|
| Branch atual | `main` (única) |
| Remote | `origin` → GitHub (`alexandreseverogh/NetImobiliaria`) |
| Deploy script | `scripts/vps/deploy-github.sh` — **já aceita branch como parâmetro** |
| GitHub Actions | `.github/workflows/deploy.yml` — **já aceita branch via `workflow_dispatch`** |
| VPS | Produção (`prod_app`) + Staging (`staging_app`) via `docker-compose.vps.yml` |

> **Ponto positivo:** A infraestrutura de deploy **já está preparada** para trabalhar com múltiplas branches. O que falta é a **estratégia de uso** e pequenos ajustes no workflow.

---

## 2. Modelo de Branches Proposto: "Trunk-Based com Feature Branches Longas"

Este modelo é o mais adequado para o seu cenário: uma equipe pequena, módulos grandes e independentes, e necessidade de testar cada módulo antes de integrar.

```
main (produção estável)
  │
  ├── feature/crm          ← Módulo CRM (em andamento)
  │     ├── commits diários
  │     └── deploy para staging para testes
  │
  ├── feature/mensageria   ← Módulo Mensageria (futuro)
  │     ├── commits diários
  │     └── deploy para staging para testes
  │
  ├── feature/chatbots     ← Módulo Chatbots (futuro)
  │
  ├── feature/media-s3     ← Migração de Mídia (BYTEA → S3)
  │
  └── hotfix/xxx           ← Correções urgentes em produção
```

### Regras de Ouro

1. **`main`** = Produção. Só recebe código **testado e aprovado**.
2. **`feature/*`** = Cada módulo vive em sua branch. Deploy para **staging** para testes.
3. **`hotfix/*`** = Correções urgentes. Criada a partir de `main`, mergeada de volta para `main` **E** para todas as `feature/*` ativas.
4. **Nunca** se faz commit direto em `main`. Tudo passa por **Pull Request (PR)** com revisão.

---

## 3. Fluxo de Trabalho Diário

### 3.1. Trabalhar em um Módulo (ex: CRM)

```bash
# 1. Criar a branch (uma única vez)
git checkout main
git pull origin main
git checkout -b feature/crm

# 2. Trabalhar normalmente (commits diários)
git add .
git commit -m "feat(crm): implementar listagem de leads"
git push origin feature/crm

# 3. Deploy para STAGING (via GitHub Actions)
# → No GitHub, vá em Actions → "Deploy Manual"
# → Branch: feature/crm
# → Ambiente: staging
```

### 3.2. Sincronizar com `main` (manter branch atualizada)

```bash
# Periodicamente (1x por semana ou quando main receber hotfix)
git checkout feature/crm
git pull origin main    # Traz mudanças de main para dentro da sua branch
# Resolver conflitos se houver
git push origin feature/crm
```

### 3.3. Módulo Pronto → Merge para Main

```bash
# 1. No GitHub, abrir Pull Request:
#    feature/crm → main
# 2. Revisão do código
# 3. Testes em staging aprovados
# 4. Merge (Squash & Merge recomendado para histórico limpo)
# 5. Deploy de main para produção via GitHub Actions
```

### 3.4. Hotfix Urgente em Produção

```bash
# 1. Criar hotfix a partir de main
git checkout main
git pull origin main
git checkout -b hotfix/corrigir-login-500

# 2. Corrigir e commitar
git commit -m "fix: corrigir erro 500 no login"
git push origin hotfix/corrigir-login-500

# 3. PR → main (merge rápido)
# 4. Deploy de main para produção

# 5. IMPORTANTE: Propagar o fix para branches ativas
git checkout feature/crm
git pull origin main
git push origin feature/crm
```

---

## 4. Mapeamento Branch → Ambiente no Deploy

| Branch | Ambiente VPS | Container | Domínio |
|---|---|---|---|
| `main` | Produção | `prod_app` | `www.imovtec.com.br` |
| `feature/*` | Staging | `staging_app` | `staging.imovtec.com.br` |
| `hotfix/*` | Staging (teste rápido) | `staging_app` | `staging.imovtec.com.br` |

> **Nota:** Como a VPS tem apenas **1 ambiente de staging**, só uma feature branch pode estar em staging por vez. Isso é intencional: força a disciplina de testar um módulo de cada vez antes de integrar.

---

## 5. Ajuste no GitHub Actions Workflow

O workflow atual já aceita branch, mas só oferece "producao" como ambiente. Vamos adicionar "staging":

```yaml
# .github/workflows/deploy.yml — Alteração proposta
name: 🚀 Deploy Manual

on:
  workflow_dispatch:
    inputs:
      branch:
        description: 'Branch para fazer deploy'
        required: true
        default: 'main'
        type: string
      ambiente:
        description: 'Ambiente de destino'
        required: true
        default: 'producao'
        type: choice
        options:
          - producao
          - staging          # ← NOVO
```

E no script SSH, adicionar lógica para staging:

```yaml
      # No step de deploy SSH, ajustar o script:
      script: |
        set -e
        BRANCH="${{ github.event.inputs.branch }}"
        AMBIENTE="${{ github.event.inputs.ambiente }}"

        # Proteção: só main pode ir para produção
        if [ "$AMBIENTE" == "producao" ] && [ "$BRANCH" != "main" ]; then
          echo "❌ BLOQUEADO: Apenas a branch 'main' pode ser deployada em produção!"
          echo "   Use staging para testar a branch '$BRANCH' primeiro."
          exit 1
        fi

        # ... resto do deploy
```

---

## 6. Ajuste no `deploy-github.sh`

O script já suporta branches, mas precisa de suporte ao ambiente **staging**:

```bash
# Adicionar no bloco de reiniciar serviço (seção 5):

if [ "$AMBIENTE" == "staging" ]; then
  log "   → Build APP para STAGING"
  docker build \
    -t "net-imobiliaria-staging_app:latest" \
    -f "$BASE_DIR/Dockerfile.prod" \
    "$TARGET_SOURCE"

  log "   → Build FEED para STAGING"
  docker build \
    -t "net-imobiliaria-staging_feed:latest" \
    -f "$BASE_DIR/Dockerfile.feed" \
    "$TARGET_SOURCE"

  docker compose -f "$BASE_DIR/docker-compose.vps.yml" up -d --no-build staging_app staging_feed

  # Aplicar migrations no banco de staging
  bash "$BASE_DIR/scripts/vps/apply-migrations.sh" staging || true
fi
```

---

## 7. Branches Planejadas (Roadmap)

| Branch | Módulo | Status | Prioridade |
|---|---|---|---|
| `main` | Core (Imóveis, Proprietários, Auth, Sidebar) | ✅ Ativa | — |
| `feature/crm` | CRM (Leads, Pipeline, Prospecção) | 🔜 Criar agora | Alta |
| `feature/media-s3` | Migração BYTEA → MinIO | 🔜 Criar após CRM estabilizar | Alta |
| `feature/mensageria` | WhatsApp, Email Marketing | 📋 Futuro | Média |
| `feature/chatbots` | Bots de atendimento | 📋 Futuro | Média |
| `feature/agentes-ia` | Agentes de IA (Plano Estratégico) | 📋 Futuro | Baixa |

---

## 8. Comandos de Referência Rápida

```bash
# ============================================
# CRIAR BRANCH DE MÓDULO
# ============================================
git checkout main
git pull origin main
git checkout -b feature/crm
git push -u origin feature/crm

# ============================================
# TRABALHO DIÁRIO
# ============================================
git add .
git commit -m "feat(crm): descrição da mudança"
git push

# ============================================
# SINCRONIZAR COM MAIN
# ============================================
git checkout feature/crm
git pull origin main
# resolver conflitos se houver
git push

# ============================================
# DEPLOY PARA STAGING (via terminal, sem GitHub Actions)
# ============================================
# Na VPS via SSH:
cd ~/net-imobiliaria
./scripts/vps/deploy-github.sh feature/crm staging

# ============================================
# MERGE PARA PRODUÇÃO (via GitHub)
# ============================================
# 1. Abrir PR: feature/crm → main
# 2. Aprovar e mergear
# 3. GitHub Actions: Deploy Manual → main → producao
```

---

## 9. Proteções Recomendadas no GitHub

Para evitar erros humanos, configure no GitHub → Settings → Branches:

1. **Branch Protection Rule para `main`:**
   - ✅ Require pull request before merging
   - ✅ Require approvals (1 aprovação mínima)
   - ✅ Require status checks to pass (se tiver CI)
   - ✅ Do not allow bypassing the above settings
   - ❌ Allow force pushes → **Desabilitado**
   - ❌ Allow deletions → **Desabilitado**

2. **Branch naming convention** (recomendação):
   - `feature/*` — Novos módulos
   - `hotfix/*` — Correções urgentes
   - `release/*` — Preparação de releases (futuro)

---

## 10. Próximos Passos Imediatos

1. [ ] **Criar a branch `feature/crm`** a partir de `main` com o estado atual do código
2. [ ] **Atualizar o workflow** `deploy.yml` para incluir opção "staging"
3. [ ] **Adicionar proteção** na branch `main` no GitHub
4. [ ] **Atualizar `deploy-github.sh`** com suporte a staging
5. [ ] **Testar o fluxo completo:** push em `feature/crm` → deploy staging → validar → PR → merge → deploy produção

---

**Documento gerado seguindo GUARDIAN_RULES.md**  
**Última atualização:** 2026-05-04
