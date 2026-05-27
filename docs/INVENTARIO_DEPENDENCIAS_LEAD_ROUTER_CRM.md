# 📦 Inventário de Dependências: Roteamento de Leads CRM (v2.0)

**Data:** 30 de Março de 2026  
**Objetivo:** Mapear tabelas e colunas necessárias para o motor de distribuição sem interferir nos módulos legados.

---

## 🏛️ Banco de Dados (PostgreSQL)

### 1. Tabelas de Entrada (Leads)
- `leads_staging`: Base de novos leads do CRM.
    - **⚠️ GAP IDENTIFICADO:** Faltam as colunas de geolocalização (`estado_fk`, `cidade_fk`) na estrutura atual para suportar leads genéricos (sem imóvel vinculado).
    - **Ação Recomendada:** Criar migration `063_add_geo_to_staging.sql` para suportar roteamento por área de atuação.
    - Campos necessários: `lead_uuid`, `imovel_id`, `estado_fk`, `cidade_fk`.

### 2. Tabelas de Consulta (Contexto)
- `imoveis`: Para identificar o dono da captação.
    - Campos: `id`, `corretor_fk`.
- `users`: Base de corretores candidatos.
    - Campos: `id`, `nome`, `email`, `ativo`, `tipo_corretor`, `is_plantonista`.
- `corretor_areas_atuacao`: Para mapeamento geográfico.
    - Campos: `corretor_fk`, `estado_fk`, `cidade_fk`.
- `parametros`: Para limites e SLAs dinâmicos (Sem Hardcoding).
    - `proximos_corretores_recebem_leads` (Int)
    - `proximos_corretores_recebem_leads_internos` (Int)
    - `sla_minutos_aceite_lead` (Int - Externo)
    - `sla_minutos_aceite_lead_interno` (Int - Interno)

### 3. Tabelas de Saída (Atribuição)
- `leads_kanban`: Para posicionar o lead por coluna.
- `leads_staging.corretor_atribuido_id`: Para persistir a decisão do motor.

---

## 🏗️ Arquitetura de Código (Next.js)

### Novos Arquivos (Isolamento Total):
1. `src/lib/routing/distributionEngine.ts`: O "Cérebro" unificado que decide o destino do lead.
    - Independente de rotas HTTP.
    - Recebe dados estruturados e retorna um `userId`.

### Arquivos Modificados (Integração Segura):
1. `src/app/api/crm/leads/route.ts`: Apenas para chamar o motor após o `INSERT` do lead.
    - **Risco:** Zero para o `admin` e `landpaging`, pois esta API é exclusiva da Staging do CRM.

### Futura Refatoração (Para evitar duplicação):
1. `src/lib/routing/prospectRouter.ts`: Será atualizado para utilizar o `distributionEngine.ts` **somente após testes exaustivos** no CRM, garantindo que o fluxo do site nunca quebre.

---

## 🛡️ Checklist de Segurança (Guardian Rules)

- [ ] Validar se `corretor_fk` existe em todos os imóveis (Tratar fallback se nulo).
- [ ] Validar se todos os `parametros` de SLA estão presentes (Tratar fallback se nulo).
- [ ] Garantir que o `Plantonista` sempre existe como fallback final.
- [ ] Usar `pool.query` com transações para evitar inconsistência de atribuição.
