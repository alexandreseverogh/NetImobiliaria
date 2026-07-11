'use client';

/**
 * Botão "Empresas" em /admin/master/segments — lista alfabética, com busca e paginação,
 * das empresas (tenants) vinculadas a um segmento. Preparado para segmentos com centenas
 * de empresas no futuro (paginação real via API, não corte no cliente).
 */

import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, BuildingOffice2Icon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { ClientAvatarWithFallback } from '@/components/admin/ClientAvatar';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: string | null;
  cidade: string | null;
  estado: string | null;
  logo_url: string | null;
}

interface Props {
  segment: { id: string; name: string };
  onClose: () => void;
}

const PAGE_SIZE = 15;

export function SegmentTenantsModal({ segment, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search.trim()) params.set('search', search.trim());

    fetch(`/api/admin/master/segments/${segment.id}/tenants?${params}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setTenants(Array.isArray(d.tenants) ? d.tenants : []);
        setTotal(d.total ?? 0);
      })
      .catch(() => { if (!cancelled) setError('Erro ao carregar empresas'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [segment.id, page, search]);

  // Debounce da busca: reseta pra página 1 e só dispara a query 350ms após o último keystroke.
  function handleSearchChange(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setSearch(value);
    }, 350);
  }

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mb-0.5">
              Segmento · {segment.name}
            </p>
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <BuildingOffice2Icon className="h-5 w-5 text-sky-500" /> Empresas
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Busca */}
        <div className="px-6 pt-4 shrink-0">
          <div className="relative">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              defaultValue={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar empresa pelo nome..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && <p className="text-xs text-red-600 font-medium mb-3">⚠️ {error}</p>}

          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : tenants.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
              <BuildingOffice2Icon className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-500">Nenhuma empresa encontrada</p>
              {search && <p className="text-xs text-gray-400 mt-1">Tente outro termo de busca.</p>}
            </div>
          ) : (
            <div className="space-y-1.5">
              {tenants.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 hover:bg-gray-50/80 transition-colors">
                  <ClientAvatarWithFallback name={t.name} logoUrl={t.logo_url} isTenant size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{t.name}</p>
                    {(t.cidade || t.estado) && (
                      <p className="text-[11px] text-gray-400 truncate">
                        {[t.cidade, t.estado].filter(Boolean).join(' / ')}
                      </p>
                    )}
                  </div>
                  <span
                    className={
                      t.status === 'active'
                        ? 'shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-emerald-100 text-emerald-700'
                        : 'shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-gray-100 text-gray-400'
                    }
                  >
                    {t.status === 'active' ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer — paginação */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-gray-500">
            {total > 0 ? `Página ${page} de ${totalPages} · ${total} empresa${total === 1 ? '' : 's'}` : 'Nenhum resultado'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="ml-2 px-4 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-white transition-all"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
