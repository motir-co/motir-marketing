// @vitest-environment node
import type { ReactElement, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BRAND_ACCENT_HEX, BRAND_GLYPH_HEX } from '@motir/brand'
import {
  OG_TEXT_HEX,
  OG_TEXT_SECONDARY_HEX,
  OG_WASH,
} from '@/app/_brand/ogColours'

/*
 * ⚠️ THE PER-PROJECT HALF ONLY since MOTIR-10647: the landing card is drawn at
 * build and its colours are asserted in `tests/brand/localeCardColours.test.ts`.
 * This half waits, held, for the Worker-routes story (MOTIR-10635).
 *
 * MOTIR-6480 — motir.co's two link-preview cards wear the monochrome Motir
 * palette (motir-core `design/brand/design-notes.md` §10, "§6 amended — OG
 * template", MOTIR-6473).
 *
 * ⚠️ WHY `next/og` IS MOCKED. `tests/ogFonts.test.ts` already renders the root
 * card to a real PNG, and a PNG cannot be asked which colour a headline is. So
 * this file captures the element tree each route hands to `ImageResponse` and
 * reads the colours off it. That is the unit render: it runs each route's own
 * component, with its own data read, and asserts what it paints.
 */

const captured: ReactElement[] = []
vi.mock('next/og', () => ({
  ImageResponse: class {
    constructor(element: ReactElement) {
      captured.push(element)
    }
    // The per-project card draws through `app/_brand/ogRenderGate.ts`, which
    // reads the body to bytes.
    status = 200
    headers = new Headers()
    async arrayBuffer() {
      return new ArrayBuffer(0)
    }
  },
}))

vi.mock('@/lib/publicProject', () => ({
  loadProject: vi.fn(async () => ({
    status: 'ok',
    data: {
      name: 'Acme roadmap',
      publicTagline: 'What Acme is building next.',
      workspaceName: 'Acme',
    },
  })),
}))

type Paint = { background: string[]; color: string[]; fill: string[] }

/** Every background, text colour and SVG fill in a rendered element tree. */
function paints(
  node: ReactNode,
  out: Paint = { background: [], color: [], fill: [] },
): Paint {
  if (node === null || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    for (const child of node) paints(child, out)
    return out
  }
  const props = (node as ReactElement<Record<string, unknown>>).props ?? {}
  const style = (props.style ?? {}) as Record<string, string>
  if (style.background) out.background.push(style.background)
  if (style.color) out.color.push(style.color)
  if (typeof props.fill === 'string') out.fill.push(props.fill)
  paints(props.children as ReactNode, out)
  return out
}

// The per-project card keeps what it draws (`app/_brand/ogRenderGate.ts`), so a
// second render in the same module graph would be served without a draw.
beforeEach(() => {
  vi.resetModules()
})

async function renderRoute(
  load: () => Promise<{ default: (a: never) => unknown }>,
  arg?: unknown,
) {
  captured.length = 0
  const { default: route } = await load()
  await route(arg as never)
  expect(captured).toHaveLength(1)
  return paints(captured[0])
}

describe.each([
  [
    'the per-project card',
    () => import('@/app/[locale]/p/[identifier]/opengraph-image'),
    { params: Promise.resolve({ identifier: 'ACME' }) },
  ],
] as const)('%s', (_name, load, arg) => {
  it('paints the glyph in BRAND_GLYPH_HEX, never the ink tile colour', async () => {
    // The glyph sits on the wash, not in a tile, so it takes the
    // glyph-on-a-surface role. Under Motir that is blue; the tile's
    // BRAND_ACCENT_HEX is near-black and would read as a different mark.
    const { fill } = await renderRoute(load, arg)
    expect(fill).toEqual([BRAND_GLYPH_HEX])
    expect(fill).not.toContain(BRAND_ACCENT_HEX)
  })

  it('sits every ink on the design table’s wash', async () => {
    const { background, color } = await renderRoute(load, arg)
    expect(background).toEqual([OG_WASH])
    expect(new Set(color)).toEqual(
      new Set([OG_TEXT_HEX, OG_TEXT_SECONDARY_HEX]),
    )
  })
})
