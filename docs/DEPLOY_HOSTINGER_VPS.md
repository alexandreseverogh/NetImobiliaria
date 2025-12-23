## Deploy na Hostinger VPS (Homologação + Produção)

### Premissas (seu cenário)
- **1 VPS** rodando **produção + homologação** ao mesmo tempo.
- Para separar ambientes corretamente, use **subdomínio** para homologação:
  - Produção: `www.netimobiliaria.com.br`
  - Homologação: `staging.netimobiliaria.com.br`

---

## 1) Preparar a VPS (Ubuntu)

Na VPS (SSH):

```bash
sudo apt update -y
sudo apt install -y git ca-certificates curl
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

Firewall (se usar UFW):

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 2) Clonar o repo

```bash
mkdir -p /opt/netimobiliaria
cd /opt/netimobiliaria
git clone <SEU_REPO_GITHUB> .
```

---

## 3) Criar os arquivos de ambiente

### Única VPS (prod + staging)

```bash
cp env.vps.example .env.vps
nano .env.vps
```

**Importante**: gere senhas/segredos fortes para:
- `PROD_DB_PASSWORD`, `STAGING_DB_PASSWORD`
- `PROD_JWT_SECRET`, `STAGING_JWT_SECRET`
- `PROD_CRON_SECRET`, `STAGING_CRON_SECRET`

---

## 4) Subir o ambiente

### Produção + Homologação (na mesma VPS)

```bash
docker compose -f docker-compose.vps.yml --env-file .env.vps up -d --build
```

---

## 5) Validar

- `https://SEU_DOMINIO/api/health`
- `https://SEU_DOMINIO/landpaging`

---

## 6) Atualizar (deploy contínuo)

```bash
git pull --ff-only
docker compose -f docker-compose.vps.yml --env-file .env.vps up -d --build
```

---

## 7) Banco e backups

O Postgres fica em volume Docker (persistente). Para backup:

```bash
docker compose -f docker-compose.vps.yml --env-file .env.vps exec -T prod_db pg_dump -U postgres -d net_imobiliaria > backup_prod.sql
docker compose -f docker-compose.vps.yml --env-file .env.vps exec -T staging_db pg_dump -U postgres -d net_imobiliaria_staging > backup_staging.sql
```

### Restore inicial do banco (opcional)

Coloque o dump em `./database/backups` (no servidor) e rode:

```bash
chmod +x scripts/vps/restore-into-container.sh
./scripts/vps/restore-into-container.sh prod /backups/schema_oficial.sql
```


