import { hydrateIslands, readPageContext } from '@/lib/hydrateIslands'

/*
 * The one script every built page loads (`src/layouts/SitePage.astro`):
 * hydrate the document's islands (`lib/hydrateIslands.tsx`). A page with no
 * island reads nothing.
 */
if (document.querySelector('[data-island]') !== null) {
  void hydrateIslands(document, readPageContext())
}
