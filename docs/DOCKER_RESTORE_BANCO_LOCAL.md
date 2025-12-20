# 🐳 Restore do Banco (Docker Local)

Quando você sobe o `docker-compose.yml` pela primeira vez, o Postgres cria um **volume novo** (`db_data`) e ele começa **vazio** (sem tabelas).
Isso faz as rotas de imóveis falharem com erros como `relation "imoveis" does not exist`.

## ✅ Restore usando o dump do repositório

Pré-requisito: `docker compose up -d` já rodando.

### Windows (PowerShell)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\docker\restore-db.ps1
```

## ✅ Como validar

- `http://localhost:3000/api/health` deve retornar `"db":"ok"`
- `http://localhost:3000/api/public/imoveis/destaque?tipo_destaque=DV&estado=PE&cidade=Recife` deve retornar `200` com lista (se houver dados)

## ⚠️ Observação importante

- Se você já tiver restaurado e quiser “zerar tudo”, o comando `docker compose down -v` remove o volume e apaga o banco do container (use com cuidado).


