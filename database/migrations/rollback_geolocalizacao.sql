-- Script de Rollback: Remover funcionalidade de geolocalização
-- Data: 2025-11-15
-- Descrição: Remove todos os arquivos e alterações relacionadas à geolocalização
-- 
-- ATENÇÃO: Este script apenas documenta o que precisa ser removido manualmente
-- Não há alterações no banco de dados para reverter

-- ================================================
-- ARQUIVOS A SEREM REMOVIDOS (executar manualmente):
-- ================================================

-- 1. src/lib/services/geolocationService.ts
-- 2. src/app/api/public/geolocation/route.ts
-- 3. src/components/public/GeolocationModal.tsx
-- 4. database/migrations/rollback_geolocalizacao.sql (este arquivo)

-- ================================================
-- ALTERAÇÕES A SEREM REVERTIDAS:
-- ================================================

-- Arquivo: src/app/landpaging/page.tsx
-- 
-- REMOVER:
-- - import GeolocationModal from '@/components/public/GeolocationModal'
-- - Estados de geolocalização (linhas ~70-74)
-- - Função detectUserLocation (linhas ~79-120)
-- - useEffect de detecção (linhas ~123-130)
-- - Componente <GeolocationModal> no JSX (linhas ~856-864)

-- ================================================
-- LOCALSTORAGE A SER LIMPO (opcional):
-- ================================================

-- No navegador, executar no console:
-- localStorage.removeItem('geolocation-modal-shown')
-- localStorage.removeItem('geolocation-modal-dismissed')
-- localStorage.removeItem('geolocation-city')
-- localStorage.removeItem('geolocation-region')
-- localStorage.removeItem('geolocation-country')

-- ================================================
-- VARIÁVEIS DE AMBIENTE A SEREM REMOVIDAS (opcional):
-- ================================================

-- Remover do .env.local (se adicionadas):
-- GEOLOCATION_API_URL=
-- GEOLOCATION_ENABLED=
-- GEOLOCATION_CACHE_DURATION=

-- ================================================
-- VERIFICAÇÃO PÓS-ROLLBACK:
-- ================================================

-- 1. Verificar que página /landpaging carrega sem erros
-- 2. Verificar que não há referências a GeolocationModal no código
-- 3. Verificar que API /api/public/geolocation retorna 404
-- 4. Testar que funcionalidades existentes continuam funcionando

SELECT 'Script de rollback criado. Execute as remoções manualmente conforme instruções acima.' AS status;









