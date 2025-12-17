# 🧪 Testes - Funcionalidade de Geolocalização por IP

**Data:** 2025-11-15  
**Status:** ✅ Implementação Completa - Aguardando Testes

---

## 📋 Checklist de Testes

### **TESTE 1: Verificar Compilação e Lint**

- [ ] Executar `npm run build` - deve compilar sem erros
- [ ] Executar `npm run lint` - não deve ter erros de lint
- [ ] Verificar console do navegador - não deve ter erros de runtime

**Comando:**
```bash
npm run build
npm run lint
```

---

### **TESTE 2: Testar API de Geolocalização**

#### **2.1. Teste Manual via Browser/Postman**

**URL:** `http://localhost:3000/api/public/geolocation`  
**Método:** GET

**Resultado Esperado:**
```json
{
  "success": true,
  "data": {
    "city": "São Paulo",
    "region": "São Paulo",
    "country": "Brazil",
    "ip": "xxx.xxx.xxx.xxx"
  },
  "cached": false
}
```

**Verificações:**
- [ ] Status 200 OK
- [ ] Retorna cidade, região e país
- [ ] IP está presente na resposta
- [ ] Campo `cached` indica se veio do cache

#### **2.2. Teste de Rate Limiting**

**Ação:** Fazer 11 requisições seguidas para a mesma API

**Resultado Esperado:**
- [ ] Primeiras 10 requisições: Status 200
- [ ] 11ª requisição: Status 429 (Too Many Requests)
- [ ] Mensagem: "Muitas requisições. Tente novamente mais tarde."

#### **2.3. Teste de Cache**

**Ação:** 
1. Fazer primeira requisição
2. Fazer segunda requisição imediatamente

**Resultado Esperado:**
- [ ] Primeira: `cached: false`
- [ ] Segunda: `cached: true` (dentro de 5 minutos)

---

### **TESTE 3: Testar Modal de Geolocalização**

#### **3.1. Primeiro Acesso (Sem localStorage)**

**Ação:**
1. Abrir DevTools → Application → Local Storage
2. Limpar todas as chaves relacionadas a geolocalização:
   - `geolocation-modal-shown`
   - `geolocation-modal-dismissed`
   - `geolocation-city`
   - `geolocation-region`
   - `geolocation-country`
3. Recarregar página `/landpaging`
4. Aguardar 1-2 segundos

**Resultado Esperado:**
- [ ] Modal aparece após ~1 segundo
- [ ] Modal exibe cidade detectada
- [ ] Modal tem botões "Entendi" e "Fechar"
- [ ] Modal tem checkbox "Não mostrar novamente"
- [ ] Console mostra logs de detecção

**Logs Esperados no Console:**
```
🔍 [LANDING PAGE] Detectando localização do usuário...
🔍 [GEOLOCATION API] Requisição recebida para IP: xxx.xxx.xxx.xxx
✅ [GEOLOCATION API] Localização detectada: { city: "...", region: "...", country: "..." }
✅ [LANDING PAGE] Localização detectada: { city: "...", region: "...", country: "..." }
```

#### **3.2. Fechar Modal**

**Ação:**
1. Clicar em "Entendi" ou "Fechar"

**Resultado Esperado:**
- [ ] Modal desaparece
- [ ] Página continua funcionando normalmente
- [ ] `localStorage` tem `geolocation-modal-shown: 'true'`

#### **3.3. Recarregar Página Após Fechar**

**Ação:**
1. Fechar modal (teste anterior)
2. Recarregar página

**Resultado Esperado:**
- [ ] Modal NÃO aparece novamente
- [ ] Console mostra: "Geolocalização já foi mostrada ou usuário pediu para não mostrar"

#### **3.4. Checkbox "Não Mostrar Novamente"**

**Ação:**
1. Limpar localStorage novamente
2. Recarregar página
3. Marcar checkbox "Não mostrar novamente"
4. Clicar em "Entendi" ou "Fechar"
5. Recarregar página

**Resultado Esperado:**
- [ ] `localStorage` tem `geolocation-modal-dismissed: 'true'`
- [ ] Modal NÃO aparece em recarregamentos futuros
- [ ] Console confirma que usuário optou por não mostrar

