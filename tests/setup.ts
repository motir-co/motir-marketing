import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

// The docs artifacts are read once per process (`lib/docs.ts`, under this
// registered symbol); each test stubs `fetch` with its own documents, so each
// starts with nothing read. Cleared through the symbol rather than an import, so
// a test file's own `vi.mock` still applies when it first loads `lib/docs.ts`.
afterEach(() => {
  const reads = (globalThis as Record<symbol, unknown>)[
    Symbol.for('motir.docsArtifactReads')
  ]
  if (reads instanceof Map) reads.clear()
})
