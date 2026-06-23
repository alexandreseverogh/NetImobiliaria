import pool from '@/lib/database/connection'
import OpenAI from 'openai'

// ─── LLM config (global Settings) ────────────────────────────────────────────

interface LlmCfg { provider: string; model: string; apiKey: string; baseUrl?: string }

async function getGlobalLlmConfig(): Promise<LlmCfg> {
  try {
    const s = await pool.query(
      `SELECT "llmProvider", "llmModel", "llmApiKey"
       FROM campanhasmarketingdigital."Settings"
       WHERE tenant_id IS NULL ORDER BY id LIMIT 1`
    )
    const row = s.rows[0]
    const provider = row?.llmProvider || 'anthropic'
    const model    = row?.llmModel    || 'claude-sonnet-4-6'
    const apiKey   = row?.llmApiKey   || ''
    let baseUrl: string | undefined
    if (provider !== 'anthropic') {
      const m = await pool.query(
        `SELECT base_url FROM campanhasmarketingdigital."LlmModel"
         WHERE provider = $1 AND model_id = $2 AND is_active = true LIMIT 1`,
        [provider, model]
      )
      baseUrl = m.rows[0]?.base_url ?? undefined
    }
    return { provider, model, apiKey, baseUrl }
  } catch {
    return { provider: 'anthropic', model: 'claude-sonnet-4-6', apiKey: '' }
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ImageGenConfig {
  provider: string
  model: string
  apiKey: string
}

export type ImageFormat = 'feed' | 'story' | 'banner'

export interface GenerateImageResult {
  buffer: Buffer
  mimeType: string
  width: number
  height: number
  provider: string
  model: string
  durationMs: number
}

// ─── Format → dimensions ─────────────────────────────────────────────────────

const DIMENSIONS: Record<ImageFormat, { width: number; height: number }> = {
  feed:   { width: 1024, height: 1024 },  // 1:1
  story:  { width: 768,  height: 1344 },  // ~9:16
  banner: { width: 1344, height: 768  },  // ~16:9
}

// DALL-E 3 only accepts 3 fixed sizes
const DALLE3_SIZE: Record<ImageFormat, '1024x1024' | '1792x1024' | '1024x1792'> = {
  feed:   '1024x1024',
  story:  '1024x1792',
  banner: '1792x1024',
}

// ─── Config loader ────────────────────────────────────────────────────────────

async function getImageGenConfig(): Promise<ImageGenConfig> {
  try {
    const res = await pool.query(
      `SELECT "imageProvider", "imageModel", "imageApiKey"
       FROM campanhasmarketingdigital."Settings"
       WHERE tenant_id IS NULL
       ORDER BY id LIMIT 1`
    )
    const row = res.rows[0]
    return {
      provider: row?.imageProvider || '',
      model:    row?.imageModel    || '',
      apiKey:   row?.imageApiKey   || '',
    }
  } catch (err) {
    console.error('[aiImageGen] Erro ao ler config:', err)
    return { provider: '', model: '', apiKey: '' }
  }
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Erro ao baixar imagem: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

// ─── Provider: HuggingFace ────────────────────────────────────────────────────

async function generateViaHuggingFace(
  prompt: string,
  format: ImageFormat,
  model: string,
  apiKey: string
): Promise<GenerateImageResult> {
  const t0 = Date.now()
  const { width, height } = DIMENSIONS[format]

  const res = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'x-wait-for-model': 'true',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { width, height, num_inference_steps: 4 },
      }),
    }
  )

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HuggingFace ${res.status}: ${text.slice(0, 200)}`)
  }

  const contentType = res.headers.get('content-type') || 'image/jpeg'
  const buffer = Buffer.from(await res.arrayBuffer())

  return {
    buffer,
    mimeType: contentType.split(';')[0].trim(),
    width,
    height,
    provider: 'huggingface',
    model,
    durationMs: Date.now() - t0,
  }
}

// ─── Provider: Replicate ──────────────────────────────────────────────────────

async function generateViaReplicate(
  prompt: string,
  format: ImageFormat,
  model: string,
  apiKey: string
): Promise<GenerateImageResult> {
  const t0 = Date.now()
  const { width, height } = DIMENSIONS[format]

  // Create prediction
  const createRes = await fetch(
    `https://api.replicate.com/v1/models/${model}/predictions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Prefer: 'wait=60',
      },
      body: JSON.stringify({
        input: { prompt, width, height, output_format: 'jpg', output_quality: 90 },
      }),
    }
  )

  if (!createRes.ok) {
    const text = await createRes.text().catch(() => '')
    throw new Error(`Replicate create ${createRes.status}: ${text.slice(0, 200)}`)
  }

  let prediction = await createRes.json()

  // Poll until succeeded (max 120s)
  const deadline = Date.now() + 120_000
  while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
    if (Date.now() > deadline) throw new Error('Replicate timeout após 120s')
    await new Promise(r => setTimeout(r, 2500))
    const pollRes = await fetch(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    )
    prediction = await pollRes.json()
  }

  if (prediction.status === 'failed') {
    throw new Error(`Replicate falhou: ${prediction.error || 'sem detalhe'}`)
  }

  const imageUrl = Array.isArray(prediction.output)
    ? prediction.output[0]
    : prediction.output

  const buffer = await fetchBuffer(imageUrl)

  return {
    buffer,
    mimeType: 'image/jpeg',
    width,
    height,
    provider: 'replicate',
    model,
    durationMs: Date.now() - t0,
  }
}

