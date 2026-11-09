// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

/*
 * THE ENGINES' FIRST START (MOTIR-10757): a failed instantiation is not kept,
 * so the next draw tries again rather than failing for the isolate's life.
 */

const resvg = vi.hoisted(() => ({ fail: true, calls: 0 }))

vi.mock('@resvg/resvg-wasm', async (actual) => {
  const real = await actual<typeof import('@resvg/resvg-wasm')>()
  return {
    ...real,
    initWasm: async (module: WebAssembly.Module) => {
      resvg.calls += 1
      if (resvg.fail) throw new Error('instantiate failed')
      return real.initWasm(module)
    },
  }
})

describe('shareEngine', () => {
  it('drops a failed start, starts on the next call, then keeps it', async () => {
    const { shareEngine } = await import('@/worker/share/engine')
    await expect(shareEngine()).rejects.toThrow('instantiate failed')
    resvg.fail = false
    const engine = await shareEngine()
    expect(typeof engine.satori).toBe('function')
    expect(await shareEngine()).toBe(engine)
    expect(resvg.calls).toBe(2)
  })
})
