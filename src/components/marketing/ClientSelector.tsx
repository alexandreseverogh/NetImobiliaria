"use client";
/**
 * ClientSelector — Seletor de contexto de cliente para o módulo de campanhas.
 *
 * variant='dropdown' (padrão):
 *   Botão dropdown glassmorphism com todas as opções.
 *
 * variant='toggle':
 *   Pills inline [Minha Empresa] [Para um Cliente ▾] — estilo nova campanha.
 *   Inclui opção "Todas" sutil para visão agregada.
 *
 * Opções de valor:
 *   all  → Todas as campanhas (próprias + clientes)
 *   own  → Apenas campanhas do próprio tenant
 *   uuid → Campanhas de um cliente específico
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/marketing-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClientFilterValue = 'segment' | 'own' | string;
// 'segment'  → Todos os clientes do segmento ativo (inteligência de segmento)
// 'own'      → Apenas campanhas do próprio tenant (sem client_id)
// uuid       → Campanhas de um cliente específico

export interface ClientOption {
  id: string;
  name: string;
  email?: string | null;
  segmentName?: string | null;
  segmentColor?: string | null;
  segmentIcon?: string | null;
  campaignCount?: number;
}

export interface ClientSelectorProps {
  /** Valor atual do filtro */
  value: ClientFilterValue;
  /** Callback disparado ao mudar seleção */
  onChange: (value: ClientFilterValue) => void;
  /** Lista de clientes — buscada de GET /api/admin/campanhas/clients */
  clients: ClientOption[];
  /** Está carregando os clientes? */
  loading?: boolean;
  /** Estilo extra para o wrapper */
  className?: string;
  /** Chave para persistência no sessionStorage (ex: "dashboard", "leads") */
  storageKey?: string;
  /**
   * 'dropdown' (padrão) — botão com dropdown
   * 'toggle'            — pills Minha Empresa / Para um Cliente (estilo nova campanha)
   */
  variant?: 'dropdown' | 'toggle';
  /** Nome do segmento ativo — usado no label de "Todos os Clientes" */
  activeSegmentName?: string;
  /**
   * Exibe o pill "Todos os Clientes" (valor 'segment'). Default true.
   * Páginas onde só faz sentido um destino único (ex: publicações orgânicas)
   * devem passar false — restando apenas "Minha Empresa" / "Para um Cliente".
   */
  allowSegment?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

const SEGMENT_COLORS: Record<string, string> = {
  imobiliario:         'bg-blue-500',
  automotivo:          'bg-orange-500',
  varejo:              'bg-emerald-500',
  ecommerce:           'bg-emerald-500',
  saude:               'bg-rose-500',
  educacao:            'bg-violet-500',
  beleza:              'bg-pink-500',
  'marketing-digital': 'bg-indigo-500',
};

