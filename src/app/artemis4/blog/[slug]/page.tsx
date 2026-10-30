import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import '../../artemis4.css'
import '../blog.css'

import { BLOG_POSTS, getBlogPost, type BlogBlock } from '../data'
import { SOURCES } from '../../data'
import { BlogHeader } from '../BlogHeader'

const ARTEMIS_URL =
  process.env.NEXT_PUBLIC_APP_URL_ARTEMIS || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getBlogPost(params.slug)
  if (!post) return {}

  return {
    title: `${post.title} — Blog Artemis9`,
    description: post.excerpt,
    alternates: { canonical: `/artemis4/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      locale: 'pt_BR',
      url: `/artemis4/blog/${post.slug}`,
      publishedTime: post.publishedAt,
    },
  }
}

function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00Z').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function renderBlock(block: BlogBlock, idx: number) {
  switch (block.type) {
    case 'h2':
      return <h2 key={idx}>{block.text}</h2>
    case 'list':
      return (
        <ul key={idx}>
          {(block.items ?? []).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )
    case 'quote': {
      const source = block.sourceId ? SOURCES[block.sourceId] : undefined
      return (
        <blockquote key={idx}>
          <p>{block.text}</p>
          {source && (
            <cite>
              {source.label}
              {source.url && (
                <>
                  {' — '}
                  <a href={source.url} target="_blank" rel="noopener noreferrer nofollow">
                    fonte
                  </a>
                </>
              )}
            </cite>
          )}
        </blockquote>
      )
    }
    default:
      return <p key={idx}>{block.text}</p>
  }
}

export default function BlogArticlePage({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug)
  if (!post) notFound()

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    inLanguage: 'pt-BR',
    url: `${ARTEMIS_URL}/artemis4/blog/${post.slug}`,
    author: { '@type': 'Organization', name: 'Artemis9' },
    publisher: { '@type': 'Organization', name: 'Artemis9' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${ARTEMIS_URL}/artemis4/blog/${post.slug}` },
  }

  return (
    <div className="a4">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <BlogHeader />
      <main>
        <article className="a4-section">
          <div className="a4-wrap">
            <div className="a4-article">
              <span className="a4-blog-card__meta">
                {formatDate(post.publishedAt)} · {post.readingMinutes} min de leitura
              </span>
              <h1 className="a4-h2" style={{ marginTop: '0.75rem', fontStyle: 'normal' }}>
                {post.title}
              </h1>
              <div style={{ marginTop: '2rem' }}>{post.body.map(renderBlock)}</div>
            </div>
          </div>
        </article>
      </main>
    </div>
  )
}
