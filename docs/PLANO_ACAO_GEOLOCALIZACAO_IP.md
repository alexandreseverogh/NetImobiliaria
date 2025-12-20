# 📋 Plano de Ação - Geolocalização por IP com Modal de Cidade

**Data:** 2025-11-15  
**Status:** 📝 Análise e Planejamento  
**Conformidade:** ✅ GUARDIAN RULES

---

## 🎯 Objetivo

Implementar identificação de geolocalização baseada em IP do usuário que acessa a aplicação pública, identificando a cidade por aproximação e exibindo um modal informativo.

---

## 🔍 ANÁLISE DE IMPACTO - OBRIGATÓRIA (GUARDIAN RULES)

### **1. Escopo da Implementação**

**Funcionalidade Nova:** Identificação de cidade por IP + Modal informativo

**Áreas Afetadas:**
- ✅ **Aplicação Pública** (`src/app/landpaging/page.tsx`)
- ✅ **Nova API Route** (`src/app/api/public/geolocation/route.ts`)
- ✅ **Novo Componente Modal** (`src/components/public/GeolocationModal.tsx`)
- ✅ **Novo Serviço** (`src/lib/services/geolocationService.ts`)
- ✅ **Utilidade Existente** (`src/lib/utils/ipUtils.ts` - REUTILIZAR)

**Áreas NÃO Afetadas:**
- ❌ Aplicação Admin (nenhuma alteração)
- ❌ Banco de dados (sem novas tabelas inicialmente)
- ❌ Funcionalidades existentes (incremental)

### **2. Análise de Dependências**

**Dependências Identificadas:**

1. **`src/lib/utils/ipUtils.ts`** ✅ JÁ EXISTE
   - Função `getClientIP(request)` já implementada
   - Reutilizar sem modificações

2. **Serviço de Geolocalização Externa** ⚠️ NOVO
   - Necessário escolher API gratuita/paga
   - Opções: ipapi.co, ip-api.com, ipgeolocation.io, MaxMind GeoIP2
   - **Recomendação:** ipapi.co (gratuito até 1000 req/dia) ou ip-api.com (gratuito até 45 req/min)

3. **Componente Modal** ⚠️ NOVO
   - Criar seguindo padrão dos modais existentes
   - Reutilizar estilos de `VenderPopup`, `AuthModal`

4. **Estado na Landing Page** ⚠️ NOVO
   - Adicionar estado para controlar modal de geolocalização
   - Não interfere com estados existentes

### **3. Riscos Identificados**

#### **🟢 Riscos Baixos:**
- ✅ Não modifica funcionalidades existentes
- ✅ Não altera banco de dados
- ✅ Não requer autenticação
- ✅ Modal pode ser fechado pelo usuário

#### **🟡 Riscos Médios:**
- ⚠️ **API Externa:** Dependência de serviço terceiro
  - **Mitigação:** Implementar fallback, cache, rate limiting
- ⚠️ **Precisão:** Geolocalização por IP pode ser imprecisa
  - **Mitigação:** Informar "aproximação" no modal
- ⚠️ **Performance:** Chamada externa pode ser lenta
  - **Mitigação:** Cache em localStorage, chamada assíncrona

#### **🔴 Riscos Altos:**
- ❌ Nenhum risco alto identificado (funcionalidade isolada)

### **4. Conformidade com GUARDIAN RULES**

#### **✅ INCREMENTAL SIM, DESTRUTIVO NUNCA**
- ✅ Nova funcionalidade isolada
- ✅ Não remove/modifica código existente
- ✅ Adiciona apenas novos arquivos e estados

#### **✅ REUTILIZAÇÃO DE CÓDIGO**
- ✅ Reutiliza `getClientIP` de `ipUtils.ts`
- ✅ Reutiliza padrão de modais existentes
- ✅ Reutiliza estilos Tailwind já utilizados

#### **✅ SEGURANÇA**
- ✅ Rate limiting obrigatório na API
- ✅ Validação de IP antes de consultar
- ✅ Tratamento de erros adequado
- ✅ Não expõe informações sensíveis

#### **✅ SEM HARDCODING**
- ✅ API key em variável de ambiente
- ✅ URLs de API configuráveis
- ✅ Mensagens em constantes (não hardcoded)

#### **✅ PERFORMANCE**
- ✅ Cache de resultado em localStorage
- ✅ Chamada assíncrona (não bloqueia página)
- ✅ Rate limiting para evitar abuso

