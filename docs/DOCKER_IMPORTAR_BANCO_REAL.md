# 🐳 Importar o banco “real” (pré-docker) para o Postgres do Docker

Se antes da dockerização tudo funcionava, o container do Postgres precisa rodar com **o mesmo schema/dados** (tabelas atualizadas).
O banco do Docker **não “puxa” sozinho** seu banco antigo: você precisa importar um dump.

## 1) Gerar dump do banco antigo (Windows)

> Requer `pg_dump` instalado (PostgreSQL client tools).

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\docker\export-host-db.ps1 `
  -Host "localhost" -Port 5432 -Database "net_imobiliaria" -User "postgres" -Password "SUA_SENHA"
```

Isso cria: `database/backups/net_imobiliaria.dump`.

## Alternativa: usar um backup `.sql` já existente

Se você já tem o backup em disco (ex.: `C:\NetImobiliária\Backup_BD\backup_bd_0612.sql`), copie para o repo:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\docker\copy-backup-from-path.ps1 `
  -Source "C:\NetImobiliária\Backup_BD\backup_bd_0612.sql" `
  -DestName "net_imobiliaria.sql"
```

## 2) Restaurar no Postgres do docker-compose

Suba o compose primeiro:

```powershell
docker compose up -d --build
```

Depois rode o restore:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\docker\restore-into-container.ps1 -DumpPathInContainer /backups/net_imobiliaria.dump
```

Se você copiou um `.sql`, use:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\docker\restore-into-container.ps1 -DumpPathInContainer /backups/net_imobiliaria.sql
```

## 3) Validar

- `http://localhost:3000/api/health` → deve retornar `"db":"ok"`
- Landing page → deve voltar a carregar destaques locais e filtros (UF/Cidade) normalmente.

## Compatibilidade de versão (importante)

- Se o seu banco antigo é Postgres **17.x**, recomendo usar:
  - `POSTGRES_IMAGE=postgres:17-alpine`
- No `docker-compose.yml` isso já está parametrizado como `POSTGRES_IMAGE`.


