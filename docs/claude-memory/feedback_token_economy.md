---
name: feedback-token-economy
description: "Usuario quer economia de tokens - respostas concisas, evitar releitura desnecessaria de arquivos"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 65ab4156-0318-4dce-989d-82bf9af09516
---

Usuario pediu explicitamente para configurar Claude Code de forma a nao consumir muitos tokens.
Preferencia por respostas concisas e diretas.

**Why:** Economia de uso e agilidade na interacao.
**How to apply:** Manter CLAUDE.md atualizado para evitar exploracoes repetidas. Usar Glob/Grep antes de ler arquivos inteiros. Respostas curtas. Nao reler arquivos ja conhecidos no contexto. Aproveitar settings.json com permissoes pre-aprovadas para reduzir prompts de confirmacao.