---

## 📐 ARQUITETURA DA SOLUÇÃO

### **Fluxo de Funcionamento:**

```
1. Usuário acessa /landpaging
   ↓
2. Componente LandingPage monta
   ↓
3. useEffect detecta primeira visita (localStorage)
   ↓
4. Chama API /api/public/geolocation
   ↓
5. API captura IP (reutiliza getClientIP)
   ↓
6. API consulta serviço externo de geolocalização
   ↓
7. API retorna cidade identificada
   ↓
8. Frontend armazena em localStorage (cache)
   ↓
9. Exibe GeolocationModal com cidade
   ↓
10. Usuário fecha modal (armazena preferência)
```

### **Estrutura de Arquivos:**

```
src/
├── app/
│   ├── api/
│   │   └── public/
│   │       └── geolocation/
│   │           └── route.ts          # NOVO - API de geolocalização
│   └── landpaging/
│       └── page.tsx                  # MODIFICAR - Adicionar estado e modal
├── components/
│   └── public/
│       └── GeolocationModal.tsx      # NOVO - Modal de geolocalização
└── lib/
    ├── services/
    │   └── geolocationService.ts     # NOVO - Serviço de geolocalização
    └── utils/
        └── ipUtils.ts                # REUTILIZAR - getClientIP
```

---

## 🔧 IMPLEMENTAÇÃO DETALHADA

### **FASE 1: Configuração e Serviço de Geolocalização**

#### **1.1. Escolher API de Geolocalização**

**Opção Recomendada: ip-api.com (Gratuito)**
- ✅ 45 requisições/minuto gratuitas
- ✅ Sem API key necessária (até 45 req/min)
- ✅ Retorna cidade, estado, país
- ✅ JSON simples

**Alternativa: ipapi.co**
- ✅ 1000 requisições/dia gratuitas
- ✅ Requer API key (gratuita)
- ✅ Mais precisa

**Decisão:** Usar ip-api.com inicialmente (sem API key), migrar para ipapi.co se necessário.

#### **1.2. Criar Serviço de Geolocalização**

**Arquivo:** `src/lib/services/geolocationService.ts`

```typescript
interface GeolocationResponse {
  city: string | null
  region: string | null
  country: string | null
  success: boolean
  error?: string
}

/**
 * Consulta geolocalização por IP usando serviço externo
 * @param ipAddress - IP do cliente
 * @returns Dados de geolocalização ou null em caso de erro
 */
export async function getGeolocationByIP(ipAddress: string): Promise<GeolocationResponse>
```

**Características:**
- ✅ Validação de IP antes de consultar
- ✅ Tratamento de erros robusto
- ✅ Timeout de 5 segundos
- ✅ Retorna null em caso de falha (não quebra fluxo)

#### **1.3. Variáveis de Ambiente**

**Arquivo:** `.env.local`

```env
# Geolocalização por IP
GEOLOCATION_API_URL=https://ip-api.com/json
GEOLOCATION_API_KEY=  # Opcional (para ipapi.co)
GEOLOCATION_ENABLED=true
GEOLOCATION_CACHE_DURATION=86400000  # 24 horas em ms
```

---

### **FASE 2: API Route de Geolocalização**

#### **2.1. Criar API Route**

**Arquivo:** `src/app/api/public/geolocation/route.ts`

**Funcionalidades:**
- ✅ Captura IP usando `getClientIP(request)` (reutilizar)
- ✅ Valida IP (não aceita IPs locais/privados para consulta externa)
- ✅ Rate limiting: 10 requisições por IP por hora
- ✅ Cache em memória (5 minutos) para evitar consultas repetidas
- ✅ Chama `geolocationService.getGeolocationByIP()`
- ✅ Retorna cidade, estado, país

**Rate Limiting:**
```typescript
import { RateLimiterMemory } from 'rate-limiter-flexible'

const limiter = new RateLimiterMemory({
  points: 10,        // 10 requisições
  duration: 3600     // por hora
})
```

**Estrutura de Resposta:**
```typescript
{
  success: boolean
  data?: {
    city: string
    region: string
    country: string
    ip: string
  }
  error?: string
  cached?: boolean
}
```

---

### **FASE 3: Componente Modal**

#### **3.1. Criar GeolocationModal**

**Arquivo:** `src/components/public/GeolocationModal.tsx`

