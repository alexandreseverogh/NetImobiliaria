'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import * as HeroIcons from '@heroicons/react/24/outline'
import FeedCategoriasSection from './FeedCategoriasSection'

type FeedPost = {
  id: number
  titulo: string
  resumo: string
  url_original: string
  url_imagem: string | null
  data_publicacao: string
  categoria_nome: string
  categoria_cor: string
  categoria_icone: string
  fonte_nome: string
}

const IconRenderer = ({ iconName, className }: { iconName: string; className?: string }) => {
  const Icon = (HeroIcons as any)[iconName]
  return Icon ? <Icon className={className} /> : null
}

export default function FeedSectionClient() {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const res = await fetch('/api/public/feed', { cache: 'no-store' })
        const json = await res.json().catch(() => null)
        if (!alive) return
        if (res.ok && json?.success && Array.isArray(json.data)) {
          setPosts(json.data)
        } else {
          setPosts([])
        }
      } catch {
        if (!alive) return
        setPosts([])
      } finally {
        if (!alive) return
        setLoading(false)
      }
    }

    load()
    return () => {
      alive = false
    }
  }, [])

  if (loading) return null
  if (!posts || posts.length === 0) return null

  return (
    <section className="w-full py-16 bg-gray-50 border-t border-gray-200">
      <div className="max-w-[2496px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Fique por Dentro do Mercado</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            As últimas notícias, tendências e análises do setor imobiliário selecionadas para você.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto pb-4 lg:pb-0 lg:overflow-visible snap-x snap-mandatory scrollbar-hide">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={post.url_original}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 snap-start"
            >
              <div className="relative h-48 bg-gray-100">
                {post.url_imagem ? (
                  <Image src={post.url_imagem} alt={post.titulo} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">Sem imagem</div>
                )}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm" style={{ backgroundColor: post.categoria_cor || '#3B82F6' }}>
                    <IconRenderer iconName={post.categoria_icone || 'NewspaperIcon'} className="w-4 h-4 text-white" />
                    {post.categoria_nome}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <span className="font-medium text-gray-700">{post.fonte_nome}</span>
                  <span>•</span>
                  <time>{new Date(post.data_publicacao).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{post.titulo}</h3>
                <p className="text-sm text-gray-600 line-clamp-3">{post.resumo}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                  Ler na íntegra
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M3 10a.75.75 0 0 1 .75-.75h10.69l-3.22-3.22a.75.75 0 1 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06l3.22-3.22H3.75A.75.75 0 0 1 3 10Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <FeedCategoriasSection />
      </div>
    </section>
  )
}


