import { chromium } from 'playwright'
import type { Page } from 'playwright'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

interface TestResult {
  name: string
  success: boolean
  details?: string
}

function assertCondition(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

async function openPublicRegister(page: Page, userType: 'cliente' | 'proprietario') {
  await page.goto(`${BASE_URL}/landpaging`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Cadastre-se' }).click()
  await page.getByRole('button', { name: userType === 'cliente' ? 'Cliente' : 'Proprietário' }).click()
  await page.waitForSelector('form [name="nome"]', { timeout: 5000 })
}

async function testCpfTabBlocking(page: Page): Promise<TestResult> {
  try {
    await openPublicRegister(page, 'cliente')
    await page.fill('input[name="nome"]', 'Teste Automatizado')
    await page.fill('input[name="cpf"]', '12345678900')
    await page.keyboard.press('Tab')
    const activeField = await page.evaluate(() => document.activeElement?.getAttribute('name'))
    assertCondition(activeField === 'cpf', 'TAB deveria manter o foco no campo CPF inválido')
    const errorVisible = await page.isVisible('text=CPF inválido')
    assertCondition(errorVisible, 'Mensagem "CPF inválido" não ficou visível após preencher CPF inválido')
    return { name: 'Tab bloqueado em CPF inválido (público)', success: true }
  } catch (error: any) {
    return { name: 'Tab bloqueado em CPF inválido (público)', success: false, details: error?.message }
  }
}

const EXISTING_CLIENT_EMAIL =
  process.env.TEST_EXISTING_CLIENTE_EMAIL ?? ''

if (!EXISTING_CLIENT_EMAIL) {
  throw new Error('Defina a variável de ambiente TEST_EXISTING_CLIENTE_EMAIL com um e-mail de cliente já cadastrado.')
}

async function testEmailDuplicateBlocking(page: Page): Promise<TestResult> {
  try {
    await openPublicRegister(page, 'cliente')
    await page.fill('input[name="nome"]', 'Teste Automatizado')
    await page.fill('input[name="cpf"]', '39053344705') // CPF válido para passar validação de formato
    await page.fill('input[name="email"]', EXISTING_CLIENT_EMAIL)
    await page.keyboard.press('Tab')
    const activeField = await page.evaluate(() => document.activeElement?.getAttribute('name'))
    assertCondition(activeField === 'email', 'TAB deveria permanecer no campo Email duplicado')
    await page.waitForSelector('text=Email já cadastrado', { timeout: 5000 })
    const warningVisible = await page.isVisible('text=Email já cadastrado')
    assertCondition(warningVisible, 'Mensagem "Email já cadastrado" não apareceu para e-mail duplicado')
    return { name: 'Tab bloqueado em Email duplicado (público)', success: true }
  } catch (error: any) {
    return { name: 'Tab bloqueado em Email duplicado (público)', success: false, details: error?.message }
  }
}

async function testPublicCheckEmailEndpoint(): Promise<TestResult> {
  try {
    const response = await fetch(`${BASE_URL}/api/public/check-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EXISTING_CLIENT_EMAIL, userType: 'cliente' })
    })
    assertCondition(response.ok, `Endpoint respondeu ${response.status}`)
    const data = await response.json()
    assertCondition(data.exists === true, 'Era esperado que o e-mail informado já existisse')
    return { name: 'API /api/public/check-email (duplicado)', success: true }
  } catch (error: any) {
    return { name: 'API /api/public/check-email (duplicado)', success: false, details: error?.message }
  }
}

async function run() {
  const results: TestResult[] = []
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    results.push(await testCpfTabBlocking(page))
    results.push(await testEmailDuplicateBlocking(page))
  } finally {
    await browser.close()
  }

  results.push(await testPublicCheckEmailEndpoint())

  let failures = 0
  for (const result of results) {
    if (result.success) {
      console.log(`✔ ${result.name}`)
    } else {
      failures++
      console.error(`✖ ${result.name} -> ${result.details ?? 'falha desconhecida'}`)
    }
  }

  if (failures > 0) {
    throw new Error(`${failures} cenário(s) falharam.`)
  }
}

run().catch((error) => {
  console.error('❌ Testes de validação de cadastro falharam:', error)
  process.exit(1)
})


