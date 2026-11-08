import { defineConfig } from 'vitest/config'
import path from 'path'

// Testes unitários de regras de negócio (funções puras e serviços sem banco).
// Testes de integração contra Postgres ficam em scripts próprios (ver docs/PLANO_REGRAS_CONFIGURAVEIS.md, §6.2).
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
