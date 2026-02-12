#!/usr/bin/env bash
set -euo pipefail

# Script de Deploy Automatizado (chamado pelo GitHub Actions)
# Uso: ./deploy-github.sh <branch>

BRANCH=${1:-main}
BASE_DIR="$HOME/net-imobiliaria"
INFRA_DIR="$BASE_DIR"  # Onde está o docker-compose.vps.yml
SOURCES_DIR="$HOME/net-imobiliaria-sources"

# Garantir diretórios de código fonte
mkdir -p "$SOURCES_DIR"

TARGET_SOURCE="$SOURCES_DIR/$BRANCH"

echo "[*] Gerenciando source para: $BRANCH em $TARGET_SOURCE"

# 1. Atualizar o código fonte do branch específico
if [ -d "$TARGET_SOURCE/.git" ]; then
    echo "   -> Atualizando repositório existente..."
    cd "$TARGET_SOURCE"
    git fetch origin
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
else
    echo "   -> Clonando repositório do zero..."
    git clone -b "$BRANCH" https://github.com/alexandreseverogh/NetImobiliaria.git "$TARGET_SOURCE"
fi

# 2. Voltar para a infraestrutura para rodar o Docker
cd "$INFRA_DIR"

# 3. Definir contextos para o docker-compose
# Precisamos exportar essas variaveis para que o docker compose as veja (se o yml estiver configurado)
# OU usamos um override.
# Para simplificar e não exigir edição do yml original agora, usaremos docker build manuais e injeção de imagens.

echo "[*] Construindo imagem para $BRANCH..."
# Constrói a imagem explicitamente marcando-a
docker build -t "net-imobiliaria:$BRANCH" -f Dockerfile.prod "$TARGET_SOURCE"

echo "[*] Aplicando atualização no serviço..."

if [ "$BRANCH" == "main" ]; then
    # Produção
    # Forçamos o serviço a usar a imagem que acabamos de criar, ignorando o 'build' do compose
    # Isso requer que editemos o compose ou usemos uma tecnica de override.
    # Vamos usar uma abordagem hibrida: definimos a variavel de imagem e forçamos recriação
    
    # Nota: O docker-compose.vps.yml original faz build: .
    # Para usar nossa imagem construída, precisamos que ele aceite imagem externa ou build.
    # A maneira mais limpa sem alterar o arquivo é reconstruir via compose apontando o contexto.
    
    export PROD_CONTEXT="$TARGET_SOURCE"
    # Se o docker-compose.vps.yml não tiver variaveis, isso é ignorado e ele builda do . (que é o main repo "infra")
    # Então vamos apenas garantir que a "Infra" (conteúdo do BASEO_DIR) esteja atualizada com o main também.
    
    # ATUALIZAR A INFRA TAMBÉM (Script, Composes, etc)
    echo "   -> Atualizando infraestrutura (repo principal)..."
    git pull origin main --ff-only
    
    # Build e Up especifico
    # Se editarmos o docker-compose.vps.yml para aceitar variáveis, fica perfeito.
    # Assumindo que o passo seguinte vai editar o docker-compose.vps.yml
    
    docker compose -f docker-compose.vps.yml up -d --build prod_app prod_feed
    
elif [ "$BRANCH" == "staging" ]; then
    # Staging
    export STAGING_CONTEXT="$TARGET_SOURCE"
    
    docker compose -f docker-compose.vps.yml up -d --build staging_app staging_feed
fi

echo "[✅] Deploy de $BRANCH concluído com sucesso!"
