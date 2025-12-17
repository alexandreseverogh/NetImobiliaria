# 🔧 CORREÇÃO: Autenticação das APIs da Sidebar

**Data:** 26/10/2025  
**Status:** ✅ CONCLUÍDO  
**Tipo:** Bug Fix  

---

## 🎯 Problema Identificado

As rotas da API da sidebar (`/api/admin/sidebar/*`) estavam falhando com erro **401 Unauthorized** mesmo com usuário autenticado.

### ❌ **Erro Original:**
```
{"success":false,"message":"Usuário não autenticado"}
```

### 🔍 **Causa Raiz:**
A função `getUserIdFromRequest` estava decodificando manualmente o JWT de forma **incorreta**, usando uma abordagem insegura que falhava com caracteres especiais no Base64URL:

```typescript
// ❌ ABORDAGEM INCORRETA
const payload = JSON.parse(Buffer.from(cookie.value.split('.')[1], 'base64').toString());
```

---

## ✅ Solução Implementada

Substituição da decodificação manual por uso da função oficial `verifyTokenNode` que:
- ✅ Valida a assinatura HMAC SHA256
- ✅ Verifica expiração do token
- ✅ Decodifica corretamente o Base64URL
- ✅ Trata erros adequadamente

```typescript
// ✅ ABORDAGEM CORRETA
import { verifyTokenNode } from '@/lib/auth/jwt-node';

function getUserIdFromRequest(request: NextRequest): string | null {
  try {
    const cookie = request.cookies.get('accessToken');
    if (cookie?.value) {
      const payload = verifyTokenNode(cookie.value);
      return payload?.userId || null;
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const payload = verifyTokenNode(token);
      return payload?.userId || null;
    }

    return null;
  } catch (error) {
    console.error('Erro ao extrair userId:', error);
    return null;
  }
}
```

---

## 📝 Arquivos Corrigidos

1. ✅ `src/app/api/admin/sidebar/menu/route.ts`
2. ✅ `src/app/api/admin/sidebar/menu-items/route.ts`
3. ✅ `src/app/api/admin/sidebar/menu-items/[id]/route.ts`

---

## 🧪 Teste de Verificação

### **Antes da Correção:**
```bash
GET http://localhost:3000/api/admin/sidebar/menu
# Resposta: {"success":false,"message":"Usuário não autenticado"}
```

### **Após a Correção:**
```javascript
// No console do navegador (usuário logado):
fetch('/api/admin/sidebar/menu', { credentials: 'include' })
  .then(res => res.json())
  .then(data => console.log(data));

// Resposta esperada:
{
  "success": true,
  "menuItems": [...],
  "count": 29
}
```

---

## 🎯 Próximos Passos

1. ✅ Testar a API no navegador após login
2. ⏭️ Prosseguir com FASE 2: Refatorar `AdminSidebar.tsx`

---

## 📚 Referências

- Função `verifyTokenNode`: `src/lib/auth/jwt-node.ts`
- Implementação HMAC SHA256
- Validação de expiração
- Decodificação Base64URL segura

