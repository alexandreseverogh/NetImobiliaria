-- Nova tabela para vídeos dos imóveis
-- Conforme especificado no PLANEJAMENTO_VIDEOS_STEP5.md

CREATE TABLE IF NOT EXISTS imovel_video (
    id SERIAL PRIMARY KEY,
    imovel_id INTEGER NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
    video BYTEA NOT NULL,                    -- Conteúdo do vídeo
    nome_arquivo VARCHAR(255) NOT NULL,      -- Nome original do arquivo
    tipo_mime VARCHAR(100) NOT NULL,         -- Tipo MIME (video/mp4, etc.)
    tamanho_bytes BIGINT NOT NULL,           -- Tamanho em bytes
    duracao_segundos INTEGER NOT NULL,       -- Duração em segundos (máx 60)
    resolucao VARCHAR(20),                   -- Resolução (1920x1080, etc.)
    formato VARCHAR(10) NOT NULL,            -- Formato (mp4, webm, etc.)
    ativo BOOLEAN DEFAULT true,              -- Status ativo/inativo
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: apenas 1 vídeo por imóvel
    CONSTRAINT unique_video_per_imovel UNIQUE (imovel_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_imovel_video_imovel_id ON imovel_video(imovel_id);
CREATE INDEX IF NOT EXISTS idx_imovel_video_ativo ON imovel_video(ativo);
CREATE INDEX IF NOT EXISTS idx_imovel_video_tamanho ON imovel_video(tamanho_bytes);

-- Comentários para documentação
COMMENT ON TABLE imovel_video IS 'Armazena um único vídeo por imóvel, incluindo o arquivo binário e metadados.';
COMMENT ON COLUMN imovel_video.video IS 'Conteúdo binário do vídeo (BYTEA)';
COMMENT ON COLUMN imovel_video.duracao_segundos IS 'Duração do vídeo em segundos (máximo 60)';
COMMENT ON COLUMN imovel_video.tamanho_bytes IS 'Tamanho do arquivo em bytes (máximo 50MB)';
COMMENT ON CONSTRAINT unique_video_per_imovel ON imovel_video IS 'Garante que cada imóvel tenha no máximo um vídeo';