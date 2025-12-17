declare function describe(name: string, fn: () => void | Promise<void>): void
declare function test(name: string, fn: () => void | Promise<void>): void

interface BasicMatcher {
  toBe(expected: unknown): void
  toEqual(expected: unknown): void
  toBeDefined(): void
  toBeGreaterThan(expected: number): void
}

declare function expect(actual: unknown): BasicMatcher
