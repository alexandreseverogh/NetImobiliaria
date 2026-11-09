import { describe, it, expect, vi, beforeEach } from 'vitest'

const queryMock = vi.fn()
const postMock = vi.fn()

vi.mock('@/lib/database/connection', () => ({ default: { query: (...a: any[]) => queryMock(...a) } }))
vi.mock('axios', () => ({ default: { post: (...a: any[]) => postMock(...a) } }))

import { sendWhatsAppCloudMessage } from '@/lib/mensageria/channels/whatsappCloudSend'

const cfg = { phone_number_id: '123', access_token: 'tok' }

describe('sendWhatsAppCloudMessage — guarda da janela de 24h', () => {
  beforeEach(() => {
    queryMock.mockReset()
    postMock.mockReset()
  })

  it('recusa sem chamar a Meta quando o cliente não respondeu nas últimas 24h', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ last_in: new Date(Date.now() - 25 * 3600 * 1000) }] })
    const res = await sendWhatsAppCloudMessage(cfg, '5581999999999', 'oi', 'conv-1')
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/Janela de 24h encerrada/)
    expect(postMock).not.toHaveBeenCalled()
  })

  it('recusa sem chamar a Meta quando não há histórico de mensagem do cliente', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ last_in: null }] })
    const res = await sendWhatsAppCloudMessage(cfg, '5581999999999', 'oi', 'conv-2')
    expect(res.ok).toBe(false)
    expect(postMock).not.toHaveBeenCalled()
  })

  it('recusa sem conversationId, sem consultar banco nem chamar a Meta', async () => {
    const res = await sendWhatsAppCloudMessage(cfg, '5581999999999', 'oi', null)
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/conversa não identificada/)
    expect(queryMock).not.toHaveBeenCalled()
    expect(postMock).not.toHaveBeenCalled()
  })

  it('envia quando a janela está aberta (última msg do cliente há 1h)', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ last_in: new Date(Date.now() - 3600 * 1000) }] })
    queryMock.mockResolvedValue({ rows: [] }) // contador de uso mensal
    postMock.mockResolvedValueOnce({ data: { messages: [{ id: 'wamid.X' }] } })
    const res = await sendWhatsAppCloudMessage(cfg, '5581999999999', 'oi', 'conv-3')
    expect(res).toEqual({ ok: true, externalId: 'wamid.X' })
    expect(postMock).toHaveBeenCalledTimes(1)
    expect(postMock.mock.calls[0][0]).toContain('/123/messages')
  })
})
