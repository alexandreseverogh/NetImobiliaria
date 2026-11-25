'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import {
  XMarkIcon, RocketLaunchIcon, ArrowLeftIcon, FolderOpenIcon,
  BuildingOfficeIcon, UserCircleIcon, MagnifyingGlassIcon, ArrowPathIcon,
  CheckCircleIcon, RectangleStackIcon,
} from '@heroicons/react/24/outline';
import type { Creative, ClientWithCreativesPath } from '@/lib/marketing-api';
import { getClientCreativePaths } from '@/lib/marketing-api';
import { cn } from '@/lib/marketing-utils';
import { useAuth } from '@/hooks/useAuth';
import { adminFetch } from '@/lib/auth/adminFetch';
import { validateVideoMeta } from '@/lib/marketing/video/videoRules';
import { readVideoMeta } from '@/lib/marketing/video/readVideoMeta';
import { uploadVideoMultipart } from '@/lib/marketing/video/videoUploader';
import CampanhasModal from '@/components/marketing/CampanhasModal';
import { TokenExpiryBanner } from '@/components/marketing/TokenExpiryBanner';
import { AccountBalanceBanner } from '@/components/marketing/AccountBalanceBanner';

const CampaignWizard = dynamic(
  () => import('@/components/marketing/CampaignWizard').then(m => m.CampaignWizard),
  { ssr: false },
);

const GoogleAiMaxWizard = dynamic(
  () => import('@/components/marketing/GoogleAiMaxWizard').then(m => m.GoogleAiMaxWizard),
  { ssr: false },
);

/* ── helpers ─────────────────────────────────────────────── */
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const VIDEO_EXTS = new Set(['.mp4', '.mov']);
function isVideo(name: string) {
  const dot = name.lastIndexOf('.');
  return dot !== -1 && VIDEO_EXTS.has(name.slice(dot).toLowerCase());
}
function isMedia(name: string) {
  return isImage(name) || isVideo(name);
}
function isImage(name: string) {
  const dot = name.lastIndexOf('.');
  return dot !== -1 && IMAGE_EXTS.has(name.slice(dot).toLowerCase());
}

/** "Google" → "Rede Google não contratada..."; "Google" + "TikTok" → "Redes Google e TikTok
 *  não contratadas..."; 3+ nomes → lista com vírgulas e "e" antes do último. */
function formatUncontractedNetworksMessage(names: string[]): string {
  const list =
    names.length <= 1
      ? names.join('')
      : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
  const plural = names.length > 1;
  return `${plural ? 'Redes' : 'Rede'} ${list} ${plural ? 'não contratadas' : 'não contratada'} para lançamento de campanhas.`;
}