function segmentColor(seg?: string | null): string {
  if (!seg) return 'bg-gray-400';
  const key = seg.toLowerCase().replace(/\s+/g, '-');
  return SEGMENT_COLORS[key] || 'bg-indigo-500';
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ClientSelector({
  value,
  onChange,
  clients,
  loading = false,
  className,
  storageKey,
  variant = 'dropdown',
  activeSegmentName,
  allowSegment = true,
}: ClientSelectorProps) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef   = useRef<HTMLInputElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Focar campo de busca ao abrir
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  // Padrão é sempre 'own' (Minha Empresa) ao carregar a página — sem restaurar do sessionStorage.
  const persistValue = useCallback((v: ClientFilterValue) => {
    onChange(v);
  }, [onChange]);

  // Filtrar clientes pela busca
  const filtered = search.length >= 2
    ? clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase())
      )
    : clients;

  // ── Toggle variant ──────────────────────────────────────────────────────────
  if (variant === 'toggle') {
    const isClientSelected = value !== 'segment' && value !== 'own';
    const selectedClient   = isClientSelected ? clients.find(c => c.id === value) : null;
    const segmentLabel     = activeSegmentName
      ? `Todos · ${activeSegmentName}`
      : 'Todos os Clientes';

    return (
      <div ref={dropdownRef} className={cn('relative flex items-center gap-1 flex-wrap', className)}>

        {/* 1. Pill: Minha Empresa */}
        <button
          onClick={() => { persistValue('own'); setOpen(false); }}
          className={cn(
            'h-9 flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold transition-all border whitespace-nowrap',
            value === 'own'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-200 hover:text-gray-800 shadow-sm',
          )}
        >
          <BuildingOfficeIcon className="h-3.5 w-3.5" />
          Minha Empresa
        </button>

        {/* Pill: Para um Cliente ▾ */}
        <button
          onClick={() => setOpen(o => !o)}
          className={cn(
            'h-9 flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold transition-all border whitespace-nowrap',
            isClientSelected
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : open
                ? 'bg-white border-indigo-300 ring-2 ring-indigo-500/20 text-gray-900 shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-200 hover:text-gray-800 shadow-sm',
          )}
        >
          {loading ? (
            <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isClientSelected && selectedClient ? (
            <div className={cn(
              'h-4 w-4 rounded flex items-center justify-center text-[8px] font-black text-white shrink-0',
              segmentColor(selectedClient.segmentName),
            )}>
              {initials(selectedClient.name)}
            </div>
          ) : (
            <UserGroupIcon className="h-3.5 w-3.5" />
          )}
          <span className="max-w-[130px] truncate">
            {isClientSelected && selectedClient ? selectedClient.name : 'Para um Cliente'}
          </span>
          <ChevronDownIcon className={cn(
            'h-3 w-3 transition-transform duration-150',
            open && 'rotate-180',
          )} />
        </button>

        {/* Dropdown de clientes (abre sob o terceiro pill) */}
        {open && (
          <div className={cn(
            'absolute right-0 top-full mt-2 z-50 w-64',
            'bg-white rounded-2xl border border-gray-100 shadow-2xl shadow-gray-900/10',
            'animate-in fade-in slide-in-from-top-2 duration-150',
          )}>
            {/* Busca */}
            <div className="p-3 border-b border-gray-50">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-8 py-2 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Lista de clientes */}
            <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
              {filtered.length > 0 ? (
                filtered.map(client => (
                  <DropdownOption
                    key={client.id}
                    icon={
                      <div className={cn(
                        'h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0',
                        segmentColor(client.segmentName),
                      )}>
                        {initials(client.name)}
                      </div>
                    }
                    label={client.name}
                    sublabel={client.segmentName || client.email || undefined}
                    badge={client.campaignCount !== undefined ? String(client.campaignCount) : undefined}
                    selected={value === client.id}
                    onClick={() => { persistValue(client.id); setOpen(false); setSearch(''); }}
                    dotColor={segmentColor(client.segmentName)}
                  />
                ))
              ) : (
                <div className="py-8 flex flex-col items-center gap-1 text-center px-4">
                  {clients.length === 0 ? (
                    <>
                      <BuildingOfficeIcon className="h-6 w-6 text-gray-300 mb-1" />
                      <p className="text-xs font-semibold text-gray-400">Nenhum cliente cadastrado</p>
                      <p className="text-[11px] text-gray-300">Cadastre clientes em Configurações</p>
                    </>
                  ) : (
                    <>
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-300 mb-1" />
                      <p className="text-xs text-gray-400">Nenhum cliente encontrado</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Pill: Todos os Clientes do Segmento — só aparece quando há clientes */}
        {allowSegment && clients.length > 0 && (
          <button
            onClick={() => { persistValue('segment'); setOpen(false); }}
            title={`Inteligência do segmento ${activeSegmentName ?? ''} com ${clients.length} cliente${clients.length !== 1 ? 's' : ''} externo${clients.length !== 1 ? 's' : ''} + Minha Empresa`}
            className={cn(
              'h-9 flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold transition-all border whitespace-nowrap',
              value === 'segment'
                ? 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-500/25'
                : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300 hover:text-violet-700 shadow-sm',
            )}
          >
            <UserGroupIcon className="h-3.5 w-3.5" />
            {segmentLabel}
            <span className={cn(
              'text-[9px] font-black px-1.5 py-0.5 rounded-full',
              value === 'segment'
                ? 'bg-white/20 text-white'
                : 'bg-violet-50 text-violet-600',
            )}>
              {clients.length}
            </span>
          </button>
        )}

      </div>
    );
  }

  // ── Dropdown variant (original) ─────────────────────────────────────────────

  function currentLabel(): string {
    if (value === 'all') return 'Todas as campanhas';
    if (value === 'own') return 'Minha empresa';
    const client = clients.find(c => c.id === value);
    return client?.name || 'Cliente';
  }

  function currentIcon() {
    if (value === 'all') return <UserGroupIcon className="h-4 w-4 text-indigo-500" />;
    if (value === 'own') return <BuildingOfficeIcon className="h-4 w-4 text-indigo-500" />;
    const client = clients.find(c => c.id === value);
    if (!client) return <UserGroupIcon className="h-4 w-4 text-gray-400" />;
    return (
      <div className={cn(
        'h-5 w-5 rounded-md flex items-center justify-center text-[9px] font-black text-white shrink-0',
        segmentColor(client.segmentName),
      )}>
        {initials(client.name)}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-2.5 h-10 pl-3 pr-3 rounded-xl border text-sm font-semibold transition-all',
          'bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500',
          open
            ? 'border-indigo-300 ring-2 ring-indigo-500/20 shadow-lg'
            : 'border-gray-200 shadow-sm hover:border-indigo-200',
        )}
      >
        {loading ? (
          <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        ) : currentIcon()}
        <span className="text-gray-900 max-w-[140px] truncate">{currentLabel()}</span>
        <ChevronDownIcon className={cn(
          'h-3.5 w-3.5 text-gray-400 transition-transform duration-200',
          open && 'rotate-180',
        )} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className={cn(
          'absolute left-0 top-full mt-2 z-50 w-72',
          'bg-white rounded-2xl border border-gray-100 shadow-2xl shadow-gray-900/10',
          'animate-in fade-in slide-in-from-top-2 duration-150',
        )}>
          {/* Campo de busca */}
          <div className="p-3 border-b border-gray-50">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-8 py-2 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Opções */}
          <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
            {!search && (
              <DropdownOption
                icon={<UserGroupIcon className="h-4 w-4 text-indigo-500" />}
                label="Todas as campanhas"
                sublabel="Próprias + clientes"
                selected={value === 'all'}
                onClick={() => { persistValue('all'); setOpen(false); setSearch(''); }}
                dotColor="bg-indigo-500"
              />
            )}
            {!search && (
              <DropdownOption
                icon={<BuildingOfficeIcon className="h-4 w-4 text-indigo-500" />}
                label="Minha empresa"
                sublabel="Campanhas sem cliente"
                selected={value === 'own'}
                onClick={() => { persistValue('own'); setOpen(false); setSearch(''); }}
                dotColor="bg-gray-400"
              />
            )}
            {!search && clients.length > 0 && (
              <div className="px-4 py-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                  Clientes — {clients.length}
                </span>
              </div>
            )}
            {filtered.length > 0 ? (
              filtered.map(client => (
                <DropdownOption
                  key={client.id}
                  icon={
                    <div className={cn(
                      'h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0',
                      segmentColor(client.segmentName),
                    )}>
                      {initials(client.name)}
                    </div>
                  }
                  label={client.name}
                  sublabel={client.segmentName || client.email || undefined}
                  badge={client.campaignCount !== undefined ? String(client.campaignCount) : undefined}
                  selected={value === client.id}
                  onClick={() => { persistValue(client.id); setOpen(false); setSearch(''); }}
                  dotColor={segmentColor(client.segmentName)}
                />
              ))
            ) : search.length >= 2 ? (
              <div className="py-8 flex flex-col items-center text-gray-400">
                <MagnifyingGlassIcon className="h-6 w-6 mb-2 opacity-40" />
                <p className="text-xs font-semibold">Nenhum cliente encontrado</p>
              </div>
            ) : null}
          </div>

          {clients.length === 0 && !loading && !search && (
            <div className="p-4 border-t border-gray-50 text-center">
              <p className="text-xs text-gray-400">Nenhum cliente cadastrado ainda</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-componente: linha da dropdown ────────────────────────────────────────

function DropdownOption({
  icon, label, sublabel, badge, selected, onClick, dotColor,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  badge?: string;
  selected: boolean;
  onClick: () => void;
  dotColor: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all',
        selected ? 'bg-indigo-50' : 'hover:bg-gray-50',
      )}
    >
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-semibold truncate',
          selected ? 'text-indigo-700' : 'text-gray-900',
        )}>
          {label}
        </p>
        {sublabel && (
          <p className="text-[11px] text-gray-400 truncate mt-0.5">{sublabel}</p>
        )}
      </div>
      {badge !== undefined && (
        <span className="shrink-0 text-[10px] font-black text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
          {badge}
        </span>
      )}
      {selected && <CheckIcon className="h-4 w-4 text-indigo-600 shrink-0" />}
    </button>
  );
}

// ─── Hook: carrega clientes e gerencia estado do seletor ──────────────────────

/**
 * Hook para carregar e gerenciar o filtro de clientes.
 *
 * @param segmentId — quando fornecido, busca apenas clientes desse segmento.
 * @param isOwnSegment — true quando o segmento ativo é o do próprio tenant.
 *   Default inteligente ao trocar de segmento:
 *     - segmento do tenant (isOwnSegment) → 'own' (Minha Empresa tem campanhas próprias)
 *     - outro segmento                    → 'segment' (Todos os Clientes); "Minha Empresa"
 *       seria estruturalmente vazia, pois campanhas sem cliente herdam o segmento do tenant.
 */
export function useClientSelector(storageKey?: string, segmentId?: string | null, isOwnSegment?: boolean) {
  const [clients,      setClients]      = useState<ClientOption[]>([]);
  const [loading,      setLoading]      = useState(true);
  // Padrão = 'own' (Minha Empresa). Nunca misturar dados de segmentos distintos.
  const [clientFilter, setClientFilter] = useState<ClientFilterValue>('own');

  useEffect(() => {
    // Default inteligente: 'own' só no segmento do tenant; senão 'segment' (Todos)
    setClientFilter(isOwnSegment ? 'own' : 'segment');
    setLoading(true);

    const params = new URLSearchParams();
    if (segmentId) params.set('segmentId', segmentId);

    const url = `/api/admin/campanhas/clients${params.size ? `?${params}` : ''}`;

    fetch(url, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list: any[] = Array.isArray(data) ? data : (data.clients || []);
        setClients(list.map((c: any) => ({
          id:            c.id   || c.uuid,
          name:          c.name || c.nome || '',
          email:         c.email || null,
          segmentName:   c.segmentName || c.segment_name || c.segment_slug || null,
          segmentColor:  c.segmentColor || null,
          segmentIcon:   c.segmentIcon  || null,
          campaignCount: c.campaignCount ?? undefined,
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentId, isOwnSegment]);

  return { clients, loading, clientFilter, setClientFilter };
}