**Características:**
- ✅ Segue padrão visual dos modais existentes (`VenderPopup`, `AuthModal`)
- ✅ Design responsivo e moderno
- ✅ Ícone de localização (MapPin do lucide-react)
- ✅ Botão "Fechar" e "Entendi"
- ✅ Checkbox opcional: "Não mostrar novamente"
- ✅ Armazena preferência em localStorage

**Props:**
```typescript
interface GeolocationModalProps {
  isOpen: boolean
  onClose: () => void
  city: string
  region?: string
  country?: string
}
```

**Conteúdo do Modal:**
```
🏠 Net Imobiliária

📍 Detectamos que você está em [CIDADE]

Estamos mostrando os melhores imóveis disponíveis na sua região!

[Botão: Entendi] [Botão: Fechar]
[Checkbox: Não mostrar novamente]
```

---

### **FASE 4: Integração na Landing Page**

#### **4.1. Modificar `landpaging/page.tsx`**

**Adicionar Estados:**
```typescript
const [geolocationModalOpen, setGeolocationModalOpen] = useState(false)
const [detectedCity, setDetectedCity] = useState<string | null>(null)
const [geolocationLoading, setGeolocationLoading] = useState(false)
```

**Adicionar useEffect para Detectar Cidade:**
```typescript
useEffect(() => {
  // Verificar se já foi detectado e modal já foi fechado
  const geolocationShown = localStorage.getItem('geolocation-modal-shown')
  const geolocationDismissed = localStorage.getItem('geolocation-modal-dismissed')
  
  if (geolocationShown || geolocationDismissed === 'true') {
    return // Já foi mostrado ou usuário pediu para não mostrar
  }
  
  // Buscar geolocalização
  detectUserLocation()
}, [])
```

**Função de Detecção:**
```typescript
const detectUserLocation = async () => {
  setGeolocationLoading(true)
  try {
    const response = await fetch('/api/public/geolocation')
    const data = await response.json()
    
    if (data.success && data.data?.city) {
      setDetectedCity(data.data.city)
      setGeolocationModalOpen(true)
      localStorage.setItem('geolocation-modal-shown', 'true')
      localStorage.setItem('geolocation-city', data.data.city)
    }
  } catch (error) {
    console.error('Erro ao detectar localização:', error)
    // Não exibir modal em caso de erro (não bloqueia experiência)
  } finally {
    setGeolocationLoading(false)
  }
}
```

**Adicionar Modal no JSX:**
```typescript
<GeolocationModal
  isOpen={geolocationModalOpen}
  onClose={() => {
    setGeolocationModalOpen(false)
  }}
  city={detectedCity || 'sua região'}
  region={/* opcional */}
  country={/* opcional */}
/>
```

---

## 🛡️ CONFORMIDADE COM GUARDIAN RULES

### **✅ Checklist Guardian**

- [x] **Incremental:** Nova funcionalidade isolada
- [x] **Não Destrutivo:** Não remove código existente
- [x] **Reutilização:** Usa `getClientIP` existente
- [x] **Segurança:** Rate limiting implementado
- [x] **Sem Hardcoding:** API URL em variável de ambiente
- [x] **Tratamento de Erros:** Não quebra fluxo em caso de falha
- [x] **Performance:** Cache implementado
- [x] **UX:** Modal pode ser fechado, não intrusivo

### **✅ Regras de Segurança**

- ✅ Rate limiting: 10 req/IP/hora
- ✅ Validação de IP antes de consultar
- ✅ Timeout de 5 segundos na API externa
- ✅ Não expõe informações sensíveis
- ✅ Tratamento de erros sem expor detalhes

### **✅ Regras de Banco de Dados**

- ✅ Não cria/modifica tabelas (inicialmente)
- ✅ Usa apenas localStorage (frontend)
- ✅ Sem operações destrutivas

### **✅ Regras de Performance**

- ✅ Cache em localStorage (24h)
- ✅ Cache em memória na API (5min)
- ✅ Chamada assíncrona (não bloqueia página)
- ✅ Fallback silencioso em caso de erro

---

## 📊 ESTRUTURA DE DADOS

### **localStorage (Frontend):**

```typescript
// Chaves utilizadas:
'geolocation-modal-shown'      // 'true' se já foi mostrado
'geolocation-modal-dismissed'  // 'true' se usuário pediu para não mostrar
'geolocation-city'              // Cidade detectada (cache)
'geolocation-timestamp'         // Timestamp da última detecção
```

### **Cache em Memória (API):**

```typescript
// Map<IP, { city: string, timestamp: number }>
// TTL: 5 minutos
```