/* ══════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════ */
export default function NovaCampanhaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  /* Pré-preenchimento via query params (vem de "Usar no Wizard" na página Padrões) */
  const prefillBody     = searchParams?.get('body')     || '';
  const prefillHeadline = searchParams?.get('headline') || '';
  const prefillHookText = searchParams?.get('hookText') || '';

  /* master detectado via is_system_role
   * Prioridade: user.is_system_role (do auth context, após /me ser corrigido)
   * Fallback:   localStorage admin-user-data (preenchido no login, sempre presente) */
  const isMaster = useMemo(() => {
    if (user?.is_system_role === true) return true;
    try {
      const stored = localStorage.getItem('admin-user-data');
      if (stored) return JSON.parse(stored).is_system_role === true;
    } catch { /* ignore parse errors */ }
    return false;
  }, [user?.is_system_role]);

  /* ── Phase 0: contexto ──────────────────────────────── */
  const [campaignFor, setCampaignFor]       = useState<'own' | 'client'>('own');
  const [clients, setClients]               = useState<ClientWithCreativesPath[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearch, setClientSearch]     = useState('');
  const [pathHint, setPathHint]             = useState('');
  const clientSearchRef = useRef<HTMLInputElement>(null);

  /* ── Phase 1: criativos ─────────────────────────────── */
  const [folderName, setFolderName]         = useState('');
  const [allImages, setAllImages]           = useState<Creative[]>([]);
  const [selected, setSelected]             = useState<Creative[]>([]);
  const [filter, setFilter]                 = useState('');
  const [loadingFolder, setLoadingFolder]   = useState(false);
  const [folderError, setFolderError]       = useState('');
  // Proporção real de cada imagem (largura/altura), capturada ao carregar — usada pra dar à
  // célula da grade a MESMA proporção da foto (em vez de um quadrado fixo), eliminando a
  // faixa cinza lateral que `object-contain` dentro de `aspect-square` deixava em qualquer
  // criativo vertical (9:16/4:5, o formato real mais comum de Stories/Reels). Enquanto a
  // imagem não carregou, cai no quadrado (1/1) como placeholder neutro.
  const [imageAspect, setImageAspect] = useState<Record<string, number>>({});
  function handleImageLoad(name: string, e: React.SyntheticEvent<HTMLImageElement>) {
    const el = e.currentTarget;
    if (!el.naturalWidth || !el.naturalHeight) return;
    setImageAspect(prev =>
      prev[name] ? prev : { ...prev, [name]: el.naturalWidth / el.naturalHeight },
    );
  }
  // FASE 6: mapa nome→File para upload silencioso na biblioteca
  const [fileObjects, setFileObjects]       = useState<Map<string, File>>(new Map());
  // Avisos de vídeo (não bloqueiam): o usuário precisa confirmar antes de usar o vídeo.
  const [videoWarnings, setVideoWarnings]   = useState<Map<string, string[]>>(new Map());
  // Confirmação explícita: vídeo com aviso só segue para a etapa se o usuário confirmar.
  const [videoWarningsAccepted, setVideoWarningsAccepted] = useState(false);
  // Vídeos selecionados que têm aviso e ainda não foram confirmados.
  const pendingVideoWarnings = selected.filter(s => videoWarnings.has(s.name));
  // Regra de seleção: sem criativo não avança; imagens e vídeo não se misturam na mesma campanha;
  // um vídeo por campanha. Publicação de vídeo na Meta ainda está em implantação (Fase 3).
  const selectedVideoCount = selected.filter(s => isVideo(s.name)).length;
  const selectedImageCount = selected.length - selectedVideoCount;
  const selectionBlocker: string | null =
    selected.length === 0 ? 'Selecione ao menos um criativo para continuar.'
    : selectedVideoCount > 0 && selectedImageCount > 0 ? 'Não é possível misturar imagens e vídeo na mesma campanha. Deixe apenas imagens, ou apenas um vídeo.'
    : selectedVideoCount > 1 ? 'Selecione apenas um vídeo por campanha.'
    : null;
  // Um vídeo só: não bloqueia; a campanha é salva como rascunho (sem publicar na rede ainda).
  const videoDraftNotice = selectedVideoCount === 1
    ? 'Vídeo selecionado. Salvar sem lançar guarda como rascunho; lançar envia o vídeo à Meta.'
    : null;
  // Mudou a seleção → a confirmação anterior não vale mais.
  useEffect(() => { setVideoWarningsAccepted(false); }, [selected]);
  // FASE 6: promessa de upload iniciada ao abrir o wizard; resolvida antes do submit
  const uploadPromiseRef = useRef<Promise<string[]>>(Promise.resolve([]));
  // Motivos reais de falha do último upload para a biblioteca (exibidos ao lançar).
  const uploadErrorsRef = useRef<string[]>([]);

  /* ── Phase 2: wizard ────────────────────────────────── */
  const [showWizard, setShowWizard] = useState(false);
  const [showGoogleWizard, setShowGoogleWizard] = useState(false);
  /** Rede escolhida no botão específico clicado (Meta ou TikTok) — pré-seleciona o step 0
   *  do wizard genérico, que continua mostrando o passo "Rede de Anúncios" normalmente
   *  (o usuário ainda pode trocar lá dentro, só chega com a intenção certa já marcada). */
  const [pickedNetwork, setPickedNetwork] = useState<'meta' | 'tiktok'>('meta');

  /* ── Provisionamento por rede — botões separados, cada um habilitado só quando a rede foi
   *  contratada pelo tenant (via Master → Provisionamento) E está com credenciais conectadas.
   *  Ver prisma/migration-2026-07-28-network-provisioning.sql. */
  const [networkStatus, setNetworkStatus] = useState<Record<string, { contracted: boolean; connected: boolean; supported: boolean }>>({});
  const [networksLoaded, setNetworksLoaded] = useState(false);
  // Lista crua da mesma resposta, repassada pro CampaignWizard -> StepNetwork — achado real:
  // a etapa "Rede" do wizard sempre refazia essa MESMA chamada do zero (com o próprio
  // skeleton), mesmo a rede já tendo sido escolhida no botão macro clicado aqui. Reaproveitar
  // elimina 1 dos fatores da demora extrema reportada ao abrir o wizard.
  const [networksRaw, setNetworksRaw] = useState<any[]>([]);
  // Achado real: em dev, quando a rota ainda não compilou nessa sessão, uma única chamada
  // pode levar 30-50s (medido ao vivo, inclusive retornando 404 nesse meio tempo). O retry
  // automático abaixo evita ficar preso pra sempre, mas não acelera a espera em si — esse
  // indicador dá contexto visual ("carregando", não "quebrado") e uma saída manual pro
  // usuário não precisar esperar o backoff inteiro se quiser forçar de novo.
  const [networksSlow, setNetworksSlow] = useState(false);
  const [networksRetryTick, setNetworksRetryTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setNetworksSlow(false);
    const slowTimer = setTimeout(() => { if (!cancelled) setNetworksSlow(true); }, 6000);

    // Achado real: sem retry, uma falha transitória (comum em dev com a rota ainda
    // compilando sob demanda no 1º hit da sessão — já confirmado ao vivo levando 40-50s e
    // até retornando 404 nesse meio tempo) deixava os 3 botões de rede desabilitados pra
    // sempre nessa instância da página, sem nenhuma forma de recuperação a não ser recarregar
    // manualmente — o efeito só roda uma vez (deps `[]`). Até 3 tentativas com backoff curto
    // cobre esse hiccup sem exigir ação do usuário.
    async function loadNetworkStatus(attempt = 1) {
      try {
        const r = await adminFetch('/api/admin/campanhas/configuracoes/redes');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        if (cancelled) return;
        const list = d.networks || [];
        setNetworksRaw(list);
        const map: Record<string, { contracted: boolean; connected: boolean; supported: boolean }> = {};
        list.forEach((n: any) => {
          map[n.code] = {
            contracted: n.contracted !== false,
            connected:  !!n.connected,
            supported:  n.capabilities?.supported !== false,
          };
        });
        setNetworkStatus(map);
        setNetworksLoaded(true);
      } catch {
        if (cancelled) return;
        if (attempt < 3) {
          setTimeout(() => loadNetworkStatus(attempt + 1), attempt * 1500);
        } else {
          setNetworkStatus({});
          setNetworksLoaded(true);
        }
      }
    }

    loadNetworkStatus();
    return () => { cancelled = true; clearTimeout(slowTimer); };
  }, [networksRetryTick]);

  function retryNetworkStatus() {
    setNetworksLoaded(false);
    setNetworksSlow(false);
    setNetworksRetryTick(t => t + 1);
  }

  function networkReady(code: string): boolean {
    const s = networkStatus[code];
    return !!s && s.contracted && s.connected;
  }

  // Nomes (na mesma ordem dos 3 botões) de toda rede que o tenant genuinamente NÃO contratou
  // — distinto de "contratada mas sem credencial conectada", que já tem aviso próprio (tooltip
  // + TokenExpiryBanner) e não entra nesta frase.
  const NETWORK_DISPLAY_NAME: Record<string, string> = { meta: 'Meta', tiktok: 'TikTok', google: 'Google' };
  const uncontractedNetworkLabels = useMemo(
    () =>
      Object.entries(NETWORK_DISPLAY_NAME)
        .filter(([code]) => networkStatus[code]?.contracted === false)
        .map(([, label]) => label),
    [networkStatus],
  );

  /* ── Consultar campanhas modal ──────────────────────── */
  const [showConsultarModal, setShowConsultarModal] = useState(false);

  /* Prewarm da rota de campanhas assim que a página monta — em dev, o Next
   * compila cada API route sob demanda no 1º hit; sem isso, o 1º clique em
   * "Consultar Campanhas" mostra o skeleton de loading por vários segundos
   * (mesmo padrão de causa raiz já documentado no prewarm de /admin/login em
   * /artemis4). Dispara direto no mount, sem esperar ociosidade — o clique
   * costuma ser rápido demais pra um requestIdleCallback vencer a corrida. */
  useEffect(() => {
    adminFetch('/api/admin/campanhas/campaigns?clientId=own').catch(() => {});
  }, []);

  /* Prewarm dos chunks JS dos wizards (Meta/TikTok e Google AI Max) — medido ao vivo: a
   * primeira abertura de qualquer um dos dois, numa sessão nova, levava 30+ segundos porque
   * next/dynamic({ssr:false}) só compila o chunk sob demanda no 1º uso (mesma causa raiz já
   * documentada em outros prewarms desta sessão). Disparar o import() aqui (sem renderizar
   * nada) faz o webpack compilar em background enquanto o usuário ainda está selecionando
   * criativos — pelo tempo que isso leva, o chunk já deve estar pronto quando o botão de
   * rede for clicado. */
  useEffect(() => {
    import('@/components/marketing/CampaignWizard').catch(() => {});
    import('@/components/marketing/GoogleAiMaxWizard').catch(() => {});
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supportsPickerAPI =
    typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  /* load client list (only for tenants) */
  useEffect(() => {
    if (!isMaster) {
      getClientCreativePaths()
        .then(d => setClients(d.clients || []))
        .catch(() => setClients([]));
    }
  }, [isMaster]);

  /* update folder path hint when client changes */
  useEffect(() => {
    if (campaignFor === 'client' && selectedClientId) {
      const c = clients.find(c => c.id === selectedClientId);
      setPathHint(c?.creativesPath || '');
    } else {
      setPathHint('');
    }
    resetFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignFor, selectedClientId]);

  function resetFiles() {
    setAllImages([]); setFolderName(''); setSelected([]);
    setFolderError(''); setFilter('');
  }

  /* ── folder selection ───────────────────────────────── */
  async function handleSelectFolder() {
    setFolderError(''); setLoadingFolder(true);
    try {
      if (supportsPickerAPI) {
        const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
        await readFromDirectoryHandle(dirHandle);
      } else {
        fileInputRef.current?.click();
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setFolderError('Não foi possível acessar a pasta. Tente novamente.');
      }
    } finally {
      setLoadingFolder(false);
    }
  }

  async function readFromDirectoryHandle(dirHandle: any) {
    const found: Creative[] = [];
    const newFileMap = new Map<string, File>();
    const candidates: File[] = [];
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && isMedia(entry.name)) candidates.push(await entry.getFile());
    }
    const screened = await screenVideoFiles(candidates);
    setVideoWarnings(screened.warned);
    if (screened.rejected.length > 0) setFolderError(screened.rejected.join(' · '));
    for (const file of screened.ok) {
      const blobUrl = URL.createObjectURL(file);
      found.push({
        name: file.name,
        url:  blobUrl,
        path: blobUrl,
        size: file.size,
        modifiedAt: new Date(file.lastModified).toISOString(),
      });
      newFileMap.set(file.name, file);
    }
    found.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
    setFolderName(dirHandle.name);
    setAllImages(found);
    setSelected([]);
    setFileObjects(newFileMap);
    if (found.length === 0) {
      setFolderError('Nenhuma imagem encontrada. Verifique se a pasta contém arquivos JPG, PNG ou WebP.');
    }
  }

  /* Vídeo: lê metadados no navegador e aplica as regras. Bloqueio → fora da lista com motivo.
     Aviso → entra, marcado para confirmação. Imagem → inalterada. */
  async function screenVideoFiles(files: File[]): Promise<{ ok: File[]; rejected: string[]; warned: Map<string, string[]> }> {
    const ok: File[] = [];
    const rejected: string[] = [];
    const warned = new Map<string, string[]>();
    for (const f of files) {
      if (!isVideo(f.name)) { ok.push(f); continue; }
      const local = await readVideoMeta(f);
      const { blockers, warnings } = validateVideoMeta({
        fileName: f.name,
        sizeBytes: f.size,
        mimeType: f.type || (f.name.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4'),
        durationSeconds: local.durationSeconds,
        width: local.width,
        height: local.height,
      });
      if (blockers.length > 0) { rejected.push(`${f.name}: ${blockers[0]}`); continue; }
      ok.push(f);
      if (warnings.length > 0) warned.set(f.name, warnings);
    }
    return { ok, rejected, warned };
  }

  async function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files    = Array.from(e.target.files || []);
    const screened = await screenVideoFiles(files.filter(f => isMedia(f.name)));
    const imgFiles = screened.ok;
    setVideoWarnings(screened.warned);
    if (screened.rejected.length > 0) setFolderError(screened.rejected.join(' · '));
    const newFileMap = new Map<string, File>();
    const found: Creative[] = imgFiles.map(file => {
      const blobUrl = URL.createObjectURL(file);
      newFileMap.set(file.name, file);
      return { name: file.name, url: blobUrl, path: blobUrl, size: file.size,
        modifiedAt: new Date(file.lastModified).toISOString() };
    });
    found.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
    const folder = files[0]?.webkitRelativePath?.split('/')[0] || 'Pasta selecionada';
    setFolderName(folder); setAllImages(found);
    // Um único arquivo escolhido é exatamente o que o usuário quer: já entra selecionado,
    // com a prévia logo abaixo, para não sobrar "Nenhum criativo selecionado" no próximo passo.
    setSelected(found.length === 1 ? found : []);
    setFileObjects(newFileMap);
    if (found.length === 0) setFolderError('Nenhuma imagem encontrada nesta pasta.');
    e.target.value = '';
  }

  /* FASE 6: upload silencioso dos criativos selecionados na biblioteca */
  // FASE 6: faz upload dos criativos selecionados para a biblioteca e retorna os assetIds
  // gerados. A Promise é iniciada ao abrir o wizard e resolvida antes do submit.
  function uploadSelectedToLibrary(clientId: string | null): Promise<string[]> {
    uploadErrorsRef.current = [];
    if (!selected.length) return Promise.resolve([]);
    return Promise.allSettled(
      selected.map(async img => {
        const file = fileObjects.get(img.name);
        if (!file) { uploadErrorsRef.current.push(`${img.name}: arquivo não está mais disponível. Selecione novamente.`); return null; }
        if (isVideo(img.name)) {
          try {
            const local = await readVideoMeta(file);
            const { assetId } = await uploadVideoMultipart(file, {
              durationSeconds: local.durationSeconds,
              width: local.width,
              height: local.height,
              clientId,
            });
            return assetId;
          } catch (err) {
            const reason = err instanceof Error ? err.message : 'falha desconhecida';
            uploadErrorsRef.current.push(`${img.name}: ${reason}`);
            return null;
          }
        }
        const fd = new FormData();
        fd.append('file', file);
        if (clientId) fd.append('clientId', clientId);
        try {
          const res = await adminFetch('/api/admin/campanhas/criativos/upload', {
            method: 'POST',
            body: fd,
          });
          if (!res.ok) return null;
          const data = await res.json();
          return (data.asset?.id as string) ?? null;
        } catch { return null; }
      })
    ).then(results =>
      results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value)
    );
  }

  /* ── image selection ────────────────────────────────── */
  function toggleSelect(image: Creative) {
    setSelected(prev => {
      if (prev.find(i => i.name === image.name)) return prev.filter(i => i.name !== image.name);
      if (prev.length >= 6) return prev;
      return [...prev, image];
    });
  }

  const filtered = allImages.filter(img =>
    img.name.toLowerCase().includes(filter.toLowerCase())
  );
  const selectedClient   = clients.find(c => c.id === selectedClientId);
  const effectiveClientId = campaignFor === 'client' ? (selectedClientId || null) : null;

  /* context validity: se "Para um cliente", precisa ter selecionado um */
  const contextReady = isMaster || campaignFor === 'own' || !!selectedClientId;

  // "x sair" do wizard: volta à primeira tela de /nova, com a seleção limpa (não ao dashboard).
  function handleExitToStart() {
    window.location.assign('/admin/campanhas/nova');
  }

  function handleSuccess() {
    // Volta para o primeiro step, com a tela limpa. Recarregar a página zera todo o estado
    // (imagens selecionadas, textos pré-preenchidos e o wizard), sem depender de limpar cada um.
    window.location.assign('/admin/campanhas/nova');
  }

  /* ── Phase 2: show wizard ─────────────────────────── */
  if (showWizard) {
    return (
      <CampaignWizard
        selectedImages={selected}
        clientId={effectiveClientId}
        onClose={() => setShowWizard(false)}
        onExit={handleExitToStart}
        onSuccess={handleSuccess}
        getAssetIds={async () => {
          const ids = await uploadPromiseRef.current;
          if (ids.length === 0 && uploadErrorsRef.current.length > 0) {
            throw new Error(`Não foi possível enviar o criativo: ${uploadErrorsRef.current.join(' · ')}`);
          }
          return ids;
        }}
        networks={networksRaw}
        initialValues={{
          body:        prefillBody || undefined,
          headline:    prefillHeadline || undefined,
          hookText:    prefillHookText || undefined,
          networkCode: pickedNetwork,
        }}
        onSwitchToGoogle={networkReady('google') ? () => {
          setShowWizard(false);
          setShowGoogleWizard(true);
        } : undefined}
      />
    );
  }

  if (showGoogleWizard) {
    return (
      <GoogleAiMaxWizard
        selectedImages={selected}
        onClose={() => setShowGoogleWizard(false)}
        onLaunch={async (payload) => {
          try {
            const assetIds = await uploadPromiseRef.current;
            if (assetIds.length === 0 && uploadErrorsRef.current.length > 0) {
              throw new Error(`Não foi possível enviar o criativo: ${uploadErrorsRef.current.join(' · ')}`);
            }
            const res = await adminFetch('/api/admin/campanhas/google', {
              method: 'POST',
              body: JSON.stringify({
                payload,
                clientId: effectiveClientId,
                assetIds,
              }),
            });
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Erro na criação');
            }
            alert('Campanha PMax criada com sucesso e pendente de revisão (DRAFT)!');
            setShowGoogleWizard(false);
            router.push('/admin/campanhas/iniciativas');
          } catch (e: any) {
            alert('Falha ao criar campanha Google AI Max: ' + e.message);
          }
        }}
        initialData={{
          name: prefillHeadline || 'Nova PMax',
        }}
      />
    );
  }

  /* ── Phase 1: page ──────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="w-full">

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" /> Voltar
            </button>
            <button
              onClick={() => {
                if (selected.length > 0 && !confirm('Sair agora descarta os criativos selecionados. Deseja continuar?')) return;
                router.push('/admin/campanhas/dashboard');
              }}
              title="Sair e voltar à área administrativa"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
              Sair
            </button>
          </div>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-1">Campanhas</p>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Lançar Campanha</h1>
              <p className="text-gray-500 mt-1 text-sm font-medium">
                Selecione os criativos e configure sua campanha — Meta, TikTok ou Google
              </p>
              <button
                onClick={() => router.push('/admin/campanhas/importar')}
                className="mt-2 text-xs font-bold text-indigo-500 hover:text-indigo-700 hover:underline transition-colors"
              >
                Já lançou uma campanha direto no Meta? Importar Campanhas Existentes →
              </button>
            </div>

            {/* Phase indicator */}
            <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1 self-start">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">1</span>
                <span className="text-[11px] font-black uppercase tracking-wider">Criativos</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-400">
                <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400">2</span>
                <span className="text-[11px] font-black uppercase tracking-wider">Campanha</span>
              </div>
            </div>
          </div>
        </div>

        <TokenExpiryBanner isDark={false} />
        <AccountBalanceBanner isDark={false} />

        {/* ── Section: Para quem? (only for tenants) ── */}
        {!isMaster && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 space-y-5">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                Esta campanha é para
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => { setCampaignFor('own'); setSelectedClientId(''); setClientSearch(''); }}
                  className={cn(
                    'flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-black transition-all border',
                    campaignFor === 'own'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                  )}
                >
                  <BuildingOfficeIcon className="h-4 w-4" />
                  Minha Empresa
                </button>
                <button
                  onClick={() => setCampaignFor('client')}
                  className={cn(
                    'flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-black transition-all border',
                    campaignFor === 'client'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                  )}
                >
                  <UserCircleIcon className="h-4 w-4" />
                  Para um Cliente
                </button>

                {/* Separador visual */}
                <div className="hidden sm:block h-8 w-px bg-gray-200 mx-1" />

                {/* Consultar campanhas */}
                <button
                  onClick={() => setShowConsultarModal(true)}
                  className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-black transition-all border border-dashed border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/60 active:scale-95"
                >
                  <RectangleStackIcon className="h-4 w-4" />
                  Consultar Campanhas
                </button>
              </div>
            </div>

            {/* Client selector */}
            <AnimatePresence>
              {campaignFor === 'client' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  {selectedClientId ? (
                    /* Selected client chip */
                    <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0">
                        {selectedClient?.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{selectedClient?.name}</p>
                        {selectedClient?.email && (
                          <p className="text-[11px] text-indigo-500 truncate">{selectedClient.email}</p>
                        )}
                      </div>
                      <CheckCircleIcon className="h-5 w-5 text-emerald-500 shrink-0" />
                      <button
                        onClick={() => { setSelectedClientId(''); setClientSearch(''); setTimeout(() => clientSearchRef.current?.focus(), 50); }}
                        className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 ml-1"
                      >
                        Trocar
                      </button>
                    </div>
                  ) : (
                    /* Client search */
                    <>
                      <div className="relative mb-2">
                        <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <input
                          ref={clientSearchRef}
                          type="text"
                          placeholder="Digite o nome ou e-mail do cliente..."
                          value={clientSearch}
                          onChange={e => setClientSearch(e.target.value)}
                          className="w-full pl-10 pr-9 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                        {clientSearch && (
                          <button onClick={() => setClientSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {clientSearch.length > 0 && clientSearch.length < 3 && (
                        <p className="text-[10px] text-gray-400 font-medium px-1 mb-2">
                          Digite mais {3 - clientSearch.length} letra{3 - clientSearch.length !== 1 ? 's' : ''} para filtrar...
                        </p>
                      )}

                      {(() => {
                        const term = clientSearch.trim().toLowerCase();
                        const list = term.length >= 3
                          ? clients.filter(c =>
                              c.name.toLowerCase().includes(term) ||
                              (c.email || '').toLowerCase().includes(term))
                          : clients;
                        if (list.length === 0 && term.length >= 3) {
                          return <p className="text-xs text-gray-400 font-medium px-1 py-2">Nenhum cliente encontrado para "{clientSearch}"</p>;
                        }
                        if (list.length === 0) return null;
                        return (
                          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto divide-y divide-gray-100">
                            {list.map(c => (
                              <button
                                key={c.id}
                                onClick={() => { setSelectedClientId(c.id); setClientSearch(''); }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors text-left group"
                              >
                                <div className="w-8 h-8 rounded-full bg-gray-200 group-hover:bg-indigo-200 flex items-center justify-center text-gray-600 group-hover:text-indigo-700 text-xs font-black shrink-0 transition-colors">
                                  {c.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                                  {c.email && <p className="text-[10px] text-gray-400 truncate">{c.email}</p>}
                                </div>
                                {c.creativesPath && (
                                  <FolderOpenIcon className="h-3.5 w-3.5 text-indigo-400 shrink-0" title="Pasta configurada" />
                                )}
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Folder path hint for selected client */}
            <AnimatePresence>
              {pathHint && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2.5 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                  <FolderOpenIcon className="h-4 w-4 text-indigo-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Pasta configurada nas Configurações do cliente</p>
                    <p className="text-xs font-medium text-indigo-700 truncate mt-0.5">{pathHint}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Consultar Campanhas (acesso direto para Master) ── */}
        {isMaster && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowConsultarModal(true)}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-black transition-all border border-dashed border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/60 active:scale-95 shadow-sm"
            >
              <RectangleStackIcon className="h-4 w-4" />
              Consultar Campanhas
            </button>
          </div>
        )}

        {/* ── Section: Criativos ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">

          {/* Section header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                Fase 1 — Criativos
              </p>
              <p className="text-sm text-gray-500">
                {allImages.length === 0
                  ? 'Selecione uma pasta com as imagens para a campanha'
                  : `${allImages.length} imagem${allImages.length !== 1 ? 'ns' : ''} encontrada${allImages.length !== 1 ? 's' : ''} — selecione até 6`}
              </p>
            </div>
            {allImages.length > 0 && (
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome..."
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-56 shadow-sm"
                />
              </div>
            )}
          </div>

          {/* Folder select button */}
          <div className="flex items-center gap-4 mb-5">
            <button
              onClick={handleSelectFolder}
              disabled={loadingFolder || (!contextReady)}
              className="flex items-center gap-2.5 px-6 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            >
              {loadingFolder
                ? <><ArrowPathIcon className="h-4 w-4 animate-spin" /> Lendo pasta...</>
                : <><FolderOpenIcon className="h-4 w-4" /> Selecionar Pasta</>}
            </button>

            {folderName && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pasta:</span>
                <span className="font-bold">{folderName}</span>
                <span className="text-[10px] text-gray-400">({allImages.length} img)</span>
                <button onClick={resetFiles} className="text-gray-400 hover:text-gray-600 ml-1" title="Limpar">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            )}

            {!supportsPickerAPI && (
              <p className="text-[10px] text-amber-600 font-bold">Use Chrome ou Edge para melhor experiência</p>
            )}
          </div>

          {folderError && (
            <p className="text-xs font-bold text-red-500 flex items-center gap-1.5 mb-4">
              <XMarkIcon className="h-3.5 w-3.5" /> {folderError}
            </p>
          )}

          {/* Empty state */}
          {allImages.length === 0 && !loadingFolder && !folderError && (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-14 text-center">
              <FolderOpenIcon className="h-14 w-14 text-gray-300 mx-auto mb-4" />
              <p className="text-sm font-black text-gray-700 mb-1.5">Selecione uma pasta de criativos</p>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                {!contextReady
                  ? 'Primeiro selecione o cliente acima, depois escolha a pasta'
                  : 'Clique em "Selecionar Pasta" para navegar até os criativos. Você também pode avançar sem imagens.'}
              </p>
            </div>
          )}

          {/* Image grid */}
          {allImages.length > 0 && (
            <>
            {selectionBlocker && (
              <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                {selectionBlocker}
              </p>
            )}
            {!selectionBlocker && videoDraftNotice && (
              <p className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800">
                {videoDraftNotice}
              </p>
            )}
            {selected.some(s => isVideo(s.name)) && (
              <div className="mb-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Prévia do vídeo que será enviado</p>
                {selected.filter(s => isVideo(s.name)).map(v => (
                  <div key={v.name} className="rounded-xl border border-gray-200 bg-black overflow-hidden">
                    <video src={v.path} controls preload="metadata" playsInline className="w-full max-h-[480px] object-contain" />
                    <p className="px-3 py-2 text-[11px] text-gray-300 truncate bg-gray-900">{v.name}</p>
                  </div>
                ))}
              </div>
            )}
            {pendingVideoWarnings.length > 0 && !videoWarningsAccepted && (
              <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">
                  Confirme antes de seguir: {pendingVideoWarnings.length === 1 ? 'um vídeo' : `${pendingVideoWarnings.length} vídeos`} com avisos
                </p>
                <ul className="mt-2 space-y-1">
                  {pendingVideoWarnings.map(v => (
                    <li key={v.name} className="text-xs text-amber-800">
                      <span className="font-medium">{v.name}:</span> {videoWarnings.get(v.name)!.join(' · ')}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVideoWarningsAccepted(true)}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700"
                  >
                    Entendi, usar mesmo assim
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(prev => prev.filter(s => !videoWarnings.has(s.name)))}
                    className="px-3 py-1.5 rounded-lg border border-amber-400 text-amber-800 text-xs font-semibold hover:bg-amber-100"
                  >
                    Remover estes vídeos
                  </button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-start">
              {filtered.map((image, i) => {
                const isSelected = selected.some(s => s.name === image.name);
                const isDisabled = !isSelected && selected.length >= 6;
                return (
                  <motion.div
                    key={image.name}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    onClick={() => !isDisabled && toggleSelect(image)}
                    className={cn(
                      'bg-white rounded-2xl border overflow-hidden cursor-pointer transition-all group shadow-sm',
                      isSelected
                        ? 'border-indigo-500 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/30'
                        : 'border-gray-100 hover:border-indigo-200 hover:shadow-md',
                      isDisabled && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <div
                      className="relative overflow-hidden bg-gray-50"
                      style={{ aspectRatio: imageAspect[image.name] ?? 1 }}
                    >
                      {isVideo(image.name) ? (
                        <video
                          src={image.url}
                          preload="metadata"
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={image.url}
                          alt={image.name}
                          onLoad={e => handleImageLoad(image.name, e)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                      {isVideo(image.name) && (
                        <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-semibold">
                          VÍDEO
                        </span>
                      )}
                      <div className={cn(
                        'absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shadow-sm',
                        isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-white/70 bg-black/20'
                      )}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {isSelected && <div className="absolute inset-0 bg-indigo-600/10" />}
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-xs font-medium text-gray-900 truncate">{image.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{(image.size / 1024).toFixed(0)} KB</p>
                      {videoWarnings.has(image.name) && (
                        <p className="text-[10px] text-amber-600 mt-1 leading-snug">
                          ⚠ {videoWarnings.get(image.name)!.join(' · ')}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              {filtered.length === 0 && filter && (
                <div className="col-span-5 text-center py-12 text-sm text-gray-400 font-medium">
                  Nenhuma imagem corresponde a "{filter}"
                </div>
              )}
            </div>
            </>
          )}
        </div>

        {/* ── Footer action bar ── */}
        <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            {selected.length > 0 ? (
              <>
                {/* Thumbnails */}
                <div className="flex gap-1.5">
                  {selected.slice(0, 5).map(img => (
                    <div key={img.name} className="w-10 h-10 rounded-lg overflow-hidden border-2 border-indigo-200 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {selected.length > 5 && (
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center text-[10px] font-black text-indigo-600">
                      +{selected.length - 5}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {selected.length} criativo{selected.length !== 1 ? 's' : ''} selecionado{selected.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-[11px] text-gray-400">Máximo 6</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">
                {allImages.length === 0
                  ? 'Você pode avançar sem imagens — criativo opcional'
                  : 'Clique nas imagens para selecionar até 6'}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {!networksLoaded && (
              <div className="flex items-center gap-2 text-[11px] font-medium text-gray-400">
                <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                {networksSlow ? 'Ainda carregando as redes disponíveis…' : 'Carregando redes disponíveis…'}
                {networksSlow && (
                  <button
                    type="button"
                    onClick={retryNetworkStatus}
                    className="underline text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Tentar novamente
                  </button>
                )}
              </div>
            )}
            <div className="flex gap-3">
            {(() => {
              const metaOk = networkReady('meta');
              return (
                <button
                  onClick={() => {
                    if (selectionBlocker || (pendingVideoWarnings.length > 0 && !videoWarningsAccepted)) return;
                    setPickedNetwork('meta');
                    uploadPromiseRef.current = uploadSelectedToLibrary(effectiveClientId);
                    setShowWizard(true);
                  }}
                  disabled={!contextReady || !networksLoaded || !metaOk || !!selectionBlocker}
                  title={!metaOk && networksLoaded ? (networkStatus.meta?.contracted === false ? 'Rede não contratada' : 'Rede não conectada — configure em Configurações → Redes') : undefined}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: (contextReady && metaOk) ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#94a3b8' }}
                >
                  <RocketLaunchIcon className="h-4 w-4" />
                  Meta Ads
                </button>
              );
            })()}
            {(() => {
              const tiktokOk = networkReady('tiktok');
              return (
                <button
                  onClick={() => {
                    if (selectionBlocker || (pendingVideoWarnings.length > 0 && !videoWarningsAccepted)) return;
                    setPickedNetwork('tiktok');
                    uploadPromiseRef.current = uploadSelectedToLibrary(effectiveClientId);
                    setShowWizard(true);
                  }}
                  disabled={!contextReady || !networksLoaded || !tiktokOk || !!selectionBlocker}
                  title={!tiktokOk && networksLoaded ? (networkStatus.tiktok?.contracted === false ? 'Rede não contratada' : 'Rede não conectada — configure em Configurações → Redes') : undefined}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-slate-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: (contextReady && tiktokOk) ? 'linear-gradient(135deg, #111827, #000000)' : '#94a3b8' }}
                >
                  <RocketLaunchIcon className="h-4 w-4" />
                  TikTok Ads
                </button>
              );
            })()}
            {(() => {
              const googleOk = networkReady('google');
              return (
                <button
                  onClick={() => {
                    if (selectionBlocker || (pendingVideoWarnings.length > 0 && !videoWarningsAccepted)) return;
                    uploadPromiseRef.current = uploadSelectedToLibrary(effectiveClientId);
                    setShowGoogleWizard(true);
                  }}
                  disabled={!contextReady || !networksLoaded || !googleOk || !!selectionBlocker || selectedVideoCount > 0}
                  title={selectedVideoCount > 0 ? 'Rascunho com vídeo ainda disponível só para Meta e TikTok' : (!googleOk && networksLoaded ? (networkStatus.google?.contracted === false ? 'Rede não contratada' : 'Rede não conectada — configure em Configurações → Redes') : undefined)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-700"
                >
                  <span className="text-base font-black leading-none" aria-hidden="true">G</span>
                  Google AI Max
                </button>
              );
            })()}
            </div>
            {networksLoaded && uncontractedNetworkLabels.length > 0 && (
              <p className="text-xs font-medium text-amber-600 max-w-md text-right">
                {formatUncontractedNetworksMessage(uncontractedNetworkLabels)}
              </p>
            )}
          </div>
        </div>

      </div>

      {/* ── Modal: Consultar Campanhas ── */}
      <CampanhasModal
        isOpen={showConsultarModal}
        onClose={() => setShowConsultarModal(false)}
        effectiveClientId={effectiveClientId}
        campaignFor={campaignFor}
        clientName={selectedClient?.name}
        isMaster={isMaster}
      />

      {/* Hidden file input (fallback para browsers sem showDirectoryPicker) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/mp4,video/quicktime"
        // @ts-ignore — webkitdirectory não está no tipo padrão
        webkitdirectory=""
        className="hidden"
        onChange={handleFileInputChange}
      />
    </div>
  );
}
