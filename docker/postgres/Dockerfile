# Postgres 17 (alpine) + extensão pgvector, compilada da fonte.
#
# Por quê build próprio em vez da imagem oficial pgvector/pgvector:pg17:
# a imagem oficial é Debian (glibc); a nossa base é alpine (musl). Trocar o data-dir
# de musl→glibc é um gotcha conhecido do Postgres (collation dos índices de texto muda,
# exigindo REINDEX). Mantendo a MESMA base alpine, o data-dir existente continua 100%
# compatível — zero risco de collation, sem REINDEX — e a imagem fica idêntica em dev e VPS.
#
# M4.3 (RAG / Base de Conhecimento) — docs/PLANO_MENSAGERIA.md §14.6-B.
FROM postgres:17-alpine

# Versão fixada pra build reproduzível.
ARG PGVECTOR_VERSION=v0.8.0

# with_llvm=no: pula a geração de bitcode LLVM (JIT), que é só uma otimização opcional e
# amarraria a build à versão EXATA de clang com que a imagem base foi compilada (LLVM 19).
# O vector.so em si é compilado com gcc e fica 100% funcional sem o bitcode — só build-base,
# git e os headers do servidor (postgresql17-dev) são necessários.
RUN set -eux; \
    apk add --no-cache --virtual .build-deps \
        build-base git postgresql17-dev; \
    git clone --branch "${PGVECTOR_VERSION}" --depth 1 https://github.com/pgvector/pgvector.git /tmp/pgvector; \
    cd /tmp/pgvector; \
    make OPTFLAGS="" with_llvm=no; \
    make install with_llvm=no; \
    cd /; \
    rm -rf /tmp/pgvector; \
    apk del .build-deps