---

## 🧪 ESTRATÉGIA DE TESTES

### **Testes Manuais:**

1. ✅ Acessar `/landpaging` pela primeira vez
   - Modal deve aparecer com cidade detectada
2. ✅ Fechar modal e recarregar página
   - Modal não deve aparecer novamente
3. ✅ Marcar "Não mostrar novamente" e fechar
   - Modal não deve aparecer em acessos futuros
4. ✅ Limpar localStorage e acessar novamente
   - Modal deve aparecer novamente
5. ✅ Testar com IP localhost (desenvolvimento)
   - Deve tratar graciosamente (não quebrar)

### **Testes de API:**

1. ✅ GET `/api/public/geolocation` com IP válido
   - Deve retornar cidade
2. ✅ GET `/api/public/geolocation` com rate limit excedido
   - Deve retornar 429
3. ✅ GET `/api/public/geolocation` com IP inválido
   - Deve retornar erro apropriado

---

## 📝 PRÓXIMOS PASSOS (Futuro - Opcional)

### **Melhorias Futuras:**

1. **Persistência no Banco:**
   - Tabela `user_geolocation` para analytics
   - Histórico de localizações por IP

2. **Filtro Automático:**
   - Pré-selecionar cidade detectada no filtro de busca
   - Botão "Usar minha localização" no filtro

3. **Precisão Melhorada:**
   - Usar API paga para maior precisão
   - Combinar com geolocalização do navegador (GPS) se disponível

4. **Analytics:**
   - Dashboard de cidades mais acessadas
   - Relatórios de geolocalização

---

## 📣 CAMPANHAS/ANALYTICS (separado deste plano)

Para manter este documento focado apenas em **Geolocalização por IP**, a parte de **Campanhas (Meta + YouTube), tracking, KPIs, dashboards (Metabase/Superset) e canal Chatbot WhatsApp** foi movida para:

- `docs/PLANO_ACAO_MARKETING_ANALYTICS.md`

**Integração com este plano (geo como dimensão):**
- A cidade/UF detectadas aqui podem ser registradas no tracking (ex.: `marketing_eventos.geo = { city, region, country }`) para estratificar performance por localização.

---

## ⚠️ CONSIDERAÇÕES IMPORTANTES

### **LGPD/Privacidade:**

- ✅ Informar ao usuário que estamos detectando localização
- ✅ Modal já serve como consentimento implícito
- ✅ Não armazenar dados pessoais (apenas cidade aproximada)
- ✅ Opção de não mostrar novamente respeitada

### **Precisão:**

- ⚠️ Geolocalização por IP é aproximada (cidade, não endereço exato)
- ⚠️ IPs de VPN/Proxy podem retornar localização incorreta
- ⚠️ IPs corporativos podem retornar sede da empresa
- ✅ Informar "aproximação" no modal

### **Custos:**

- ✅ ip-api.com: Gratuito até 45 req/min
- ✅ ipapi.co: Gratuito até 1000 req/dia
- ⚠️ Monitorar uso para evitar custos inesperados

---

## 🚀 ORDEM DE IMPLEMENTAÇÃO

### **Passo 1:** Criar Serviço de Geolocalização
- `src/lib/services/geolocationService.ts`
- Testar isoladamente

### **Passo 2:** Criar API Route
- `src/app/api/public/geolocation/route.ts`
- Implementar rate limiting
- Testar com Postman/Thunder Client

### **Passo 3:** Criar Componente Modal
- `src/components/public/GeolocationModal.tsx`
- Testar visualmente

### **Passo 4:** Integrar na Landing Page
- Modificar `src/app/landpaging/page.tsx`
- Adicionar estados e useEffect
- Testar fluxo completo

### **Passo 5:** Testes e Ajustes
- Testar em diferentes cenários
- Ajustar cache e rate limiting se necessário
- Validar UX

---

## 📋 CHECKLIST FINAL

Antes de implementar:

- [x] Análise de impacto completa
- [x] Conformidade com GUARDIAN RULES verificada
- [x] Dependências identificadas
- [x] Riscos mapeados e mitigados
- [x] Estrutura de arquivos definida
- [x] Estratégia de testes planejada
- [x] Considerações de privacidade abordadas

**✅ PRONTO PARA IMPLEMENTAÇÃO**

---

**Última atualização:** 2025-11-15  
**Status:** 📝 Análise Completa - Aguardando Autorização para Implementação

