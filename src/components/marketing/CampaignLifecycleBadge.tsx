'use client';

import { useState, useCallback } from 'react';
import {
  LIFECYCLE_LABELS,
  LIFECYCLE_COLORS,
  LIFECYCLE_EMOJI,
  VALID_TRANSITIONS,
  type LifecycleStatus,
} from '@/lib/marketing/services/campaignLifecycleTypes';
import { ChevronDownIcon, ClockIcon } from '@heroicons/react/24/outline';

interface LifecycleEvent {
  from_status: string;
  to_status: string;
  trigger_source: string;
  reason: string | null;
  created_at: string;
}

interface Props {
  campaignId: string;
  status: LifecycleStatus;
  changedAt?: string;
  /** Se omitido, o badge busca lazy ao abrir o painel */
  history?: LifecycleEvent[];
  onTransition?: (toStatus: LifecycleStatus) => Promise<void>;
  compact?: boolean;
}

const SOURCE_LABEL: Record<string, string> = {
  AGENT:  '🤖 Agente',
  MANUAL: '👤 Manual',
  SYNC:   '🔄 Sync',
  CRON:   '⏰ Cron',
};

export function CampaignLifecycleBadge({
  campaignId, status, changedAt, history: historyProp, onTransition, compact = false,
}: Props) {
  const [showMenu, setShowMenu]         = useState(false);
  const [showHistory, setShowHistory]   = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [history, setHistory]           = useState<LifecycleEvent[]>(historyProp ?? []);
  const [historyLoading, setHistoryLoading] = useState(false);

  const validNext = VALID_TRANSITIONS[status] ?? [];

  async function handleTransition(toStatus: LifecycleStatus) {
    if (!onTransition) return;
    setTransitioning(true);
    setShowMenu(false);
    try {
      await onTransition(toStatus);
    } finally {
      setTransitioning(false);
    }
  }

  const toggleHistory = useCallback(async () => {
    const next = !showHistory;
    setShowHistory(next);
    // Busca lazy apenas na primeira abertura e se não veio via prop
    if (next && history.length === 0 && !historyProp) {
      setHistoryLoading(true);
      try {
        const res = await fetch(`/api/admin/campanhas/campaigns/${campaignId}/lifecycle`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history ?? []);
        }
      } catch {
        // silencioso
      } finally {
        setHistoryLoading(false);
      }
    }
  }, [showHistory, history.length, historyProp, campaignId]);

  return (
    <div className="relative inline-flex flex-col gap-1">
      {/* Badge principal */}
      <div className="flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${LIFECYCLE_COLORS[status]}`}>
          <span>{LIFECYCLE_EMOJI[status]}</span>
          {LIFECYCLE_LABELS[status]}
        </span>

        {/* Botão de transição manual */}
        {!compact && onTransition && validNext.length > 0 && (
          <button
            onClick={() => setShowMenu(v => !v)}
            disabled={transitioning}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all disabled:opacity-50"
            title="Alterar status"
          >
            <ChevronDownIcon className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Botão de histórico */}
        {!compact && (
          <button
            onClick={toggleHistory}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
            title="Ver histórico"
          >
            <ClockIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {changedAt && !compact && (
        <span className="text-[9px] text-gray-400 font-medium ml-1">
          desde {new Date(changedAt).toLocaleDateString('pt-BR')}
        </span>
      )}

      {/* Dropdown de transições */}
      {showMenu && (
        <div className="absolute top-8 left-0 z-30 bg-white border border-gray-200 rounded-xl shadow-xl p-2 min-w-[160px]">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2 pb-1">
            Mover para
          </p>
          {validNext.map(next => (
            <button
              key={next}
              onClick={() => handleTransition(next)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all text-left"
            >
              <span>{LIFECYCLE_EMOJI[next]}</span>
              {LIFECYCLE_LABELS[next]}
            </button>
          ))}
        </div>
      )}

      {/* Histórico de transições */}
      {showHistory && (
        <div className="absolute top-8 left-0 z-30 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-80">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Histórico</p>
            <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-700 text-xs">✕</button>
          </div>

          {historyLoading && (
            <p className="text-[10px] text-gray-400 py-2 text-center">Carregando...</p>
          )}

          {!historyLoading && history.length === 0 && (
            <p className="text-[10px] text-gray-400 py-2 text-center">Nenhuma transição registrada</p>
          )}

          {!historyLoading && history.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {history.map((ev, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-gray-300 font-mono mt-0.5">│</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${LIFECYCLE_COLORS[ev.from_status as LifecycleStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ev.from_status}
                      </span>
                      <span className="text-gray-300">→</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${LIFECYCLE_COLORS[ev.to_status as LifecycleStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ev.to_status}
                      </span>
                      <span className="text-[9px] text-gray-400">{SOURCE_LABEL[ev.trigger_source] ?? ev.trigger_source}</span>
                    </div>
                    {ev.reason && (
                      <p className="text-[9px] text-gray-500 mt-0.5">{ev.reason}</p>
                    )}
                    <p className="text-[9px] text-gray-400">
                      {new Date(ev.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
