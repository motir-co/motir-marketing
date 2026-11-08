import { createElement, type ComponentType } from 'react'

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
  HeroBrief: () =>
    import('@/app/_components/landing/HeroBrief').then((m) => m.HeroBrief),
  HeroWaves: () =>
    import('@/app/_components/landing/HeroWaves').then((m) => m.HeroWaves),
  Calculator: () =>
    import('@/app/_components/price/Calculator').then((m) => m.Calculator),
  PriceCadence: () =>
    import('@/app/_components/price/PriceCadence').then((m) => m.PriceCadence),
  PlansUnavailable: () =>
    import('@/app/_components/price/PriceCadence').then(
      (m) => m.PlansUnavailable,
    ),
  RackStage: () =>
    import('@/app/[locale]/how-it-works/_components/RackStage').then(
      (m) => m.RackStage,
    ),
  StackArt: () =>
    import('@/app/[locale]/how-to-use/_components/StackArt').then(
      (m) => m.StackArt,
    ),
  DesignShowcase: () =>
    import('@/app/_components/DesignShowcase').then((m) => m.DesignShowcase),
} satisfies Record<string, () => Promise<ComponentType<never>>>

export type IslandName = keyof typeof ISLANDS

/** The markup an island is rendered into. A custom element, styled away. */
export const ISLAND_TAG = 'motir-island'

/** The element an island's server-rendered children are written into. */
export const ISLAND_SLOT_TAG = 'motir-slot'

/** The id of the JSON block that carries the page's island context. */
export const PAGE_CONTEXT_ID = 'motir-page'

/**
 * An island's server-rendered children, handed back to it as markup: at build
 * from the slot just rendered (`lib/island.tsx`), in the browser from the
 * slot the build wrote (`lib/hydrateIslands.tsx`). Here, beside the tag, so
 * the browser bundle never imports the build's renderer.
 */
export function IslandSlot({ html }: { html: string }) {
  return createElement(ISLAND_SLOT_TAG, {
    style: { display: 'contents' },
    dangerouslySetInnerHTML: { __html: html },
  })
}
