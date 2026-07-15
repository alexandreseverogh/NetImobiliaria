-- Remove o item "Chatbot" (feature_id=113, url=/mensageria/config/chatbot) da sidebar — é um
-- link morto duplicado: a URL nunca teve página real, e a configuração de verdade do bot já
-- vive dentro de "Configurações" (/mensageria/config, aba "Bot"). Desativado (não deletado) —
-- reversível, mesmo padrão já usado em toda a plataforma pra esconder um item sem apagar
-- histórico/permissões associadas.

UPDATE public.system_features
SET is_active = false
WHERE id = 113
  AND slug = 'mensageria-chatbot';
