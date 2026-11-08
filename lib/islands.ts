import type { ComponentType } from 'react'

/*
 * THE ISLAND REGISTRY (MOTIR-10643) — every client component a built page
 * hydrates, by name, and the only list the browser bundle reads.
 *
 * A static page ships no JavaScript of its own. The components below are the
 * exceptions: the parts of a page that are interactive today (the header's
 * menus and switcher, a copy button, a calculator), each rendered at build
 * inside the page and hydrated in place in the browser (`lib/island.tsx`
 * renders them; `lib/hydrateIslands.tsx` hydrates them).
 *
 * ⚠️ EACH ENTRY IS A DYNAMIC `import()`, SO A PAGE LOADS ONLY ITS OWN ISLANDS.
 * The bundler splits every entry into its own chunk; the hydration script
 * imports the entries the page's markup names and nothing else.
 *
 * ⚠️ A NAME AND ITS COMPONENT ARE DECLARED TWICE — here for the browser, and
 * at the `island()` call that renders it — and `tests/islands.test.ts` holds
 * every pair to the same component, so the markup cannot name one component
 * and hydrate another.
 */
export const ISLANDS = {
  SiteHeader: () =>
    import('@/app/_components/SiteHeader').then((m) => m.SiteHeader),
  ImmersiveTilt: () =>
    import('@motir/design-system').then((m) => m.ImmersiveTilt),
} satisfies Record<string, () => Promise<ComponentType<never>>>

export type IslandName = keyof typeof ISLANDS

/** The markup an island is rendered into. A custom element, styled away. */
export const ISLAND_TAG = 'motir-island'

/** The id of the JSON block that carries the page's island context. */
export const PAGE_CONTEXT_ID = 'motir-page'
