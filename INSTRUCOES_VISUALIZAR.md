# 🎨 INSTRUÇÕES: VISUALIZAR DIAGRAMAS

## ✅ SOLUÇÃO MAIS FÁCIL (Recomendada)

### **Abrir no Navegador**

1. **Localize o arquivo:** `visualizar-diagramas.html`
2. **Clique duas vezes** nele (ou clique com botão direito > Abrir com > Chrome/Edge)
3. **Pronto!** Todos os diagramas aparecem renderizados automaticamente! 🎉

**Vantagens:**
- ✅ Funciona offline
- ✅ Não precisa instalar nada
- ✅ Todos os diagramas em uma página
- ✅ Pode dar zoom
- ✅ Pode imprimir ou salvar como PDF

---

## 📱 OUTRAS OPÇÕES

### **Opção 1: Mermaid Live Editor (Online)**

**Site:** https://mermaid.live/

**Como usar:**
1. Abra o site
2. Copie o código Mermaid de qualquer arquivo `.md`
3. Cole no editor
4. Veja o diagrama instantaneamente!

**Exemplo de código para testar:**
```
graph TD
    A[Usuário] --> B[Login]
    B --> C{2FA?}
    C -->|Sim| D[Código]
    C -->|Não| E[Dashboard]
```

---

### **Opção 2: Extensão do VS Code**

Se você usa VS Code em vez do Cursor:

1. Pressione `Ctrl + Shift + X`
2. Busque: **"Markdown Preview Mermaid Support"**
3. Instale (autor: Matt Bierner)
4. Abra qualquer arquivo `.md`
5. Pressione `Ctrl + Shift + V`

---

### **Opção 3: GitHub**

Se você fizer commit dos arquivos:

```bash
git add DIAGRAMAS_SISTEMA_SEGURANCA.md
git commit -m "docs: adicionar diagramas"
git push
```

Depois abra no GitHub - os diagramas aparecem automaticamente!

---

## 📊 ARQUIVOS COM DIAGRAMAS

1. **DIAGRAMAS_SISTEMA_SEGURANCA.md** - 10+ diagramas
2. **GUIA_ADICIONAR_NOVA_FUNCIONALIDADE.md** - 3 diagramas
3. **TESTE_MERMAID.md** - 4 diagramas de teste
4. **visualizar-diagramas.html** - 7 diagramas principais ⭐

---

## 🎯 RECOMENDAÇÃO

**Use o arquivo HTML:** `visualizar-diagramas.html`

É a forma mais fácil e rápida! Basta dar dois cliques e ver tudo renderizado no navegador.

---

## ❓ DÚVIDAS?

**Os diagramas não aparecem no HTML?**
- Verifique sua conexão com internet (usa CDN do Mermaid)
- Tente outro navegador (Chrome, Edge, Firefox)

**Quer editar os diagramas?**
- Use https://mermaid.live/ para editar visualmente
- Copie o código de volta para o arquivo `.md`

**Quer exportar como imagem?**
- Use https://mermaid.live/
- Clique em "Actions" > "PNG" ou "SVG"


