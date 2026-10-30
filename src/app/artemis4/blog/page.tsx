import type { Metadata } from 'next'
import Link from 'next/link'

import '../artemis4.css'
import './blog.css'

import { BLOG_POSTS } from './data'
import { BlogHeader } from './BlogHeader'

const ARTEMIS_URL =
  process.env.NEXT_PUBLIC_APP_URL_ARTEMIS || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  title: 'Blog — Artemis9',
  description:
    'Marketing Digital, atendimento automatizado e CRM com inteligência artificial — artigos reais, com fonte verificável, para quem toma decisão no próprio negócio.',
  alternates: { canonical: '/artemis4/blog' },
  openGraph: {
    title: 'Blog — Artemis9',
    description:
      'Marketing Digital, atendimento automatizado e CRM com inteligência artificial — artigos reais, com fonte verificável.',
    type: 'website',
    locale: 'pt_BR',
    url: '/artemis4/blog',
  },
}

const blogJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'Blog — Artemis9',
  url: `${ARTEMIS_URL}/artemis4/blog`,
  inLanguage: 'pt-BR',
}

function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00Z').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export default function BlogIndexPage() {
  return (
    <div className="a4">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />
      <BlogHeader />
      <main>
        <section className="a4-section">
          <div className="a4-wrap">
            <span className="a4-label a4-label--gold">Blog</span>
            <h1 className="a4-h1" style={{ marginTop: '0.75rem' }}>
              Marketing Digital, atendimento e CRM — sem o jargão.
            </h1>
            <p className="a4-lead" style={{ marginTop: '1rem' }}>
              Artigos reais, com fonte verificável, para quem toma decisão no próprio
              negócio — não para gestor de marketing.
            </p>

            <div style={{ marginTop: '2.5rem', display: 'grid', gap: '1.125rem' }}>
              {BLOG_POSTS.map((post) => (
                <Link key={post.slug} href={`/artemis4/blog/${post.slug}`} className="a4-blog-card">
                  <span className="a4-blog-card__meta">
                    {formatDate(post.publishedAt)} · {post.readingMinutes} min de leitura
                  </span>
                  <h2 className="a4-blog-card__title">{post.title}</h2>
                  <p className="a4-blog-card__excerpt">{post.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
