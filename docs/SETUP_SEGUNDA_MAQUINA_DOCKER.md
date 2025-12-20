# 🖥️ Setup da 2ª máquina (Docker) — App + Banco local

Objetivo: rodar **localmente** na 2ª máquina a aplicação + Postgres via Docker **igual** está nesta máquina.

> Observação importante: seus backups atuais estão em formato **PGDMP (custom)**, então o Postgres do container deve ser **17**.

## 1) Pré-requisitos

- Docker Desktop instalado e funcionando (WSL2 recomendado)
- Git instalado

## 2) Clonar o repositório

```powershell
git clone <SEU_REPO_AQUI>
cd net-imobiliaria
```

## 3) Subir containers (Postgres 17 + App)

Na raiz do repo:

```powershell
$env:POSTGRES_IMAGE="postgres:17-alpine"
docker compose up -d --build
```

## 4) Colocar o backup dentro de `database/backups/`

Copie seu backup (ex.: `net-imobiliaria_backup_YYYY-MM-DD_HH-MM-SS.sql`) para:

`<repo>\database\backups\`

Se preferir, use o helper:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\docker\copy-backup-from-path.ps1 `
  -Source "C:\CAMINHO\DO\BACKUP\net-imobiliaria_backup_2025-12-20_17-36-57.sql" `
  -DestName "remote_backup.sql"
```

## 5) Restaurar o backup para o Postgres do container

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\docker\restore-into-container.ps1 `
  -DumpPathInContainer "/backups/remote_backup.sql"
```

O script para a app, recria o banco e restaura o backup, depois sobe a app novamente.

## 6) Validar

- Health: `http://localhost:3000/api/health`
- Landing page: `http://localhost:3000/landpaging`

## 7) Dicas de troubleshooting

- Se aparecer `unsupported version (1.16)`, o Postgres **não está 17**. Suba com:
  - `$env:POSTGRES_IMAGE="postgres:17-alpine"`
  - `docker compose down -v`
  - `docker compose up -d --build`
- Se o restore “não cria tabelas”, confirme se o arquivo está em:
  - `docker compose exec -T db sh -lc "ls -la /backups"`


