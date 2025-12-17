# 🔧 Configuração da API de Tradução - 100% GRATUITA

## 🎯 Objetivo
Configurar tradução automática para feeds internacionais usando APIs **100% GRATUITAS**.

---

## ✅ CONFIGURAÇÃO AUTOMÁTICA (Recomendado)

**BOA NOTÍCIA:** O sistema já está configurado para usar APIs gratuitas por padrão!

### Não é necessário configurar nada - funciona automaticamente:
1. ✅ **LibreTranslate** (instância pública gratuita)
2. ✅ **MyMemory** (fallback automático)

**Apenas execute:**
```bash
node scripts/seed_feed.js
```

---

## 📋 OPÇÃO 1: LibreTranslate (Recomendado - Open-Source)

### Usar Instância Pública (Mais Fácil - Padrão)
**Não requer configuração!** O sistema usa automaticamente: `https://libretranslate.com`

### Ou Self-Hosted (Mais Controle)
Se quiser usar sua própria instância:

1. **Instalar LibreTranslate:**
   ```bash
   docker run -ti --rm -p 5000:5000 libretranslate/libretranslate
   ```

2. **Adicionar ao .env.local:**
   ```bash
   LIBRETRANSLATE_URL=http://localhost:5000
   ```

**Benefícios:**
- ✅ 100% gratuito
- ✅ Open-source
- ✅ Sem limites (self-hosted)
- ✅ Privacidade total

---

## 📋 OPÇÃO 2: MyMemory (Fallback Automático)

**Não requer configuração!** O sistema usa automaticamente como fallback.

**Características:**
- ✅ 100% gratuito
- ✅ Sem API key necessária
- ⚠️ Limite: 10.000 palavras/dia
- ✅ Funciona automaticamente

---

## 📋 OPÇÃO 3: Google Translate (Opcional - Paga após limite)

### 1.1 Acessar Google Cloud Console
1. Acesse: https://console.cloud.google.com/
2. Faça login com sua conta Google

### 1.2 Criar ou Selecionar Projeto
1. No topo da página, clique no dropdown de projetos
2. Clique em **"Novo Projeto"**
3. Nome: `Net Imobiliaria Feed Translation`
4. Clique em **"Criar"**

### 1.3 Ativar Cloud Translation API
1. No menu lateral, vá em **"APIs e Serviços"** → **"Biblioteca"**
2. Busque por **"Cloud Translation API"**
3. Clique em **"Cloud Translation API"**
4. Clique em **"Ativar"**

### 1.4 Criar Credencial (API Key)
1. Vá em **"APIs e Serviços"** → **"Credenciais"**
2. Clique em **"+ Criar Credenciais"** → **"Chave de API"**
3. **IMPORTANTE:** Clique em **"Restringir chave"**
4. Em **"Restrições de API"**, selecione **"Restringir chave"**
5. Selecione apenas **"Cloud Translation API"**
6. Clique em **"Salvar"**
7. **Copie a chave** (ela só aparece uma vez!)

---

## 📋 PASSO 2: Configurar no Projeto

### 2.1 Adicionar ao .env.local

Abra o arquivo `.env.local` na raiz do projeto e adicione:

```bash
# Google Translate API Key para tradução de feeds internacionais
GOOGLE_TRANSLATE_API_KEY=sua-chave-api-aqui
```

**Substitua `sua-chave-api-aqui` pela chave que você copiou no Passo 1.4**

### 2.2 Verificar Arquivo

O arquivo `.env.local` deve conter algo como:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=net_imobiliaria
DB_USER=postgres
DB_PASSWORD=sua-senha

# Google Translate API Key para tradução de feeds internacionais
GOOGLE_TRANSLATE_API_KEY=AIzaSyCxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 📋 PASSO 3: Testar Configuração

Execute o script de teste:

```bash
node scripts/test-translation.js
```

**Resultado esperado:**
```
✅ Tradução funcionando!
Texto original: Real estate market trends
Texto traduzido: Tendências do mercado imobiliário
```

---

## 📋 PASSO 4: Executar Seed com Fontes Internacionais

Após confirmar que a tradução está funcionando:

```bash
node scripts/seed_feed.js
```

Isso irá:
1. Adicionar fontes internacionais ao banco
2. Buscar feeds RSS
3. Filtrar conteúdo relacionado ao mercado imobiliário
4. **Traduzir automaticamente para português**
5. Salvar no banco de dados

---

## 💰 CUSTOS

### Google Translate API - Tier Gratuito:
- **500.000 caracteres/mês GRÁTIS**
- Após isso: $20 por 1 milhão de caracteres

### Estimativa de Uso:
- ~14 fontes internacionais
- ~50-100 posts/dia
- ~500 caracteres por post (título + resumo)
- **Total:** ~25.000-50.000 caracteres/dia
- **Mensal:** ~750.000-1.500.000 caracteres

**Recomendação:** 
- Primeiro mês: Gratuito (500k caracteres)
- Após isso: ~$5-15/mês (muito barato para o valor agregado)

---

## 🔒 SEGURANÇA

### Boas Práticas:
1. ✅ **SEMPRE** restrinja a API key apenas para Cloud Translation API
2. ✅ **NUNCA** commite a API key no Git
3. ✅ Use `.env.local` (já está no .gitignore)
4. ✅ Monitore uso no Google Cloud Console

---

## 🆘 TROUBLESHOOTING

### Erro: "API key not valid"
- Verifique se copiou a chave corretamente
- Verifique se a API está ativada
- Verifique se a chave está restrita apenas para Cloud Translation API

### Erro: "Quota exceeded"
- Você atingiu o limite gratuito (500k caracteres/mês)
- Aguarde reset mensal ou upgrade do plano

### Tradução não funciona
- Verifique logs do servidor
- Execute script de teste
- Verifique variável de ambiente

---

## ✅ CHECKLIST

- [ ] Criado projeto no Google Cloud
- [ ] Ativada Cloud Translation API
- [ ] Criada API Key restrita
- [ ] Adicionada chave ao `.env.local`
- [ ] Testado tradução (script de teste)
- [ ] Executado seed com fontes internacionais
- [ ] Verificado logs de tradução no servidor

---

## 📞 SUPORTE

Se tiver problemas:
1. Verifique logs do servidor
2. Execute script de teste
3. Verifique Google Cloud Console para erros de API
4. Consulte documentação: `docs/FEED_INTERNACIONAL_TRADUCAO.md`

