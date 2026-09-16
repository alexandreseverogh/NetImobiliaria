'use client'

import Image, { ImageProps } from 'next/image'

interface SafeImageProps extends Omit<ImageProps, 'src'> {
  src?: string | null
  fallbackSrc?: string
}

/**
 * Wrapper em torno de next/image para lidar com data URLs/blobs e caminhos locais
 * sem precisar adicionar domínios manualmente. Usa `unoptimized` para blobs,
 * data URIs ou caminhos que não começam com http/https.
 */
export default function SafeImage({
  src,
  alt = 'Imagem',
  fallbackSrc = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
  fill,
  width,
  height,
  ...rest
}: SafeImageProps) {
  const resolvedSrc = src && src.trim() !== '' ? src : fallbackSrc

  const isDataLike =
    resolvedSrc.startsWith('data:') ||
    resolvedSrc.startsWith('blob:') ||
    resolvedSrc.startsWith('file:')

  const isHttp = resolvedSrc.startsWith('http://') || resolvedSrc.startsWith('https://')

  // /api/public/imagens/[id] redireciona (302) pro storage real (MinIO/S3) em vez de
  // reenviar os bytes — o otimizador do Next, pra URLs relativas, chama a rota diretamente
  // em processo (não segue o redirect como um fetch de verdade faria), então recebe uma
  // resposta vazia e quebra ("Input Buffer is empty"). Sem otimizar, o navegador carrega a
  // <img> direto e segue o redirect normalmente.
  const isRedirectBasedImageRoute = resolvedSrc.startsWith('/api/public/imagens/')

  const shouldUnoptimize = isDataLike || isRedirectBasedImageRoute || (!isHttp && !resolvedSrc.startsWith('/'))

  if (fill) {
    return (
      <Image
        src={resolvedSrc}
        alt={alt}
        fill
        unoptimized={shouldUnoptimize}
        {...rest}
      />
    )
  }

  return (
    <Image
      src={resolvedSrc}
      alt={alt}
      width={width ?? 800}
      height={height ?? 450}
      unoptimized={shouldUnoptimize}
      {...rest}
    />
  )
}

