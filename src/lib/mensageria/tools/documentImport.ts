/**
 * Import de PDF/DOCX pra Base de Conhecimento (M4.3 — RAG, extensão da Fase 3).
 * Extrai texto/estrutura do arquivo e devolve markdown pronto pra entrar no MESMO pipeline de
 * chunking já usado pra documentos digitados à mão (chunkMarkdown/regenerateChunks em
 * knowledgeBase.ts) — nenhuma lógica de chunking/embedding duplicada aqui.
 */

export type ImportSourceType = 'pdf_import' | 'docx_import'

export interface ExtractedDocument {
  markdown: string
  sourceType: ImportSourceType
}

/** Extrai o texto de um PDF ou DOCX (decidido pela extensão do nome do arquivo) como markdown. */
export async function extractMarkdownFromFile(buffer: Buffer, filename: string): Promise<ExtractedDocument> {
  const ext = filename.toLowerCase().split('.').pop()

  if (ext === 'pdf') {
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    // pdf-parse insere um separador "-- N of M --" entre páginas — ruído pro chunking, não faz
    // sentido de negócio nenhum aparecer como texto do documento. Removido antes de prosseguir.
    const cleaned = result.text.replace(/\n*--\s*\d+\s*of\s*\d+\s*--\n*/gi, '\n\n').trim()
    // PDF não expõe estrutura de heading confiável (sem análise de fonte/layout, fora de escopo
    // aqui) — o texto bruto entra direto no chunkMarkdown, que já degrada graciosamente pra
    // chunking por parágrafo quando não encontra nenhum "#" (mesmo código, sem branch especial).
    return { markdown: cleaned, sourceType: 'pdf_import' }
  }

  if (ext === 'docx') {
    const mammoth = (await import('mammoth')).default
    const { value: html } = await mammoth.convertToHtml({ buffer })
    return { markdown: htmlToMarkdown(html), sourceType: 'docx_import' }
  }

  throw new Error('Formato de arquivo não suportado. Envie um PDF ou DOCX.')
}

/**
 * Conversão HTML→Markdown via regex — segura aqui porque a entrada NUNCA é HTML arbitrário, é
 * sempre a saída already-flat e previsível do mammoth (só p/h1-h6/ul/li/strong/em/br, sem
 * atributos complexos). Preserva a hierarquia de heading real do Word (Heading 1/2/3...), que é
 * exatamente o sinal que o chunkMarkdown usa pra montar o heading_path contextual.
 */
function htmlToMarkdown(html: string): string {
  // [\s\S] no lugar de "." com a flag /s (dotAll) — projeto tem target es5, /s exige es2018+.
  let md = html
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n')
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n')
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n')
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '#### $1\n\n')
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '##### $1\n\n')
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '###### $1\n\n')
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
  md = md.replace(/<\/?(ul|ol)[^>]*>/gi, '\n')
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
  md = md.replace(/<br\s*\/?>/gi, '\n')
  md = md.replace(/<[^>]+>/g, '') // qualquer tag remanescente (img, table, etc.) — descartada, não convertida
  md = decodeHtmlEntities(md)
  md = md.replace(/\n{3,}/g, '\n\n').trim()
  return md
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}
