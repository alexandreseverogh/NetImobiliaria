/**
 * Cabeçalho leve do blog — deliberadamente mais simples que o Nav da landing
 * (components/Chrome.tsx), que depende de âncoras específicas da página de 1
 * seção só (#diagnostico, #modulos...) que não existem aqui. Mesma identidade
 * visual (herda os tokens de .a4 via o layout.tsx pai), navegação mínima.
 */
import Link from 'next/link'

export function BlogHeader() {
  return (
    <header className="a4-blog-header">
      <Link href="/artemis4" className="a4-blog-header__brand">
        <span className="a4-label a4-label--gold">Artemis9</span>
      </Link>
      <nav aria-label="Navegação do blog">
        <Link href="/artemis4" className="a4-btn a4-btn--ghost a4-btn--sm">
          ← Voltar pra Artemis9
        </Link>
      </nav>
    </header>
  )
}
