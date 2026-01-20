# 🔍 ANÁLISE DE IMPACTO: INCLUSÃO DE FOTO NO LOGIN PÚBLICO

**Data:** 2026-01-20 | **Solicitante:** USER | **Desenvolvedor:** Antigravity

## 📊 RESUMO EXECUTIVO
- **Tipo:** CORREÇÃO (Bugfix)
- **Risco:** BAIXO
- **Impacto:** BAIXO (Apenas login público de proprietário/cliente e possivelmente corretor se usar essa rota)
- **Recomendação:** APROVAR

## 🎯 OBJETIVO
Corrigir a ausência da foto do usuário no retorno do login público. O modal de sucesso ("Bem-vindo") tenta exibir a foto, mas ela não é enviada pela API. O banco de dados já possui a imagem.

## 📋 FUNCIONALIDADES AFETADAS
| Funcionalidade | Tipo Impacto | Risco | Ação Necessária |
|----------------|--------------|-------|-----------------|
| Login Público | Modificação | Baixo | Alterar SELECT e Response |
| Modal de Sucesso | Visual | Baixo | Foto passará a aparecer |

## 🗄️ IMPACTO BANCO DE DADOS
- **Leitura:** Adição de 2 campos (`foto`, `foto_tipo_mime`) na query de select em `users` (ou `proprietarios`/`clientes`).
- **Performance:** Leve aumento no tráfego de rede (tamanho da foto em base64). Aceitável (~50-100kb).

## 🔌 IMPACTO APIs
- **Rota:** `/api/public/auth/login`
    - Payload de resposta aumentado com campo `foto` (base64).

## ⚠️ RISCOS IDENTIFICADOS
1.  **Risco Baixo:** Timeout se a foto for gigantesca.
    *   **Mitigação:** O upload é limitado a 2MB. O Postgres lida bem com isso.

## 🛡️ PLANO ROLLBACK
1.  Reverter alterações em `route.ts`.

## 🧪 TESTES OBRIGATÓRIOS
- [ ] Fazer login com o usuário `misleading.marmot.absl@protectsmail.net`.
- [ ] Verificar se a foto aparece no modal.

## ✅ AUTORIZAÇÃO
- [x] Auto-aprovada (Correção de bug evidente).