// ─── Provider: OpenAI DALL-E 3 ────────────────────────────────────────────────

async function generateViaOpenAI(
  prompt: string,
  format: ImageFormat,
  model: string,
  apiKey: string
): Promise<GenerateImageResult> {
  const t0 = Date.now()
  const size = DALLE3_SIZE[format]
  const [width, height] = size.split('x').map(Number)

  const openai = new OpenAI({ apiKey })
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size,
    response_format: 'url',
  })

  const imageUrl = response.data?.[0]?.url
  if (!imageUrl) throw new Error('DALL-E 3 não retornou URL')

  const buffer = await fetchBuffer(imageUrl)

  return {
    buffer,
    mimeType: 'image/png',
    width,
    height,
    provider: 'openai',
    model,
    durationMs: Date.now() - t0,
  }
}

// ─── Prompt builder: scene (PT) → English image prompt via LLM ───────────────

const HOOK_VISUAL_HINT: Record<string, string> = {
  urgency:      'urgent dramatic atmosphere, tension, time-pressure',
  curiosity:    'intriguing mysterious composition, question in the air',
  social_proof: 'people smiling, social gathering, testimonial moment',
  benefit:      'aspirational positive outcome, clear transformation',
  story:        'narrative moment, emotional human connection',
  problem:      'before-transformation, relatable everyday challenge',
  price:        'value highlight, clear offer presentation',
  investment:   'prosperity symbols, financial growth, abundance',
  lifestyle:    'luxury aspirational lifestyle, dream scenario',
  family:       'warm family bond, cozy domestic moment',
  luxury:       'premium exclusive elegance, sophisticated details',
  social:       'community, celebration, togetherness',
  other:        'professional clean composition',
}

function fallbackPrompt(scene: string, hookType: string): string {
  const hint = HOOK_VISUAL_HINT[hookType] || HOOK_VISUAL_HINT.other
  return `${scene}. ${hint}. Photorealistic, professional photography, cinematic lighting, 8K resolution, high detail, no text overlays, no watermarks.`
}

export async function buildImagePromptFromConcept(
  scene: string,
  hookType: string,
  angle: string,
  segment: string,
): Promise<string> {
  const cfg = await getGlobalLlmConfig()
  if (!cfg.apiKey) {
    console.warn('[buildImagePrompt] LLM sem API key — usando fallback')
    return fallbackPrompt(scene, hookType)
  }

  try {
    const client = new OpenAI({
      apiKey: cfg.apiKey,
      ...(cfg.baseUrl ? { baseURL: cfg.baseUrl } : {}),
    })

    const resp = await client.chat.completions.create({
      model: cfg.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at writing concise image generation prompts for Flux Schnell. Output ONLY the prompt, no explanation, no quotes.',
        },
        {
          role: 'user',
          content: `Convert this creative concept into an optimized English image generation prompt (max 80 words).

Segment: ${segment}
Scene (Portuguese): ${scene}
Hook type: ${hookType}
Angle: ${angle}

Rules:
- Write in English
- Describe visual elements: subject, environment, lighting, mood, style
- Add quality tags: photorealistic, professional photography, cinematic lighting, 8K
- NO text, logos, typography or watermarks in the image
- Start with the main visual subject

Output only the prompt:`,
        },
      ],
      max_tokens: 120,
      temperature: 0.3,
    })

    const result = resp.choices[0]?.message?.content?.trim()
    return result || fallbackPrompt(scene, hookType)
  } catch (err) {
    console.error('[buildImagePrompt] LLM falhou, usando fallback:', err)
    return fallbackPrompt(scene, hookType)
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateHookImage(
  prompt: string,
  format: ImageFormat = 'feed'
): Promise<GenerateImageResult> {
  const cfg = await getImageGenConfig()

  if (!cfg.provider || !cfg.model) {
    throw new Error('Provider de geração de imagens não configurado em IA da Plataforma.')
  }
  if (!cfg.apiKey) {
    throw new Error(`API Key de imagem não configurada para provider "${cfg.provider}".`)
  }

  console.log(`[aiImageGen] Gerando ${format} via ${cfg.provider}/${cfg.model}`)

  switch (cfg.provider) {
    case 'huggingface':
      return generateViaHuggingFace(prompt, format, cfg.model, cfg.apiKey)
    case 'replicate':
      return generateViaReplicate(prompt, format, cfg.model, cfg.apiKey)
    case 'openai':
      return generateViaOpenAI(prompt, format, cfg.model, cfg.apiKey)
    default:
      throw new Error(`Provider desconhecido: "${cfg.provider}"`)
  }
}
