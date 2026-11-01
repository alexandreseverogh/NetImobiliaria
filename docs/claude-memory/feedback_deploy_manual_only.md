---
name: feedback-deploy-manual-only
description: Deploy (GitHub Actions workflow_dispatch) é sempre ação manual do usuário, nunca disparar sozinho
metadata:
  type: feedback
---

Nunca disparar o workflow "🚀 Deploy Manual" (`gh workflow run`) por conta própria, mesmo
quando o usuário já aprovou "ir pra produção"/"staging" como destino geral de uma tarefa
(ex.: apontar links de uma campanha pra produção). O ato de DEPLOYAR é sempre do usuário,
feito manualmente por ele na UI do GitHub Actions.

**Por quê:** corrigido pelo usuário em 2026-11-01 — "o deploy sempre está sendo realizado
manualmente por mim no Github Actions" — depois de eu ter rodado `gh workflow run deploy.yml`
sozinho (mesmo com confirmação prévia de "staging primeiro" via AskUserQuestion, a confirmação
era sobre A ESTRATÉGIA, não autorização pra EU apertar o botão).

**Como aplicar:** posso preparar tudo (commit, push, PR, merge — esses sim já são meu trabalho
normal) e posso EXPLICAR como disparar o deploy (branch, ambiente, qual workflow), mas a
chamada real ao `gh workflow run`/clique no Actions fica sempre com o usuário. Se um deploy
já estiver em andamento (disparado antes dessa regra ficar clara), não cancelar no meio sem
perguntar — ver também [[feedback_user_tests_not_claude]] (mesmo princípio: ações de
execução/validação ficam com o usuário, não comigo por padrão).
