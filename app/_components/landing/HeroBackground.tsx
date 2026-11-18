'use client'

import { Background } from '@motir/design-system'

/*
 * The background behind a motir.co hero: the package's Wave (MOTIR-11610).
 *
 * The wave lines from the Motir mark used to be drawn here, by a hand-kept copy
 * of the drawing. They now come from `@motir/design-system`'s background
 * registry, the same drawing motir-core's sign-in frame and every starter use,
 * so the lines follow the visit's style as well as its palette and theme.
 *
 * The motir.co heroes keep the Wave whatever a visitor picks on `/design`:
 * that picker restyles its own page's hero only (MOTIR-11603).
 *
 * `focusId` names the element the lines gather around, the idea box by
 * default. The package measures its box from the nearest ancestor that has
 * one, so the `<motir-island style="display:contents">` wrapper a built page
 * puts around the canvas is skipped (`boxParent`).
 */
export function HeroBackground({
  focusId = 'hero-brief',
}: Readonly<{ focusId?: string }>) {
  return <Background id="wave" focusId={focusId} />
}