---

### **TESTE 4: Testar em Diferentes Cenários**

#### **4.1. IP Localhost (Desenvolvimento)**

**Cenário:** Acessar de `localhost` ou `127.0.0.1`

**Resultado Esperado:**
- [ ] API retorna erro apropriado (IP inválido)
- [ ] Modal NÃO aparece (não bloqueia experiência)
- [ ] Console mostra aviso sobre IP inválido
- [ ] Página funciona normalmente

#### **4.2. Erro de Rede**

**Cenário:** Desconectar internet temporariamente

**Resultado Esperado:**
- [ ] API retorna erro
- [ ] Modal NÃO aparece (não bloqueia experiência)
- [ ] Console mostra erro
- [ ] Página funciona normalmente

#### **4.3. API Externa Indisponível**

**Cenário:** API ip-api.com temporariamente fora do ar

**Resultado Esperado:**
- [ ] Timeout após 5 segundos
- [ ] Modal NÃO aparece (não bloqueia experiência)
- [ ] Console mostra erro de timeout
- [ ] Página funciona normalmente

---

### **TESTE 5: Verificar Performance**

#### **5.1. Tempo de Carregamento**

**Ação:**
1. Abrir DevTools → Network
2. Recarregar página
3. Verificar tempo de requisição `/api/public/geolocation`

**Resultado Esperado:**
- [ ] Requisição completa em < 2 segundos (normal)
- [ ] Timeout em 5 segundos se API lenta
- [ ] Não bloqueia carregamento da página

#### **5.2. Cache Funcionando**

**Ação:**
1. Fazer primeira requisição
2. Fazer segunda requisição imediatamente

**Resultado Esperado:**
- [ ] Segunda requisição retorna instantaneamente (cache)
- [ ] `cached: true` na resposta

---

### **TESTE 6: Verificar Conformidade com GUARDIAN RULES**

#### **6.1. Incremental e Não Destrutivo**

- [ ] Funcionalidades existentes continuam funcionando
- [ ] Nenhum código existente foi removido
- [ ] Apenas novos arquivos foram criados

#### **6.2. Segurança**

- [ ] Rate limiting funcionando (teste 2.2)
- [ ] Validação de IP funcionando
- [ ] Erros não expõem informações sensíveis

#### **6.3. Performance**

- [ ] Cache funcionando (teste 5.2)
- [ ] Não bloqueia carregamento da página
- [ ] Timeout implementado

---

## 🔍 Testes do Assistente (Antes de Enviar)

### **Teste 1: Verificar Estrutura de Arquivos**

```bash
# Verificar se arquivos foram criados
ls src/lib/services/geolocationService.ts
ls src/app/api/public/geolocation/route.ts
ls src/components/public/GeolocationModal.tsx
```

### **Teste 2: Verificar Imports**

- [ ] `landpaging/page.tsx` importa `GeolocationModal`
- [ ] API route importa `getClientIP` e `getGeolocationByIP`
- [ ] Serviço importa `getClientIP`

### **Teste 3: Verificar Lint**

```bash
npm run lint
```

---

## 🚨 Rollback (Se Necessário)

Se algo não funcionar, seguir instruções em:
`database/migrations/rollback_geolocalizacao.sql`

**Passos Rápidos:**
1. Remover import de `GeolocationModal` em `landpaging/page.tsx`
2. Remover estados de geolocalização
3. Remover função `detectUserLocation`
4. Remover `useEffect` de detecção
5. Remover componente `<GeolocationModal>` do JSX
6. Deletar arquivos criados (listados no script de rollback)

---

## ✅ Critérios de Sucesso

A implementação é considerada **bem-sucedida** se:

1. ✅ Modal aparece no primeiro acesso
2. ✅ Modal não aparece em acessos subsequentes
3. ✅ Checkbox "Não mostrar novamente" funciona
4. ✅ API retorna cidade corretamente
5. ✅ Rate limiting funciona
6. ✅ Cache funciona
7. ✅ Erros não quebram a experiência
8. ✅ Funcionalidades existentes continuam funcionando
9. ✅ Sem erros de compilação ou lint
10. ✅ Performance adequada (< 2s para API)

---

**Pronto para testes!** 🚀








