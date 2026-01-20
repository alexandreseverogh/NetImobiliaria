# 🔍 ANÁLISE DE IMPACTO: FILTRO LIVRE DE CIDADES EM ÁREAS DE ATUAÇÃO

**Data:** 2026-01-20 | **Solicitante:** USER | **Desenvolvedor:** Antigravity

## 📊 RESUMO EXECUTIVO
- **Tipo:** MELHORIA / ALTERAÇÃO DE LÓGICA
- **Risco:** BAIXO
- **Impacto:** BAIXO
- **Recomendação:** APROVAR

## 🎯 OBJETIVO
Alterar o comportamento do filtro de "Cidade" na página de Áreas de Atuação do Corretor (`/corretor/areas-atuacao`). Atualmente, o filtro exibe apenas cidades que possuem imóveis ativos (via `useEstadosCidades` / `locais-ativos`). O requisito é exibir **todas as cidades do estado selecionado**, similar ao comportamento do cadastro de Novo Imóvel.

## 📋 FUNCIONALIDADES AFETADAS
| Funcionalidade | Tipo Impacto | Risco | Ação Necessária |
|----------------|--------------|-------|-----------------|
| Áreas de Atuação (Corretor) | Modificação | Baixo | Alterar hook para buscar lista completa |
| Hook `useEstadosCidades` | Modificação | Médio | Adicionar suporte a modo 'all' sem quebrar 'active' (default) |
| API Public Municipios | Criação | Baixo | Criar rota pública para servir JSON de municípios |

## 🗄️ IMPACTO BANCO DE DADOS
- **Nenhum.** A nova listagem virá de um arquivo JSON estático (`src/lib/admin/municipios.json`), não do banco de dados.

## 🔌 IMPACTO APIs
- **Nova Rota:** `/api/public/municipios`
    - Retorna o JSON completo de estados e municípios.
    - Necessário pois `/api/admin/municipios` pode ter restrições de permissão ou semântica incorreta para uso público.

## 🎨 IMPACTO FRONTEND
- **Arquivo Principal:** `src/app/(with-header)/corretor/areas-atuacao/page.tsx`
- **Hook Compartilhado:** `src/hooks/useEstadosCidades.ts`
    - Será refatorado para aceitar parâmetro `mode?: 'active' | 'all'`.
    - `active` (default): Mantém comportamento atual (busca de `/api/public/locais-ativos`).
    - `all`: Busca de `/api/public/municipios`.

## ⚠️ RISCOS IDENTIFICADOS
1.  **Risco Baixo:** Quebrar outras páginas que usam `useEstadosCidades` (ex: Landpaging).
    *   **Mitigação:** Manter o padrão do hook como `active`. Testar Landpaging após alteração.
2.  **Risco Baixo:** Performance ao carregar JSON grande de municípios no client-side.
    *   **Mitigação:** O JSON tem ~140KB. Aceitável. A rota `/api/admin/municipios` já faz isso.

## 🛡️ PLANO ROLLBACK
1.  Reverter alterações em `src/hooks/useEstadosCidades.ts`.
2.  Reverter alterações em `src/app/(with-header)/corretor/areas-atuacao/page.tsx`.
3.  Excluir rota `/api/public/municipios/route.ts`.
4.  **Tempo estimado:** 5 minutos.

## 🧪 TESTES OBRIGATÓRIOS
- [ ] Verificar se `/corretor/areas-atuacao` lista todas as cidades de um estado (ex: selecionar AC e ver cidades sem imóveis).
- [ ] Verificar se a Landpaging (busca na home) continua listando apenas cidades com imóveis (regressão).
- [ ] Verificar se a adição de área de atuação funciona com uma cidade "nova".

## ✅ AUTORIZAÇÃO
- [x] Análise aprovada (auto-aprovada por baixo risco e solicitação explícita)
