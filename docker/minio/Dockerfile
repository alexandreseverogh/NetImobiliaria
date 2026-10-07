# MinIO (servidor S3-compatible), compilado direto da fonte.
#
# Por quê build próprio em vez da imagem oficial:
# a MinIO fechou a distribuição pública gratuita das suas imagens — confirmado em
# 2026-10-06: "minio/minio" sumiu do Docker Hub (já era sabido, por isso o projeto tinha
# migrado antes pra quay.io/minio/minio), e agora o PRÓPRIO quay.io/minio/minio passou a
# exigir login (401 até pra consultar metadados do repo, não é rate-limit), e o binário
# direto via dl.min.io responde 410 Gone. O código-fonte segue público e licenciado
# AGPLv3 no GitHub — buildamos direto dali, versão fixada por tag de release, sem
# depender de nenhum registry terceiro de novo.
ARG MINIO_VERSION=RELEASE.2025-10-15T17-29-55Z

# --- Stage 1: build do binário (estaticamente linkado via CGO_ENABLED=0) ---
FROM golang:1.24-alpine AS builder
ARG MINIO_VERSION
ARG TARGETOS
ARG TARGETARCH
RUN apk add --no-cache git
WORKDIR /src
# git clone (em vez de tarball) pra ter um .git real — necessário pra embutir commit/versão
# no binário do mesmo jeito que o build oficial faz (buildscripts/gen-ldflags.go).
RUN git clone --branch "${MINIO_VERSION}" --depth 1 https://github.com/minio/minio.git .
RUN set -eux; \
    COMMIT_ID="$(git rev-parse HEAD)"; \
    SHORT_COMMIT="$(echo "${COMMIT_ID}" | cut -c1-12)"; \
    VERSION="$(echo "${MINIO_VERSION}" | sed -E 's/^RELEASE\.//; s/^([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2})-([0-9]{2})-([0-9]{2})Z$/\1:\2:\3Z/')"; \
    CGO_ENABLED=0 GOOS="${TARGETOS:-linux}" GOARCH="${TARGETARCH:-amd64}" \
      go build -tags kqueue -trimpath \
      --ldflags "-s -w \
        -X github.com/minio/minio/cmd.Version=${VERSION} \
        -X github.com/minio/minio/cmd.ReleaseTag=${MINIO_VERSION} \
        -X github.com/minio/minio/cmd.CommitID=${COMMIT_ID} \
        -X github.com/minio/minio/cmd.ShortCommitID=${SHORT_COMMIT} \
        -X github.com/minio/minio/cmd.CopyrightYear=2026" \
      -o /minio .

# --- Stage 2: imagem final, mínima ---
FROM alpine:3.20
# curl: exigido pelo healthcheck do docker-compose. ca-certificates: notificações/webhooks HTTPS.
RUN apk add --no-cache ca-certificates curl
COPY --from=builder /minio /usr/bin/minio
COPY docker-entrypoint.sh /usr/bin/docker-entrypoint.sh
RUN chmod +x /usr/bin/minio /usr/bin/docker-entrypoint.sh

EXPOSE 9000 9001
VOLUME ["/data"]
ENTRYPOINT ["/usr/bin/docker-entrypoint.sh"]
CMD ["minio"]
