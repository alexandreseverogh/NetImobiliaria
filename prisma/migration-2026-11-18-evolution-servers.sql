-- Servidores Evolution gerenciados pelo Master. A chave GLOBAL de administração fica só aqui.
-- Cada tenant guarda: o servidor (evolution_server_id), a URL, o nome da instância e o TOKEN
-- DA PRÓPRIA INSTÂNCIA (devolvido pela Evolution ao criá-la). O token da instância não dá
-- controle sobre o servidor, por isso ele pode ser guardado no tenant.
-- Idempotente. Os campos legados (evolution_api_url/key/instance) continuam sendo lidos.

CREATE TABLE IF NOT EXISTS public.evolution_servers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  api_url     TEXT NOT NULL,
  api_key     TEXT NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Só um servidor padrão por vez.
CREATE UNIQUE INDEX IF NOT EXISTS ux_evolution_servers_default
  ON public.evolution_servers (is_default) WHERE is_default = true;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS evolution_server_id UUID NULL REFERENCES public.evolution_servers(id);

-- Backfill: se houver configuração legada, vira o servidor padrão (uma única vez).
INSERT INTO public.evolution_servers (name, api_url, api_key, is_default)
SELECT 'Servidor principal', t.evolution_api_url, t.evolution_api_key, true
  FROM public.tenants t
 WHERE t.evolution_api_url IS NOT NULL AND t.evolution_api_url <> ''
   AND t.evolution_api_key IS NOT NULL AND t.evolution_api_key <> ''
   AND NOT EXISTS (SELECT 1 FROM public.evolution_servers WHERE is_default = true)
 ORDER BY t.created_at NULLS LAST
 LIMIT 1;

-- Vincula os tenants legados ao servidor que tem a mesma URL e a mesma chave.
UPDATE public.tenants t
   SET evolution_server_id = s.id
  FROM public.evolution_servers s
 WHERE t.evolution_server_id IS NULL
   AND t.evolution_api_url = s.api_url
   AND t.evolution_api_key = s.api_key;
