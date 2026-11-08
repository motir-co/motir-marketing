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

// jsdom has no `matchMedia`, and the header now mounts the 3D / Immersive
// pointer tilt, which asks it for `prefers-reduced-motion` (MOTIR-10643). A
// browser with no preference set answers `matches: false` to every query, so
// that is the default here; a test that needs a preference stubs its own.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (media: string): MediaQueryList => ({
      media,
      matches: false,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
