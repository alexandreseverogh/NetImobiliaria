import { redirect } from 'next/navigation'
import { getDestinationBySlug } from '@/lib/cta/service'
import CtaFormClient from './CtaFormClient'

export const dynamic = 'force-dynamic'

/**
 * Página pública de destino de CTA — /l/{slug}
 *  APP_FORM     → renderiza o formulário hospedado pelo app (captura + lead)
 *  WHATSAPP     → redireciona para wa.me com a mensagem introdutória
 *  EXTERNAL_URL → redireciona para a página do cliente
 */
export default async function CtaDestinationPage({
  params,
}: {
  params: { slug: string }
}) {
  const dest = await getDestinationBySlug(params.slug)

  if (!dest) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Página não encontrada</h1>
          <p className="mt-2 text-slate-500">Este link de destino não existe ou foi desativado.</p>
        </div>
      </div>
    )
  }

  if (dest.type === 'WHATSAPP') {
    const phone = (dest.config?.phoneNumber || '').replace(/\D/g, '')
    const msg = encodeURIComponent(dest.config?.introMessage || 'Olá! Vi o anúncio e quero saber mais.')
    redirect(`https://wa.me/${phone}?text=${msg}`)
  }

  if (dest.type === 'EXTERNAL_URL') {
    const url = dest.config?.url
    if (url) redirect(url)
  }

  // APP_FORM
  return (
    <CtaFormClient
      slug={dest.slug}
      name={dest.name}
      config={dest.config}
      ctaType={dest.cta_type}
    />
  )
}
