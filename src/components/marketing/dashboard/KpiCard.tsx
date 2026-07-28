import React from 'react';
import { cn } from '@/lib/marketing-utils';

export function KpiCard({ isDark, label, value, fullValue, color, delta, invertDelta, tooltip, breakdown }: {
  isDark: boolean; label: string; value: string; fullValue?: string; color: string;
  delta?: number; invertDelta?: boolean; tooltip?: string;
  breakdown?: { label: string; value: string }[];
}) {
  let deltaColor = isDark ? 'text-slate-600' : 'text-gray-400';
  let deltaIcon  = '';
  let deltaBg    = '';
  let deltaTitle = '';

  if (delta !== undefined && Math.abs(delta) > 0.5) {
    const isPositive = delta > 0;
    const isGood     = invertDelta ? !isPositive : isPositive;

    // Cores: verde = bom, vermelho = ruim
    deltaColor = isGood
      ? (isDark ? 'text-emerald-400' : 'text-emerald-700')
      : (isDark ? 'text-red-400'     : 'text-red-600');
    deltaBg = isGood
      ? (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50')
      : (isDark ? 'bg-red-500/10'     : 'bg-red-50');

    // Seta: sempre ↑ quando bom, ↓ quando ruim — direção semântica, não matemática
    // (ex: CPC caiu 58% → performance melhorou → seta verde ↑)
    deltaIcon = isGood ? '↑' : '↓';

    // Tooltip: mostra o que realmente aconteceu + interpretação
    const realDir  = isPositive ? 'subiu'  : 'caiu';
    const goodText = isGood ? 'performance melhorou ✓' : 'requer atenção ⚠';
    deltaTitle = `${label} ${realDir} ${Math.abs(delta).toFixed(1)}% vs período anterior — ${goodText}`;
  }

  // Tooltip do card: usa o tooltip explícito ou o tooltip do delta
  const cardTitle = tooltip || (fullValue ? `${label}: ${fullValue}` : undefined);

  return (
    <div
      title={cardTitle}
      className={cn(
        'group rounded-2xl border p-3.5 flex flex-col gap-1.5 min-w-0 overflow-hidden transition-all duration-200 cursor-default',
        isDark
          ? 'bg-[rgba(255,255,255,0.025)] border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(99,102,241,0.4)] hover:shadow-[0_0_24px_rgba(99,102,241,0.12)] hover:-translate-y-0.5'
          : 'bg-white border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.09)] hover:-translate-y-0.5',
      )}
    >
      {/* Label */}
      <span className={`text-[9px] font-black uppercase tracking-widest leading-none truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        {label}
      </span>

      {/* Valor — versão compacta para caber no card */}
      <span
        className={cn('text-sm font-black font-mono leading-tight', color)}
        style={{ wordBreak: 'keep-all', overflowWrap: 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
        title={fullValue ?? value}
      >
        {value}
      </span>

      {/* Delta — seta semântica: ↑ verde = melhorou, ↓ vermelho = piorou */}
      {delta !== undefined && deltaIcon && (
        <span
          title={deltaTitle}
          className={cn(
            'self-start text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none whitespace-nowrap cursor-help',
            deltaColor, deltaBg,
          )}
        >
          {deltaIcon} {Math.abs(delta).toFixed(1)}%
        </span>
      )}
      {/* Variação insignificante */}
      {delta !== undefined && Math.abs(delta) <= 0.5 && (
        <span className={cn('text-[8px] font-bold', isDark ? 'text-slate-700' : 'text-slate-300')}>
          = estável
        </span>
      )}

      {/* Breakdown de Multi-Network ou Categorias */}
      {breakdown && breakdown.length > 0 && (
        <div className="flex flex-col gap-0.5 mt-1 border-t border-[rgba(255,255,255,0.05)] pt-1">
          {breakdown.map((b, i) => (
            <div key={i} className={cn("text-[9px] flex justify-between", isDark ? 'text-slate-500' : 'text-slate-400')}>
              <span>{b.label}:</span>
              <span className="font-bold">{b.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function HookRateKpiCard({ isDark, value, color, benchmarks: bm }: {
  isDark: boolean; value: number; color: string;
  benchmarks: { hook_rate_critical: number; hook_rate_min: number; hook_rate_good: number };
}) {
  const [showRef, setShowRef] = React.useState(false);
  const { hook_rate_critical: crit, hook_rate_min: min, hook_rate_good: good } = bm;

  // Tabela de referência construída dinamicamente a partir dos benchmarks do banco
  const benchmarks = [
    { range: `≥ ${good}%`,           label: 'Excelente', cls: 'text-emerald-400' },
    { range: `${min}–${good - 1}%`,  label: 'Bom',       cls: 'text-emerald-500' },
    { range: `${crit}–${min - 1}%`,  label: 'Atenção',   cls: 'text-amber-400' },
    { range: `< ${crit}%`,           label: 'Crítico',   cls: 'text-red-400' },
  ];

  return (
    <div className={cn(
      'group relative rounded-2xl border p-3.5 flex flex-col gap-1.5 min-w-0 overflow-visible transition-all duration-200',
      isDark
        ? 'bg-[rgba(255,255,255,0.025)] border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.12)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:-translate-y-0.5'
        : 'bg-white border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.09)] hover:-translate-y-0.5',
    )}>
      {/* Label + ícone de referência */}
      <div className="flex items-center justify-between gap-1">
        <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Hook Rate
        </span>
        <button
          type="button"
          onClick={() => setShowRef(v => !v)}
          title="Ver referência de benchmarks"
          className={cn(
            'flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black leading-none transition-colors',
            showRef
              ? 'bg-[#c5a028] text-[#020c1b]'
              : isDark ? 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700',
          )}
        >
          i
        </button>
      </div>

      {/* Valor */}
      <span
        className={cn('text-sm font-black font-mono leading-tight', color)}
        style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
        title={`Hook Rate: ${value.toFixed(2)}% — views 3s / impressões × 100`}
      >
        {value.toFixed(1)}%
      </span>

      {/* Tabela de referência — aparece ao clicar no ⓘ, anchorada no canto direito do card */}
      {showRef && (
        <div className={cn(
          'absolute top-full right-0 mt-1.5 z-50 rounded-xl border shadow-xl p-3 min-w-[160px]',
          isDark
            ? 'bg-[#0d1421] border-[rgba(255,255,255,0.1)]'
            : 'bg-white border-slate-200',
        )}>
          <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Referência Hook Rate
          </p>
          <p className={`text-[9px] mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            views 3s ÷ impressões × 100
          </p>
          <table className="w-full text-[10px]">
            <thead>
              <tr className={isDark ? 'text-slate-600' : 'text-slate-400'}>
                <th className="text-left font-black pb-1">Faixa</th>
                <th className="text-right font-black pb-1">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
              {benchmarks.map(b => (
                <tr key={b.range}>
                  <td className={`py-1 font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{b.range}</td>
                  <td className={`py-1 text-right font-black ${b.cls}`}>{b.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
