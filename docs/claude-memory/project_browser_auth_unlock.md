---
name: project-browser-auth-unlock
description: "Como obter uma sessão autenticada de verdade no navegador para este projeto — resolve a limitação 'verificação visual impossível' registrada em dezenas de sessões anteriores"
metadata:
  type: project
---

# Verificação visual no navegador — resolvida (2026-07-27)

## O que estava documentado (e estava incompleto)

Dezenas de sessões anteriores (ver `docs/CHECKPOINT.md`, histórico extenso) concluíram que
"verificação visual no navegador não é possível neste projeto" — a hipótese repetida era que
`useAuth`/`/me` client-side sempre redireciona pra `/admin/login`, mesmo com um cookie JWT
válido (`admin_auth_token`) injetado manualmente, inclusive com `userId` real.

**Essa conclusão estava incompleta.** Só o cookie nunca foi suficiente porque ninguém tinha
testado setar o `localStorage` também.

## Causa raiz real

`useAuth.checkAuthentication()` (`src/hooks/useAuth.tsx:94`) lê o token de
`localStorage.getItem('admin-auth-token')` — **nunca do cookie**. O cookie
(`admin_auth_token`) só é checado pelo `middleware.ts` (server-side, valida só o formato —
3 partes separadas por ponto) pra decidir se a navegação server-side passa. Depois que a
página carrega, o componente cliente `AuthProvider` roda seu próprio check independente
lendo `localStorage`, e se não achar nada lá, redireciona pra
`/admin/login?error=session_expired` — **mesmo com o cookie presente e válido**.

Confirmado ao vivo: um JWT fabricado com o `userId` **real** de um usuário existente
(`admmd`, `67c62443-b022-4517-b7d8-bb90b8af38fd`, tenant Marketing Digital) funciona
perfeitamente assim que o localStorage também é populado — sessão completa, navegação livre
por qualquer página do admin, cliques reais, formulários reais.

## Playbook para sessões futuras

```js
// 1. Gerar o JWT (Node, fora do navegador) com o userId REAL de um usuário existente
//    (não um placeholder tipo 'a0000000-...') + o JWT_SECRET real do .env.local:
const jwt = require('jsonwebtoken');
const token = jwt.sign({
  userId: '<uuid-real-de-um-usuario-existente>',
  username: '<username>', tenantId: '<tenant-uuid>',
  role_name: 'ADMIN', role_level: 99, is_system_role: true,
  permissoes: {}, auditConfigs: [],
}, JWT_SECRET, { expiresIn: '2h' });

// 2. No navegador (via javascript_tool ou similar), setar cookie E localStorage:
document.cookie = "admin_auth_token=" + TOKEN + "; path=/";
fetch('/api/admin/auth/me', { headers: { Authorization: 'Bearer ' + TOKEN } })
  .then(r => r.json())
  .then(data => {
    localStorage.setItem('admin-auth-token', TOKEN);
    localStorage.setItem('admin-user-data', JSON.stringify(data.user));
  });

// 3. Navegar normalmente (ou dar reload) — sessão válida, admin completo acessível.
```

Achar o `userId` real: `SELECT id, username FROM public.users WHERE username = '<user>';`.

## Por que sessões anteriores nunca acharam isso

Ninguém tinha lido `useAuth.tsx` de ponta a ponta com essa pergunta específica — o
diagnóstico sempre parou em "o cookie não segura a sessão" e concluiu (razoavelmente, mas
incorretamente) que o problema era do lado do servidor (`/me` rejeitando o token). A prova
que quebrou essa suposição foi um `fetch('/api/admin/auth/me', {...})` direto do console do
navegador **antes** de tentar a navegação completa — retornou 200 com dado real, provando que
o backend nunca foi o problema.

**Why:** economiza a re-investigação completa (que já consumiu tempo em múltiplas sessões
anteriores) toda vez que uma tarefa precisar de verificação visual real de uma tela
autenticada deste admin.

**How to apply:** sempre que uma tarefa neste projeto pedir "verificar no navegador" uma tela
sob `/admin/*`, usar este playbook primeiro — não presumir que é impossível, e não gastar
tempo tentando só o cookie.
