## Testes Automatizados – Validações de Cadastros (Público)

- **Script**: `scripts/test-validacoes-cadastro.ts`
- **Objetivo**: validar automaticamente comportamentos críticos já exigidos pelo usuário:
  - Bloqueio de TAB quando o CPF está inválido
  - Bloqueio de TAB quando o e-mail é duplicado
  - Endpoint público `/api/public/check-email` retornando `exists = true` para e-mails já cadastrados

### Pré-requisitos
- Node 18+ (já requerido pelo projeto Next.js 14)
- Instalar Playwright e suas dependências:
  ```bash
  npm install -D playwright
  npx playwright install
  ```
- Garantir que a aplicação está rodando em `http://localhost:3000`
  ```bash
  npm run dev
  ```

### Execução
```bash
npx ts-node scripts/test-validacoes-cadastro.ts
```

### Variáveis opcionais
- `BASE_URL`: redefine a URL alvo (ex.: `BASE_URL=http://localhost:4000 npx ts-node ...`).

### O que o script faz
1. Abre a landing page (`/landpaging`), aciona o modal de cadastro e executa testes no formulário público de **clientes** usando Playwright.
2. Confere se:
   - O foco permanece no campo CPF quando o valor é inválido e a mensagem “CPF inválido” aparece.
   - O foco permanece no campo Email quando o valor já existe e a mensagem “Email já cadastrado” aparece.
3. Chama a API `/api/public/check-email` para validar o retorno `exists = true` para um e-mail conhecido.
4. Exibe um resumo (✔/✖) por cenário e encerra com `exit(1)` se alguma verificação falhar.

### Extensões sugeridas
- Incluir testes para o fluxo de cadastro de **proprietários** (público) reutilizando as mesmas funções auxiliares.
- Adicionar uma camada para login/admin e reproduzir o mesmo padrão de validações nos formulários protegidos (`/admin/clientes/novo`, `/admin/proprietarios/novo`).
- Integrar o script em um pipeline (ex.: GitHub Actions) executando `npm install -D playwright` apenas em ambientes de QA.


