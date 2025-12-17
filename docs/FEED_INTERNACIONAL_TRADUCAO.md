# 🌍 Feed Internacional com Tradução Automática

## 📋 Visão Geral

Sistema implementado para buscar feeds de mercado imobiliário de fontes internacionais e traduzir automaticamente para português brasileiro antes de exibir na página.

---

## 🔧 CONFIGURAÇÃO

### Opção 1: Google Translate API (Recomendado - Melhor Qualidade)

1. **Obter API Key:**
   - Acesse: https://console.cloud.google.com/
   - Crie um projeto ou selecione existente
   - Ative a API "Cloud Translation API"
   - Crie uma credencial (API Key)
   - **Tier Gratuito:** 500.000 caracteres/mês grátis

2. **Configurar variável de ambiente:**
   ```bash
   # .env.local
   GOOGLE_TRANSLATE_API_KEY=sua-api-key-aqui
   ```

### Opção 2: LibreTranslate (Open-Source, Self-Hosted)

1. **Instalar LibreTranslate:**
   ```bash
   docker run -ti --rm -p 5000:5000 libretranslate/libretranslate
   ```

2. **Configurar variável de ambiente:**
   ```bash
   # .env.local
   LIBRETRANSLATE_URL=http://localhost:5000
   ```

### Opção 3: MyMemory (Gratuita, com limites)

- **Não requer configuração** - funciona automaticamente como fallback
- **Limite:** 10.000 palavras/dia
- **Qualidade:** Boa para textos curtos

---

## 📰 FONTES INTERNACIONAIS CONFIGURADAS

### Fontes Brasileiras (já em português)
- InfoMoney - Mercados
- Exame - Investimentos
- Casa Vogue
- CoinTelegraph Brasil

### Fontes Internacionais (serão traduzidas)
- **Reuters Real Estate** (EUA)
- **Bloomberg Real Estate** (EUA)
- **Wall Street Journal Real Estate** (EUA)
- **Forbes Real Estate** (EUA)
- **ArchDaily** (Internacional - Arquitetura)
- **Dezeen Architecture** (Reino Unido)
- **PropTech News** (EUA - Tecnologia)
- **Real Estate Tech News** (EUA)
- **CoinTelegraph Real Estate** (Internacional - Tokenização)

---

## 🔄 COMO FUNCIONA

### Fluxo de Processamento:

```
1. Cron Job busca feed RSS internacional
   ↓
2. Parseia itens do feed
   ↓
3. Filtra conteúdo relacionado ao mercado imobiliário
   ↓
4. Detecta idioma do título e resumo
   ↓
5. Se não for português → Traduz para PT-BR
   ↓
6. Salva no banco de dados (já traduzido)
   ↓
7. Exibe na página em português
```

### Detecção de Idioma:

O sistema detecta automaticamente o idioma usando heurísticas:
- **Português:** Palavras como "imóvel", "casa", "apartamento"
- **Inglês:** Palavras como "real estate", "property", "house"
- **Espanhol:** Palavras como "inmueble", "casa", "propiedad"

### Tradução:

- **Título:** Sempre traduzido se não for português
- **Resumo:** Traduzido se não for português
- **Link Original:** Mantido original (abre site original)
- **Imagem:** Mantida original

---

## ⚙️ CONFIGURAÇÃO DE VARIÁVEIS DE AMBIENTE

Adicione ao `.env.local`:

```bash
# Opção 1: Google Translate (Recomendado)
GOOGLE_TRANSLATE_API_KEY=sua-chave-aqui

# Opção 2: LibreTranslate (Self-hosted)
LIBRETRANSLATE_URL=http://localhost:5000

# Se nenhuma das opções acima estiver configurada,
# o sistema usará MyMemory como fallback automático
```

---

## 📊 BENEFÍCIOS

### 1. **Mais Conteúdo**
- **Antes:** ~5 fontes brasileiras
- **Depois:** ~14 fontes (brasileiras + internacionais)
- **Aumento:** ~180% mais conteúdo disponível

### 2. **Melhor Qualidade**
- Acesso a fontes premium (Bloomberg, Reuters, WSJ)
- Conteúdo atualizado de mercados globais
- Tendências internacionais traduzidas

### 3. **Diversidade**
- Mercado financeiro internacional
- Arquitetura e design global
- PropTech e inovação mundial
- Tokenização imobiliária internacional

---

## 🚀 USO

### Adicionar Nova Fonte Internacional:

1. Edite `scripts/seed_feed.js`
2. Adicione nova entrada em `sourcesToSeed`:
   ```javascript
   {
     nome: 'Nome da Fonte',
     url: 'https://fonte.com/rss',
     categoria_slug: 'categoria',
     idioma: 'en' // ou 'es', 'fr', etc.
   }
   ```
3. Execute o seed: `node scripts/seed_feed.js`

### Executar Tradução Manual:

O sistema traduz automaticamente durante a coleta. Para testar tradução manual:

```typescript
import { translateToPortuguese } from '@/lib/services/translationService';

const textoTraduzido = await translateToPortuguese(
  'Real estate market trends',
  'en'
);
console.log(textoTraduzido); // "Tendências do mercado imobiliário"
```

---

## ⚠️ LIMITAÇÕES E CONSIDERAÇÕES

### Google Translate API:
- ✅ Melhor qualidade de tradução
- ✅ Suporta muitos idiomas
- ⚠️ Requer API key (gratuita até 500k caracteres/mês)
- ⚠️ Pode ter custos após limite gratuito

### LibreTranslate:
- ✅ 100% gratuito e open-source
- ✅ Self-hosted (privacidade total)
- ⚠️ Requer servidor próprio
- ⚠️ Qualidade ligeiramente inferior ao Google

### MyMemory:
- ✅ Totalmente gratuito
- ✅ Não requer configuração
- ⚠️ Limite de 10.000 palavras/dia
- ⚠️ Qualidade variável

---

## 🔍 MONITORAMENTO

O sistema registra logs detalhados:

```
🌐 [FeedService] Idioma detectado: en para título: Real estate...
🔄 [FeedService] Traduzindo título de en para português...
✅ [FeedService] Título traduzido: Mercado imobiliário...
```

Verifique os logs do servidor para acompanhar o processo de tradução.

---

## 📝 PRÓXIMOS PASSOS

- [ ] Configurar Google Translate API Key
- [ ] Executar seed para adicionar fontes internacionais
- [ ] Monitorar qualidade das traduções
- [ ] Ajustar palavras-chave de filtro se necessário
- [ ] Considerar cache de traduções para otimizar

---

## 🆘 TROUBLESHOOTING

### Tradução não funciona:
1. Verifique variáveis de ambiente
2. Verifique logs do servidor
3. Teste API de tradução manualmente
4. Sistema usa fallback automático se API falhar

### Qualidade ruim:
1. Considere usar Google Translate (melhor qualidade)
2. Ajuste detecção de idioma se necessário
3. Revise palavras-chave de filtro

### Limite de API atingido:
1. Google Translate: Upgrade de plano ou aguardar reset mensal
2. MyMemory: Aguardar reset diário ou usar outra API
3. LibreTranslate: Sem limites (self-hosted)

