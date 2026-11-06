import { describe, it, expect } from 'vitest'
import { resolveRoundRobinSla } from '@/lib/routing/strategies/roundRobinStrategy'

// Reprodução do bug: o engine passa slaExterno/slaInterno (vindos de parametros_imoveis),
// mas o round-robin lia `slaMinutos`, que nunca chegava. Resultado: SLA configurado ignorado.
describe('resolveRoundRobinSla — usa o SLA configurado do tenant', () => {
  it('corretor interno usa sla_minutos_aceite_lead_interno', () => {
    expect(resolveRoundRobinSla({ tipoCorretor: 'Interno', config: { slaExterno: 5, slaInterno: 30 } })).toBe(30)
  })

  it('corretor externo usa sla_minutos_aceite_lead (externo), como a estratégia geográfica', () => {
    expect(resolveRoundRobinSla({ tipoCorretor: 'Externo', config: { slaExterno: 7, slaInterno: 30 } })).toBe(7)
  })

  it('preserva zero configurado (não vira padrão)', () => {
    expect(resolveRoundRobinSla({ tipoCorretor: 'Externo', config: { slaExterno: 0, slaInterno: 30 } })).toBe(0)
    expect(resolveRoundRobinSla({ tipoCorretor: 'Interno', config: { slaExterno: 5, slaInterno: 0 } })).toBe(0)
  })

  it('config explícita slaMinutos da própria estratégia prevalece', () => {
    expect(resolveRoundRobinSla({ tipoCorretor: 'Interno', config: { slaMinutos: 10, slaInterno: 30 } })).toBe(10)
  })

  it('sem nenhuma configuração usa os padrões históricos (fallback documentado)', () => {
    expect(resolveRoundRobinSla({ tipoCorretor: 'Interno', config: {} })).toBe(15)
    expect(resolveRoundRobinSla({ tipoCorretor: 'Externo', config: {} })).toBe(5)
  })
})
