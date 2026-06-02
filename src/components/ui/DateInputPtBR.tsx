"use client";
import React from 'react';

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
 * Substituto para <input type="date"> com máscara dd/mm/aaaa.
 *
 * • `value`    — string no formato ISO (YYYY-MM-DD) ou ''
 * • `onChange` — recebe ISO (YYYY-MM-DD) quando o campo está completo, ou ''
 * • `className` / `style` — repassados ao <input>
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
}: {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  const [display, setDisplay] = React.useState(isoToPtBr(value));

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

  return (
    <input
      type="text"
      inputMode="numeric"
      maxLength={10}
      placeholder="dd/mm/aaaa"
      value={display}
      onChange={handleChange}
      className={className}
      style={style}
      disabled={disabled}
    />
  );
}
