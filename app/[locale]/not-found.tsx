import { NotFoundRoom } from '@/app/_components/NotFoundRoom'
import { UNKNOWN_HOST } from '@/lib/publicHost'

/**
 * THE 404 ROOM IN THE PAGE'S LANGUAGE (MOTIR-7955 · MOTIR-10643).
 *
 * The build writes it once per locale (`src/pages/[...locale]/404.astro`), and
 * Workers static assets answer an unknown path with the nearest one and a 404
 * status (`not_found_handling: "404-page"` in `wrangler.jsonc`): `de/404.html`
 * for a mistyped `/de/…`, `404.html` for the rest. The layout around it wears
 * that locale's `<html lang>`, and the room's `useCopy()` reads that locale's
 * catalogue.
 *
 * {@link UNKNOWN_HOST} because a built page cannot know which host serves it,
 * so the room spells the site's paths absolutely.
 */
export default function LocaleNotFound() {
  return <NotFoundRoom host={UNKNOWN_HOST} />
}
