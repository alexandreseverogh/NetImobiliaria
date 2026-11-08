import { describe, it, expect } from 'vitest'
import { classifyCpl } from '@/lib/rules/statusClassifier'

// Teste de caracterização: fixa o comportamento atual de computeStatus do portfólio
// (warnFactor 1.0, critical por >=), antes de qualquer migração de consumidor.
const bench = { cplIdeal: 35, cplCritical: 80 }

describe('classifyCpl — caracterização do portfólio (warnFactor = 1)', () => {
  it('spend zero é nodata mesmo com cpl', () => {
    expect(classifyCpl(10, bench, 1, 0)).toBe('nodata')
  })

  it('cpl null é nodata', () => {
    expect(classifyCpl(null, bench, 1, 100)).toBe('nodata')
  })

  it('cpl NaN/Infinity é nodata', () => {
    expect(classifyCpl(NaN, bench, 1)).toBe('nodata')
    expect(classifyCpl(Infinity, bench, 1)).toBe('nodata')
  })

  it('cpl igual ao crítico é critical (operador >=)', () => {
    expect(classifyCpl(80, bench, 1)).toBe('critical')
    expect(classifyCpl(80.01, bench, 1)).toBe('critical')
  })

  it('cpl acima do ideal e abaixo do crítico é warn', () => {
    expect(classifyCpl(35.01, bench, 1)).toBe('warn')
    expect(classifyCpl(79.99, bench, 1)).toBe('warn')
  })

  it('cpl igual ao ideal é ok', () => {
    expect(classifyCpl(35, bench, 1)).toBe('ok')
  })

  it('zero é valor de CPL válido (ok, não nodata)', () => {
    expect(classifyCpl(0, bench, 1, 50)).toBe('ok')
  })

  it('sem benchmark de crítico, nunca é critical', () => {
    expect(classifyCpl(999, { cplIdeal: 35, cplCritical: null }, 1)).toBe('warn')
  })

  it('sem benchmark de ideal nem crítico, é ok', () => {
    expect(classifyCpl(999, { cplIdeal: null, cplCritical: null }, 1)).toBe('ok')
  })
})

describe('classifyCpl — fator de alerta é parâmetro explícito', () => {
  it('com warnFactor 1.15 (previsto no plano), warn só acima de ideal × 1.15', () => {
    expect(classifyCpl(40, bench, 1.15)).toBe('ok')      // 40 <= 35 × 1.15 = 40.25
    expect(classifyCpl(40.5, bench, 1.15)).toBe('warn')  // 40.5 > 40.25
  })
})
