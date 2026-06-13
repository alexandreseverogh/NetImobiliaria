# 🖥️ Setup em Nova Máquina — net-imobiliaria

> Checklist para clonar e rodar o projeto em outro computador com **100% de continuidade**
> (código + dados + memória do Claude). Atualizado em 2026-06-13.

---

## Pré-requisitos no computador de destino

- **Git**, **Node.js** (versão compatível com Next.js 14) e **npm**
- **Docker** (Postgres 17, Redis, MinIO) — mesma stack da máquina de origem
- **Claude Code** instalado
- O arquivo **`netimob-transfer.zip`** (gerado na máquina de origem — ver Passo 0)

---

## Passo 0 — Na máquina de ORIGEM (antes de migrar)

Gera o pacote com os arquivos que o Git **não** versiona (`.env.local` + `public/uploads/`):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\transfer-export.ps1
```

Resultado: `netimob-transfer.zip` no **Desktop**. Leve-o ao **Desktop do computador de destino**
(pen drive, OneDrive ou nuvem).

> ⚠️ O zip contém **credenciais** (`.env.local`). Nunca suba ao Git nem compartilhe publicamente.
> Apague-o das duas máquinas após a transferência.

---

## Passos no computador de DESTINO

### 1. Clonar o repositório
```powershell
git clone https://github.com/alexandreseverogh/NetImobiliaria.git "C:\NetImobiliária\net-imobiliaria"
cd "C:\NetImobiliária\net-imobiliaria"
```

### 2. Restaurar `.env.local` + uploads
Com o `netimob-transfer.zip` no Desktop:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\transfer-import.ps1
```
Isso recoloca `.env.local` na raiz e `public/uploads/` no lugar.

### 3. Instalar dependências
```powershell
npm install
```

### 4. Banco de dados
- Suba os containers Docker (Postgres na porta **15432**, banco `net_imobiliaria`).
- Restaure o **backup** do banco.
- Confirme que o `.env.local` aponta para `DB_HOST=127.0.0.1` / `DB_PORT=15432`.

### 5. Subir a aplicação
```powershell
npm run dev
```
Acesse `http://localhost:3000`.

---

## ✅ Checklist de validação (prova de 100%)

- [ ] `npm run dev` sobe na porta 3000 **sem erros**
- [ ] Login em `/admin/login` funciona (banco + `JWT_SECRET` do `.env.local`)
- [ ] Dashboard `/admin/campanhas/dashboard` exibe os dados do backup restaurado
- [ ] Imagens de criativos/imóveis aparecem (uploads restaurados)
- [ ] **Memória do Claude:** abrir o Claude **de dentro de** `C:\NetImobiliária\net-imobiliaria`
      e perguntar *"qual o estado atual do projeto?"* — ele deve citar a sessão 2026-06-13
      e as regras multi-segmento (prova de que `CLAUDE.md` + `docs/claude-memory/` carregaram)

---

## 🧠 Como a memória do Claude viaja (importante)

A memória é **portável via git** — não depende de nome de usuário do Windows nem de caminho:

| Fonte | Conteúdo | Como chega |
|---|---|---|
| `CLAUDE.md` | Instruções do projeto, convenções, arquitetura | `git clone` |
| `@docs/CHECKPOINT.md` | Estado atual: última tarefa, pendências, próximos passos | `git clone` |
| `@docs/claude-memory/` | Perfil, preferências, decisões e regras de negócio acumuladas | `git clone` |

**Requisito único:** rodar o Claude **a partir da pasta do projeto** para o `CLAUDE.md` ser detectado.

> A auto-memory "viva" nativa do Claude (`~/.claude/projects/<cwd>/memory/`) começa vazia na nova
> máquina e isso é esperado — o contexto vem do snapshot versionado em `docs/claude-memory/`.
> Ao acumular novas decisões importantes, reflita-as no `CHECKPOINT.md` e/ou em `docs/claude-memory/`
> e faça commit, para manterem-se portáveis.

---

## 🔧 Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| App não sobe / erro de conexão DB | `.env.local` ausente ou banco não restaurado | Rodar `transfer-import.ps1`; conferir Docker/porta 15432 |
| Login em loop / 500 | Pool de conexões esgotado ou `JWT_SECRET` divergente | Conferir `.env.local`; reiniciar containers |
| Imagens quebradas | `public/uploads/` não restaurado | Rodar `transfer-import.ps1` novamente |
| Claude "não lembra" do projeto | Rodando fora da pasta do projeto | Iniciar o Claude de dentro de `C:\NetImobiliária\net-imobiliaria` |
| `transfer-import.ps1`: "Zip nao encontrado" | Zip fora do Desktop | Mover `netimob-transfer.zip` para o Desktop do PC de destino |

---

## 📌 Itens que NÃO vão no Git (por design)

`.env.local`, `public/uploads/`, `node_modules/`, `.next/`, e lixo de debug
(`cron_debug.txt`, `scripts/*.mjs` de diagnóstico, `.claude/launch.json`). Os dois primeiros são
cobertos pelos scripts de transferência; o resto é recriado (`npm install`, build) ou descartável.
