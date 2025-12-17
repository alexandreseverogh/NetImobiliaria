# 🔍 Instruções de Debug - Geolocalização

**Data:** 2025-11-15  
**Problema:** Modal não exibe cidade

---

## 🚀 Passos para Diagnosticar

### **1. Limpar localStorage e Testar**

**No Console do Navegador (F12):**
```javascript
// Limpar todas as chaves de geolocalização
localStorage.removeItem('geolocation-modal-shown')
localStorage.removeItem('geolocation-modal-dismissed')
localStorage.removeItem('geolocation-city')
localStorage.removeItem('geolocation-region')
localStorage.removeItem('geolocation-country')

// Recarregar página
location.reload()
```

### **2. Verificar Logs no Console**

**Console do Navegador deve mostrar:**
```
🔍 [LANDING PAGE] Detectando localização do usuário...
🔍 [LANDING PAGE] Status da resposta: 200
🔍 [LANDING PAGE] Dados recebidos da API: { success: true, data: {...} }
✅ [LANDING PAGE] Localização detectada: { city: "...", region: "...", country: "..." }
🔍 [GEOLOCATION MODAL] Renderizando com: { city: "...", region: "...", country: "..." }
```

**Console do Servidor deve mostrar:**
```
🔍 [GEOLOCATION API] Requisição recebida para IP: xxx.xxx.xxx.xxx
🔍 [GEOLOCATION] Consultando geolocalização para IP: xxx.xxx.xxx.xxx
🔍 [GEOLOCATION] URL da API: http://ip-api.com/json/xxx.xxx.xxx.xxx?fields=...
🔍 [GEOLOCATION] Resposta da API: { status: "success", city: "...", ... }
✅ [GEOLOCATION] Localização detectada: { city: "...", region: "...", country: "..." }
✅ [GEOLOCATION API] Localização detectada: { city: "...", ... }
```

### **3. Testar API Diretamente**

**No Console do Navegador:**
```javascript
fetch('/api/public/geolocation')
  .then(r => {
    console.log('Status:', r.status)
    return r.json()
  })
  .then(data => {
    console.log('Resposta completa:', data)
    console.log('Success:', data.success)
    console.log('City:', data.data?.city)
  })
  .catch(err => console.error('Erro:', err))
```

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

---

## 🔧 Sobre API Key

### **ip-api.com (API Atual)**

**✅ NÃO precisa de API key para uso básico:**
- Limite gratuito: **45 requisições por minuto**
- Funciona sem autenticação
- HTTP funciona (mas HTTPS é recomendado)

**Quando API key é útil:**
- Mais de 45 req/min
- Uso comercial
- Maior precisão
- Suporte prioritário

**Como obter API key (opcional):**
1. Acessar: https://ip-api.com/docs
2. Criar conta gratuita
3. Obter API key
4. Configurar em `.env.local`:
   ```env
   GEOLOCATION_API_KEY=sua_api_key_aqui
   ```

---

## 🐛 Problemas Comuns e Soluções

### **Problema 1: API retorna erro**

**Sintoma:** Console mostra `status: 'fail'` ou erro 429

**Soluções:**
1. Verificar se não excedeu rate limit (45 req/min)
2. Aguardar alguns minutos e tentar novamente
3. Considerar usar API key (aumenta limite)

### **Problema 2: IP localhost sendo rejeitado**

**Sintoma:** Console mostra "IP inválido ou local"

**Solução:** 
- Em desenvolvimento, isso é esperado
- Testar em produção ou usar IP real
- Ou configurar `LOCAL_IP` no `.env.local`

### **Problema 3: Modal não aparece mesmo com cidade detectada**

**Sintoma:** Console mostra cidade mas modal não aparece

**Verificar:**
```javascript
// No console do navegador, verificar estados
// (precisa estar dentro do componente React)
```

**Solução:** Verificar se `setGeolocationModalOpen(true)` está sendo chamado

### **Problema 4: CORS ou bloqueio de requisição**

**Sintoma:** Erro de CORS ou requisição bloqueada

**Solução:**
- Verificar se API permite requisições do seu domínio
- Considerar usar API alternativa (HG Brasil)
- Ou configurar proxy no Next.js

---

## 🔄 Alternativa: API HG Brasil (Sem Key Necessária)

Se ip-api.com não funcionar, podemos usar HG Brasil:

**Vantagens:**
- ✅ Não precisa API key
- ✅ Focada no Brasil
- ✅ HTTPS nativo

**Configuração:**
```env
GEOLOCATION_API_URL=https://api.hgbrasil.com/geoip/json
```

**Nota:** Seria necessário ajustar o serviço para o formato da resposta da HG Brasil.

---

## 📋 Checklist de Debug

Execute e verifique cada item:

- [ ] Console do navegador mostra logs?
- [ ] Console do servidor mostra logs?
- [ ] Requisição `/api/public/geolocation` funciona?
- [ ] Resposta tem `success: true`?
- [ ] Resposta tem `data.city` ou `city`?
- [ ] Estado `detectedCity` é atualizado?
- [ ] Estado `geolocationModalOpen` é setado para `true`?
- [ ] Modal está sendo renderizado?

---

**Execute os testes e me informe o que aparece nos logs!** 🔍








