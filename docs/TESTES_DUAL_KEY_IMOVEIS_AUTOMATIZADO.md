## Script Automatizado – Imóveis UUID Only

- **Arquivo**: `scripts/Test-DualKeyImoveis.ps1` (atualizado para cenário UUID-only).
- **Objetivo**: validar rapidamente se o endpoint `/api/admin/imoveis/[id]` aceita e persiste apenas `proprietario_uuid`, com rollback opcional.

### Pré-requisitos
- PowerShell com `Invoke-WebRequest` e `psql` no `PATH`.
- Variável `PGPASSWORD` definida (ex.: `$env:PGPASSWORD='Roberto@2007'`).
- Token admin válido (JWT) e identificadores de teste:
  - `ImovelId` (INTEGER sequencial).
  - `ProprietarioUuid` (UUID associado a um proprietário existente).

### Execução
```powershell
cd C:\NetImobiliária\net-imobiliaria

.\scripts\Test-DualKeyImoveis.ps1 `
  -AdminToken "<TOKEN>" `
  -ImovelId 99 `
  -ProprietarioUuid "a96b0169-b0d2-422c-a9b7-b7d9a3408d16"
```

### O que o script faz
1. Realiza snapshot do imóvel atual (GET por ID).
2. Executa PUT usando somente `proprietario_uuid`.
3. Valida a resposta (`proprietario_uuid` retornado).
4. Consulta o banco (`SELECT id, proprietario_uuid FROM imoveis WHERE id = ...`).
5. (Opcional) Reverte para o snapshot original ao final (`-SkipRevert` evita o rollback).

### Mensagens de saída
- Logs amigáveis em português indicando cada etapa (GET, PUT, psql, etc.).
- Erros interrompem a execução imediatamente (`$ErrorActionPreference = 'Stop'`).

### Parâmetros adicionais
- `-BaseUrl`: sobrescreve a URL (default `http://localhost:3000`).
- `-DatabaseUser` / `-DatabaseName`: personalizam credenciais do `psql`.
- `-SkipRevert`: pula o rollback final (útil para manter o novo proprietário associado ao imóvel).

### Próximos passos sugeridos
- Integrar o script ao pipeline de testes manuais (ex.: checklist antes da execução das migrations destrutivas).
- Criar um script equivalente para validar a remoção definitiva do campo legado (`proprietario_fk`) assim que a migration for executada.

