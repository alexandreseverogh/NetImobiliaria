'use client';

/**
 * GoogleTags — Google Tag Manager + Google Analytics 4, com Google Consent Mode v2 (LGPD).
 * F0 do plano de SEO/GEO (docs/PLANO_SEO_GEO_ARTEMIS4.md §6) — mesmo padrão de injeção já
 * usado em MetaPixel.tsx (next/script, falha silenciosa sem ID).
 *
 * Uso (Server Component pai passa os IDs via env var):
 *   <GoogleTags gtmId={process.env.NEXT_PUBLIC_GTM_ID} ga4Id={process.env.NEXT_PUBLIC_GA4_ID} />
 *
 * Sem NENHUM dos dois IDs configurado → renderiza null, zero script carregado.
 *
 * Consent Mode v2 — por que vem ANTES de qualquer outra chamada gtag/GTM: a própria
 * documentação do Google exige que o estado padrão de consentimento seja declarado antes do
 * snippet de config/init rodar, senão as tags já disparam achando que têm consentimento pleno.
 * Aqui o padrão nasce NEGADO para `ad_storage`/`ad_user_data`/`ad_personalization` (publicidade)
 * e `analytics_storage` (medição) — a plataforma de consentimento real (se/quando existir um
 * banner de cookies nesta landing) deve chamar `gtag('consent', 'update', {...})` depois, pra
 * liberar o que o visitante de fato aceitar. Sem banner ainda, o padrão seguro é negado — os
 * eventos continuam sendo registrados pelo Google em modo agregado/cego (comportamento nativo
 * do Consent Mode v2), nunca vinculados a um visitante identificável sem consentimento real.
 */

import Script from 'next/script';

interface Props {
  gtmId?: string;
  ga4Id?: string;
}

export function GoogleTags({ gtmId, ga4Id }: Props) {
  if (!gtmId && !ga4Id) return null;

  return (
    <>
      {/* Consent Mode v2 — precisa rodar ANTES do gtag.js/GTM carregarem de fato. Usa a
          mesma estratégia 'afterInteractive' dos scripts abaixo (não 'beforeInteractive' —
          essa só é suportada de forma garantida no layout RAIZ do app, e este componente
          vive num layout aninhado, `src/app/artemis4/layout.tsx`); scripts com a mesma
          estratégia executam na ordem em que aparecem no JSX, então declarar este primeiro
          já garante a ordem certa sem precisar de 'beforeInteractive'. */}
      <Script id="google-consent-default" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){ window.dataLayer.push(arguments); }
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied',
          });
        `}
      </Script>

      {gtmId && (
        <>
          <Script id="gtm-script" strategy="afterInteractive">
            {`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${gtmId}');
            `}
          </Script>
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
              title="Google Tag Manager"
            />
          </noscript>
        </>
      )}

      {ga4Id && (
        <>
          <Script
            id="ga4-gtag-js"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
          />
          <Script id="ga4-config" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){ window.dataLayer.push(arguments); }
              gtag('js', new Date());
              gtag('config', '${ga4Id}');
            `}
          </Script>
        </>
      )}
    </>
  );
}
