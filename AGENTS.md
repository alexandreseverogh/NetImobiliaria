# Regra de Sincronização de Contexto e Documentação Viva (AI Sync)

Sempre que iniciar uma nova sessão ou tiver seu contexto resetado, você DEVE LER OBRIGATORIAMENTE o arquivo `docs/AI_SYNC.md` e a estrutura de documentação viva em `docs/`.

---

## ⚠️ Regra Obrigatória — Manutenção da Documentação Viva

Sempre que você (IA / Agente) criar novas funcionalidades, alterar rotas de API, adicionar modelos no Prisma ou modificar comportamentos no sistema, **DEVE OBRIGATORIAMENTE**:

1. **Atualizar a Documentação Técnica (`docs/01_...` a `docs/10_...` ou `docs/15_...` a `docs/17_...`)** descrevendo as alterações técnicas e modelos de dados.
2. **Atualizar o Manual do Usuário (`docs/20_...` a `docs/26_...`)** adicionando o passo a passo de como o usuário final/operador deve pilotar a nova funcionalidade.
3. Se for uma decisão de arquitetura relevante, registrar um novo arquivo em `docs/adr/`.
