// @vitest-environment node
import type { ReactElement, ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { BRAND_ACCENT_HEX, BRAND_GLYPH_HEX } from '@motir/brand'
import {
  OG_TEXT_HEX,
  OG_TEXT_SECONDARY_HEX,
  OG_WASH,
} from '@/app/_brand/ogColours'
import type { PublicProjectOverviewDto } from '@/lib/publicProject'
import {
  projectCardElement,
  projectCardText,
} from '@/worker/share/drawProjectCard'

/*
 * ⚠️ THE PER-PROJECT HALF ONLY since MOTIR-10647: the landing card is drawn at
 * build and its colours are asserted in `tests/brand/localeCardColours.test.ts`.
 *
 * MOTIR-6480 — motir.co's two link-preview cards wear the monochrome Motir
 * palette (motir-core `design/brand/design-notes.md` §10, "§6 amended — OG
 * template", MOTIR-6473).
 *
 * Re-included by MOTIR-10758: the card is drawn by the Worker since MOTIR-10757
 * (`worker/share/drawProjectCard.tsx`), so the tree it hands satori is read
 * directly — no `next/og` to mock. A PNG cannot be asked which colour a
 * headline is; the element tree can.
 */

const PROJECT = {
  name: 'Acme roadmap',
  publicTagline: 'What Acme is building next.',
  workspaceName: 'Acme',
} as PublicProjectOverviewDto

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

describe.each([
  ['a project that read', PROJECT],
  ['the key-only fallback', null],
] as const)('the per-project card, %s', (_name, project) => {
  const tree = () =>
    paints(projectCardElement(projectCardText('ACME', project)))

  it('paints the glyph in BRAND_GLYPH_HEX, never the ink tile colour', () => {
    // The glyph sits on the wash, not in a tile, so it takes the
    // glyph-on-a-surface role. Under Motir that is blue; the tile's
    // BRAND_ACCENT_HEX is near-black and would read as a different mark.
    const { fill } = tree()
    expect(fill).toEqual([BRAND_GLYPH_HEX])
    expect(fill).not.toContain(BRAND_ACCENT_HEX)
  })

  it('sits every ink on the design table’s wash', () => {
    const { background, color } = tree()
    expect(background).toEqual([OG_WASH])
    expect(new Set(color)).toEqual(
      new Set([OG_TEXT_HEX, OG_TEXT_SECONDARY_HEX]),
    )
  })
})
