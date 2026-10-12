---
name: feedback-user-tests-not-claude
description: "Depois de implementar algo, sempre pedir para o usuario testar — nunca testar sozinho via navegador/automação"
metadata:
  type: feedback
---

Usuário interrompeu explicitamente uma sessão em que eu estava gerando um JWT de teste e
abrindo o Browser pane pra validar uma correção sozinho, e disse: "eu testarei... sempre que
implementar algo peça para que eu teste, SEMPRE, e não você aqui".

**Why:** o usuário quer ser o responsável por validar as mudanças no navegador — não confia
(ou não quer depender d)o meu teste automatizado via JWT fabricado/browser pane como critério
de "funcionando". Isso é uma preferência de fluxo de trabalho, não uma dúvida pontual.

**How to apply:** depois de implementar e confirmar que o código compila (`npx tsc --noEmit`
ou equivalente), **parar aí** — não abrir o Browser pane, não gerar JWT de teste, não navegar
pra verificar visualmente. Resumir o que foi feito e pedir explicitamente pro usuário testar.
Só fazer verificação própria no navegador se o usuário pedir de volta (ex.: "pode testar você
mesmo dessa vez") ou retirar essa preferência explicitamente. Vale pra qualquer página/feature
desta aplicação, não só `/admin/master/auditoria` (onde isso foi dito).
