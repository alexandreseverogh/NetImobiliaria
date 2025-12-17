/**
 * Serviço de Tradução para Feeds Internacionais
 * Traduz conteúdo de feeds internacionais para português brasileiro
 */

interface TranslationResult {
  translatedText: string;
  sourceLanguage?: string;
}

/**
 * Traduz texto para português brasileiro usando Google Translate API
 * Alternativa gratuita: LibreTranslate (self-hosted)
 * 
 * @param text Texto a ser traduzido
 * @param sourceLanguage Idioma de origem (auto-detect se não especificado)
 * @returns Texto traduzido para português
 */
export async function translateToPortuguese(
  text: string,
  sourceLanguage: string = 'auto'
): Promise<string> {
  // Se o texto já está em português ou está vazio, retorna sem traduzir
  if (!text || text.trim().length === 0) {
    return text;
  }

  // Verificar se já está em português (heurística simples)
  const portugueseIndicators = [
    'imóvel', 'imóveis', 'casa', 'apartamento', 'propriedade',
    'aluguel', 'venda', 'compra', 'mercado imobiliário',
    'construção', 'investimento', 'financiamento'
  ];
  
  const lowerText = text.toLowerCase();
  const isLikelyPortuguese = portugueseIndicators.some(indicator => 
    lowerText.includes(indicator)
  );

  if (isLikelyPortuguese) {
    console.log('🔍 [Translation] Texto já parece estar em português, pulando tradução');
    return text;
  }

  try {
    // Opção 1: LibreTranslate (gratuito, open-source - PRIORIDADE)
    // Usa instância pública gratuita se não houver URL configurada
    const libreTranslateUrl = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com';
    try {
      return await translateWithLibreTranslate(text, sourceLanguage, libreTranslateUrl);
    } catch (libreError) {
      console.log('⚠️ [Translation] LibreTranslate falhou, tentando MyMemory...');
    }

    // Opção 2: MyMemory Translation API (gratuita, com limites)
    return await translateWithMyMemory(text, sourceLanguage);

    // Opção 3: Google Translate API (apenas se configurada - paga após limite)
    // if (process.env.GOOGLE_TRANSLATE_API_KEY) {
    //   return await translateWithGoogle(text, sourceLanguage);
    // }

  } catch (error) {
    console.error('❌ [Translation] Erro ao traduzir:', error);
    // Em caso de erro, retorna o texto original
    return text;
  }
}

/**
 * Traduz usando Google Translate API
 */
async function translateWithGoogle(
  text: string,
  sourceLanguage: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: text,
      source: sourceLanguage === 'auto' ? undefined : sourceLanguage,
      target: 'pt-BR',
      format: 'text',
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Translate API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data.translations[0].translatedText;
}

/**
 * Traduz usando LibreTranslate (open-source, gratuito)
 * Usa instância pública gratuita: https://libretranslate.com
 */
async function translateWithLibreTranslate(
  text: string,
  sourceLanguage: string,
  libreTranslateUrl: string = 'https://libretranslate.com'
): Promise<string> {
  // Limitar tamanho do texto (LibreTranslate público tem limite)
  const textToTranslate = text.substring(0, 5000);
  
  // Mapear idiomas para códigos do LibreTranslate
  const languageMap: Record<string, string> = {
    'auto': 'auto',
    'en': 'en',
    'es': 'es',
    'fr': 'fr',
    'de': 'de',
    'it': 'it',
    'pt': 'pt',
    'ru': 'ru',
    'ja': 'ja',
    'zh': 'zh',
    'ko': 'ko'
  };

  const sourceLang = languageMap[sourceLanguage] || (sourceLanguage === 'auto' ? 'auto' : 'en');
  
  const response = await fetch(`${libreTranslateUrl}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: textToTranslate,
      source: sourceLang,
      target: 'pt',
      format: 'text',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LibreTranslate API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.translatedText) {
    throw new Error('LibreTranslate retornou resposta vazia');
  }

  return data.translatedText;
}

/**
 * Traduz usando MyMemory Translation API (100% gratuita)
 * Limite: 10.000 palavras/dia
 * Sem necessidade de API key
 */
async function translateWithMyMemory(
  text: string,
  sourceLanguage: string
): Promise<string> {
  // Limitar tamanho do texto para API gratuita (5000 caracteres)
  const textToTranslate = text.substring(0, 5000);
  
  // MyMemory aceita 'auto' para detecção automática
  const sourceLang = sourceLanguage === 'auto' ? 'auto' : sourceLanguage;
  
  // Usar endpoint que suporta detecção automática
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=${sourceLang === 'auto' ? 'en' : sourceLang}|pt-BR`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'NetImobiliaria-Feed/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`MyMemory API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.responseStatus !== 200) {
      // Se atingiu limite diário, retorna texto original
      if (data.responseStatus === 429) {
        console.warn('⚠️ [Translation] MyMemory: Limite diário atingido, retornando texto original');
        return text;
      }
      throw new Error(`MyMemory API error: ${data.responseStatus}`);
    }

    return data.responseData.translatedText;
  } catch (error) {
    console.error('❌ [Translation] Erro no MyMemory:', error);
    // Em caso de erro, retorna texto original
    return text;
  }
}

/**
 * Detecta o idioma do texto
 */
export async function detectLanguage(text: string): Promise<string> {
  if (!text || text.trim().length === 0) {
    return 'pt';
  }

  // Heurística simples baseada em palavras-chave
  const portugueseWords = ['imóvel', 'casa', 'apartamento', 'propriedade', 'aluguel', 'venda'];
  const englishWords = ['real estate', 'property', 'house', 'apartment', 'rent', 'sale'];
  const spanishWords = ['inmueble', 'casa', 'apartamento', 'propiedad', 'alquiler', 'venta'];

  const lowerText = text.toLowerCase();

  if (portugueseWords.some(word => lowerText.includes(word))) {
    return 'pt';
  }
  if (englishWords.some(word => lowerText.includes(word))) {
    return 'en';
  }
  if (spanishWords.some(word => lowerText.includes(word))) {
    return 'es';
  }

  // Default para inglês (mais comum em feeds internacionais)
  return 'en';
}

