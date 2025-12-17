# 🗄️ Configuração do Banco de Dados PostgreSQL

## 📋 Pré-requisitos

### 1. **PostgreSQL Instalado**
- **Windows**: Baixe do [postgresql.org](https://www.postgresql.org/download/windows/)
- **macOS**: `brew install postgresql`
- **Linux**: `sudo apt-get install postgresql postgresql-contrib`

### 2. **Node.js e npm**
- Versão 18+ recomendada
- `npm install` executado no projeto

## 🚀 Configuração Rápida

### **Passo 1: Instalar dependências**
```bash
npm install pg @types/pg
```

### **Passo 2: Configurar variáveis de ambiente**
Crie/edite o arquivo `.env.local` na raiz do projeto:

```env
# JWT Configuration
JWT_SECRET=seu_jwt_secret_super_seguro_aqui_2024
JWT_REFRESH_SECRET=seu_refresh_secret_super_seguro_aqui_2024

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=net_imobiliaria
DB_USER=postgres
DB_PASSWORD=sua_senha_aqui

# Environment
NODE_ENV=development
```

### **Passo 3: Configurar PostgreSQL**
```bash
# Conectar ao PostgreSQL
psql -U postgres

# Criar usuário (se necessário)
CREATE USER netimobiliaria WITH PASSWORD 'sua_senha_aqui';

# Criar banco
CREATE DATABASE net_imobiliaria OWNER netimobiliaria;

# Sair
\q
```

### **Passo 4: Executar script de configuração**
```bash
node scripts/setup-database.js
```

## 🔧 Configuração Manual

### **1. Conectar ao PostgreSQL**
```bash
psql -U postgres -d postgres
```

### **2. Criar banco**
```sql
CREATE DATABASE net_imobiliaria;
\c net_imobiliaria
```

### **3. Executar schema**
```bash
psql -U postgres -d net_imobiliaria -f database/schema.sql
```

### **4. Executar seed**
```bash
psql -U postgres -d net_imobiliaria -f database/seed.sql
```

## 📊 Estrutura do Banco

### **Tabelas Principais:**
- **`users`**: Usuários do sistema
- **`resources`**: Recursos (imóveis, proximidades, etc.)
- **`actions`**: Ações (READ, WRITE, DELETE, ADMIN)
- **`permissions`**: Permissões (recurso + ação)
- **`user_permissions`**: Permissões dos usuários
- **`audit_logs`**: Logs de auditoria
- **`user_sessions`**: Sessões JWT

### **Views:**
- **`user_permissions_view`**: Permissões dos usuários organizadas

## 👥 Usuários Padrão

| Username | Senha | Cargo | Permissões |
|----------|-------|-------|------------|
| `admin` | `admin123` | ADMIN | Todas |
| `corretor1` | `corretor123` | CORRETOR | READ+WRITE em imóveis e proximidades |
| `assistente1` | `assistente123` | ASSISTENTE | Apenas READ |

## 🔐 Sistema de Permissões

### **Recursos:**
- `imoveis`: Gestão de imóveis
- `proximidades`: Gestão de proximidades
- `amenidades`: Gestão de amenidades
- `usuarios`: Gestão de usuários
- `relatorios`: Relatórios do sistema

### **Ações:**
- `READ`: Visualização
- `WRITE`: Criação e edição
- `DELETE`: Exclusão
- `ADMIN`: Controle total

## 📝 Exemplos de Queries SQL

### **Buscar usuário com permissões:**
```sql
SELECT 
  u.username, u.nome, u.cargo,
  json_agg(
    json_build_object('resource', r.name, 'action', a.name)
  ) as permissions
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
LEFT JOIN permissions p ON up.permission_id = p.id
LEFT JOIN resources r ON p.resource_id = r.id
LEFT JOIN actions a ON p.action_id = a.id
WHERE u.username = 'admin'
GROUP BY u.id, u.username, u.nome, u.cargo;
```

### **Verificar permissão específica:**
```sql
SELECT COUNT(*) as has_permission
FROM user_permissions up
JOIN permissions p ON up.permission_id = p.id
JOIN resources r ON p.resource_id = r.id
JOIN actions a ON p.action_id = a.id
WHERE up.user_id = $1 
  AND r.name = 'imoveis' 
  AND a.name = 'WRITE'
  AND up.active = true;
```

## 🚨 Troubleshooting

### **Erro: "connection refused"**
- Verifique se o PostgreSQL está rodando
- Confirme a porta (padrão: 5432)
- Verifique firewall

### **Erro: "authentication failed"**
- Confirme usuário e senha
- Verifique `pg_hba.conf`
- Teste: `psql -U postgres -h localhost`

### **Erro: "database does not exist"**
- Execute: `CREATE DATABASE net_imobiliaria;`
- Ou use o script: `node scripts/setup-database.js`

### **Erro: "permission denied"**
- Verifique se o usuário tem permissões
- Execute: `GRANT ALL PRIVILEGES ON DATABASE net_imobiliaria TO seu_usuario;`

## 🔄 Migração de Dados

### **Do JSON para PostgreSQL:**
O sistema já está configurado para migrar automaticamente do `users.json` para o PostgreSQL.

### **Backup e Restore:**
```bash
# Backup
pg_dump -U postgres net_imobiliaria > backup.sql

# Restore
psql -U postgres net_imobiliaria < backup.sql
```

## 📈 Monitoramento

### **Verificar conexões ativas:**
```sql
SELECT * FROM pg_stat_activity WHERE datname = 'net_imobiliaria';
```

### **Verificar logs de auditoria:**
```sql
SELECT action, COUNT(*) as count 
FROM audit_logs 
GROUP BY action 
ORDER BY count DESC;
```

### **Verificar permissões:**
```sql
SELECT * FROM user_permissions_view WHERE username = 'admin';
```

## 🎯 Próximos Passos

1. ✅ **Banco configurado**
2. ✅ **Usuários criados**
3. ✅ **Sistema de permissões ativo**
4. 🔄 **Testar login**
5. 🔄 **Implementar CRUD de imóveis**
6. 🔄 **Implementar relatórios**

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do PostgreSQL
2. Confirme as variáveis de ambiente
3. Teste a conexão manualmente
4. Verifique se todas as dependências estão instaladas

---

**🎉 Sistema PostgreSQL configurado com sucesso!**

