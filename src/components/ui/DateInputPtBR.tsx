"use client";
import React from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';

// ─── helpers ──────────────────────────────────────────────────────────────────

export function ptBrToIso(v: string): string {
  const [d, m, y] = v.split('/');
  if (!d || !m || !y || y.length < 4) return '';
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

export function isoToPtBr(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

// ─── component ────────────────────────────────────────────────────────────────

/**
 * Substituto para <input type="date"> com máscara dd/mm/aaaa + ícone de calendário
 * (abre o seletor nativo do navegador via .showPicker() — o input nativo em si nunca
 * é exibido, só serve de gatilho, então o valor continua sempre ISO independente do
 * formato do SO).
 *
 * • `value`    — string no formato ISO (YYYY-MM-DD) ou ''
 * • `onChange` — recebe ISO (YYYY-MM-DD) quando o campo está completo, ou ''
 * • `className` / `style` — repassados ao <input> de texto visível
 *
 * CONVENÇÃO: todas as datas na UI devem usar este componente. Proibido
 * usar <input type="date"> diretamente — exibe formato do SO (mm/dd).
 */
export default function DateInputPtBR({
  value,
  onChange,
  className,
  style,
  disabled,
  required,
}: {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  required?: boolean;
}) {
  const [display, setDisplay] = React.useState(isoToPtBr(value));
  const nativeRef = React.useRef<HTMLInputElement>(null);

  // Sincroniza quando o valor externo muda (ex.: limpar ao trocar período)
  React.useEffect(() => {
    setDisplay(isoToPtBr(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (raw.length > 4) raw = raw.slice(0, 2) + '/' + raw.slice(2, 4) + '/' + raw.slice(4);
    else if (raw.length > 2) raw = raw.slice(0, 2) + '/' + raw.slice(2);
    setDisplay(raw);
    if (raw.length === 10) {
      const iso = ptBrToIso(raw);
      if (iso) onChange(iso);
    } else if (raw === '') {
      onChange('');
    }
  }

  function handleNativeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const iso = e.target.value;
    if (iso) {
      setDisplay(isoToPtBr(iso));
      onChange(iso);
    }
  }

  function openPicker() {
    if (disabled) return;
    const el = nativeRef.current;
    if (!el) return;
    // showPicker() é suportado em Chrome/Edge — fallback pro focus em navegadores
    // sem suporte (ainda abre o calendário nativo ao focar, na maioria dos casos)
    if (typeof (el as any).showPicker === 'function') {
      try { (el as any).showPicker(); } catch { el.focus(); }
    } else {
      el.focus();
    }
  }

  return (
    <span className="relative inline-block w-full">
      <input
        type="text"
        inputMode="numeric"
        maxLength={10}
        placeholder="dd/mm/aaaa"
        value={display}
        onChange={handleChange}
        className={className}
        style={{ paddingRight: 28, ...style }}
        disabled={disabled}
        required={required}
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        tabIndex={-1}
        aria-label="Escolher data no calendário"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#c5a028] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <CalendarIcon className="w-4 h-4" />
      </button>
      {/* Input nativo invisível — só existe pra disparar o seletor de calendário do
          navegador via showPicker(); nunca é exibido ao usuário como texto. */}
      <input
        ref={nativeRef}
        type="date"
        value={value || ''}
        onChange={handleNativeChange}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none"
      />
    </span>
  );
}
