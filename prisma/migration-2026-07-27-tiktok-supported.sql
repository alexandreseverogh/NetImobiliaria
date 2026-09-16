-- T3 (docs/PLANO_TIKTOK.md §10) — destrava o step "Rede de Anúncios" do CampaignWizard pro
-- TikTok. `ad_networks.capabilities.supported` é o que decide se uma rede aparece clicável
-- (vs. "Em breve") nesse step genérico — TikTok cabe nele porque sua API real (createCampaign
-- campanha→ad group→ad) tem o mesmo formato de CreateCampaignInput do Meta, ao contrário do
-- Google (Performance Max/assetGroups, por isso supported=false lá e wizard próprio).

UPDATE public.ad_networks
SET capabilities = jsonb_set(capabilities, '{supported}', 'true'::jsonb)
WHERE code = 'tiktok';
