#!/bin/bash

# 🚀 Script de Instalação Automatizada - Net Imobiliária
# Este script instala e configura automaticamente a aplicação

set -e  # Para o script se houver erro

echo "🏠 Net Imobiliária - Instalação Automatizada"
echo "=============================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se Node.js está instalado
check_node() {
    print_status "Verificando Node.js..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js encontrado: $NODE_VERSION"
        
        # Verificar se a versão é 18+
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -lt 18 ]; then
            print_error "Node.js versão 18+ é necessária. Versão atual: $NODE_VERSION"
            exit 1
        fi
    else
        print_error "Node.js não encontrado. Instale Node.js 18+ primeiro."
        print_status "Download: https://nodejs.org/"
        exit 1
    fi
}

# Verificar se PostgreSQL está instalado
check_postgresql() {
    print_status "Verificando PostgreSQL..."
    if command -v psql &> /dev/null; then
        PSQL_VERSION=$(psql --version)
        print_success "PostgreSQL encontrado: $PSQL_VERSION"
    else
        print_error "PostgreSQL não encontrado. Instale PostgreSQL 15+ primeiro."
        print_status "Download: https://www.postgresql.org/download/"
        exit 1
    fi
}

# Verificar se Git está instalado
check_git() {
    print_status "Verificando Git..."
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version)
        print_success "Git encontrado: $GIT_VERSION"
    else
        print_error "Git não encontrado. Instale Git primeiro."
        print_status "Download: https://git-scm.com/"
        exit 1
    fi
}

# Instalar dependências
install_dependencies() {
    print_status "Instalando dependências do Node.js..."
    npm install
    print_success "Dependências instaladas com sucesso!"
}

# Configurar banco de dados
setup_database() {
    print_status "Configurando banco de dados..."
    
    # Verificar se o banco já existe
    if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw net_imobiliaria; then
        print_warning "Banco 'net_imobiliaria' já existe. Pulando criação..."
    else
        print_status "Criando banco de dados..."
        psql -U postgres -c "CREATE DATABASE net_imobiliaria;"
        print_success "Banco de dados criado!"
    fi
    
    # Executar scripts SQL
    print_status "Executando scripts SQL..."
    psql -U postgres -d net_imobiliaria -f database/schema.sql
    psql -U postgres -d net_imobiliaria -f database/seed.sql
    print_success "Scripts SQL executados com sucesso!"
}

# Configurar variáveis de ambiente
setup_env() {
    print_status "Configurando variáveis de ambiente..."
    
    if [ -f ".env.local" ]; then
        print_warning "Arquivo .env.local já existe. Fazendo backup..."
        cp .env.local .env.local.backup
    fi
    
    # Gerar senhas seguras
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    
    # Criar arquivo .env.local
    cat > .env.local << EOF
# ===========================================
# CONFIGURAÇÕES DO BANCO DE DADOS
# ===========================================
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=net_imobiliaria
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$DB_PASSWORD

# ===========================================
# CONFIGURAÇÕES JWT
# ===========================================
JWT_SECRET=$JWT_SECRET
JWT_ACCESS_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# ===========================================
# CONFIGURAÇÕES DE SEGURANÇA
# ===========================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ===========================================
# CONFIGURAÇÕES DA APLICAÇÃO
# ===========================================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
    
    print_success "Arquivo .env.local criado com senhas seguras!"
    print_warning "IMPORTANTE: Anote a senha do banco: $DB_PASSWORD"
}

# Testar instalação
test_installation() {
    print_status "Testando instalação..."
    
    # Verificar se o servidor inicia
    print_status "Iniciando servidor de teste..."
    timeout 10s npm run dev > /dev/null 2>&1 &
    SERVER_PID=$!
    
    # Aguardar servidor iniciar
    sleep 5
    
    # Testar endpoint
    if curl -s http://localhost:3000 > /dev/null; then
        print_success "Servidor funcionando corretamente!"
    else
        print_warning "Servidor pode não estar funcionando. Verifique manualmente."
    fi
    
    # Parar servidor de teste
    kill $SERVER_PID 2>/dev/null || true
}

# Função principal
main() {
    echo
    print_status "Iniciando instalação da Net Imobiliária..."
    echo
    
    # Verificações
    check_node
    check_postgresql
    check_git
    
    # Instalação
    install_dependencies
    setup_database
    setup_env
    
    # Teste
    test_installation
    
    echo
    print_success "🎉 Instalação concluída com sucesso!"
    echo
    print_status "Para iniciar a aplicação:"
    print_status "  npm run dev"
    echo
    print_status "Acesse: http://localhost:3000"
    print_status "Login: admin / admin123"
    echo
    print_warning "IMPORTANTE: Anote as credenciais geradas no arquivo .env.local"
    echo
}

# Executar função principal
main "$@"
