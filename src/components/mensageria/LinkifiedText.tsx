import React from 'react'

// Captura http(s):// e www. até o próximo espaço ou quebra de linha.
const URL_RE = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi

// Pontuação final que costuma vir colada à URL no texto ("...veja https://x.com.").
const TRAILING_PUNCT = /[.,;:!?)\]}]+$/

/**
 * Renderiza texto mantendo quebras de linha e transformando URLs em links clicáveis.
 * Cada link abre em outra aba (target=_blank) sem expor a aba de origem (noopener/noreferrer).
 */
export function LinkifiedText({ text, className }: { text: string; className?: string }) {
  if (!text) return null

  const parts: React.ReactNode[] = []
  let last = 0
  let key = 0

  for (const match of text.matchAll(URL_RE)) {
    const raw = match[0]
    const start = match.index ?? 0
    const trailing = raw.match(TRAILING_PUNCT)?.[0] ?? ''
    const url = trailing ? raw.slice(0, -trailing.length) : raw

    if (start > last) parts.push(text.slice(last, start))

    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
    parts.push(
      <a
        key={`lnk-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 text-[#d4af37] hover:text-[#f0d060] break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>,
    )
    if (trailing) parts.push(trailing)
    last = start + raw.length
  }

  if (last < text.length) parts.push(text.slice(last))

  return <span className={className}>{parts}</span>
}
