'use client';

/**
 * MetaPixel — injeção do Meta Pixel (Facebook Pixel) nas páginas públicas.
 *
 * Uso (Server Component pai busca o pixelId e passa como prop):
 *   <MetaPixel pixelId="1234567890" />
 *
 * - Injeta o script fbevents.js uma única vez (via next/script afterInteractive)
 * - Dispara fbq('track', 'PageView') a cada mudança de rota (SPA navigation)
 * - Sem pixelId → renderiza null silenciosamente (sem erro)
 */

import Script from 'next/script';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface Props {
  pixelId: string;
}

export function MetaPixel({ pixelId }: Props) {
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  /* Dispara PageView a cada navegação SPA */
  useEffect(() => {
    if (!pixelId) return;
    if (typeof window === 'undefined') return;
    const fbq = (window as any).fbq;
    if (typeof fbq === 'function') {
      fbq('track', 'PageView');
    }
  }, [pathname, searchParams, pixelId]);

  if (!pixelId) return null;

  return (
    <>
      {/* Script principal do Meta Pixel */}
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window,document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
          `,
        }}
      />
      {/* Fallback noscript */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
