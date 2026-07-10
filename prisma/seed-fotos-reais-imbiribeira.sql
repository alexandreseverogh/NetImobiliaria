-- Limpa os 13 registros órfãos do imóvel 17 (url_cdn apontava pra objetos que não existem mais
-- no MinIO — 404 confirmado direto na origem) e insere uma imagem pública real (funcional) na
-- foto principal de cada imóvel do bairro Imbiribeira, pra testar a exibição de imagem de ponta
-- a ponta (bot → mensagem de imagem → renderização real na conversa).

-- 1. Limpa o lixo órfão do imóvel 17
UPDATE public.imovel_imagens
SET storage_type = NULL, url_cdn = NULL
WHERE imovel_id = 17;

-- 2. Uma foto pública real por imóvel (na foto principal de cada um)
UPDATE public.imovel_imagens SET storage_type = 's3', url_cdn = 'https://picsum.photos/seed/imbiribeira1/800/600'  WHERE imovel_id = 1  AND principal = true;
UPDATE public.imovel_imagens SET storage_type = 's3', url_cdn = 'https://picsum.photos/seed/imbiribeira10/800/600' WHERE imovel_id = 10 AND principal = true;
UPDATE public.imovel_imagens SET storage_type = 's3', url_cdn = 'https://picsum.photos/seed/imbiribeira11/800/600' WHERE imovel_id = 11 AND principal = true;
UPDATE public.imovel_imagens SET storage_type = 's3', url_cdn = 'https://picsum.photos/seed/imbiribeira13/800/600' WHERE imovel_id = 13 AND principal = true;
UPDATE public.imovel_imagens SET storage_type = 's3', url_cdn = 'https://picsum.photos/seed/imbiribeira15/800/600' WHERE imovel_id = 15 AND principal = true;
UPDATE public.imovel_imagens SET storage_type = 's3', url_cdn = 'https://picsum.photos/seed/imbiribeira17/800/600' WHERE imovel_id = 17 AND principal = true;
