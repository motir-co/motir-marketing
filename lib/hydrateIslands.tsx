import type { ComponentType } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { PageProvider, type PageValue } from '@/lib/copy'
import {
  ISLAND_TAG,
  ISLANDS,
  PAGE_CONTEXT_ID,
  type IslandName,
} from '@/lib/islands'

/*
 * HYDRATE A PAGE'S ISLANDS (MOTIR-10643) — the browser half of
 * `lib/island.tsx`. Every `<motir-island>` under `root` is hydrated in place
 * with the component its `data-island` names, the props its `data-props`
 * carries and the id prefix the build rendered it with, inside a
 * `PageProvider` holding the page context the layout wrote (locale, path and
 * the browser's share of the catalogue).
 *
 * Each component arrives through its registry entry's dynamic import, so a
 * page downloads the islands it has and no others. `src/scripts/` runs this
 * over the document; the component tests run it over a rendered container,
 * so what they click is the hydrated island, exactly as in the browser.
 */

/** The page context the layout wrote into `#motir-page`. */
export function readPageContext(doc: Document = document): PageValue {
  const block = doc.getElementById(PAGE_CONTEXT_ID)
  if (block === null) throw new Error(`#${PAGE_CONTEXT_ID} is missing`)
  return JSON.parse(String(block.textContent)) as PageValue
}

async function hydrate(element: HTMLElement, page: PageValue): Promise<Root> {
  const name = element.dataset.island as IslandName
  const load = ISLANDS[name]
  if (load === undefined) throw new Error(`Unknown island "${name}"`)
  const Component = (await load()) as ComponentType<Record<string, unknown>>
  const props = JSON.parse(element.dataset.props ?? '{}') as Record<
    string,
    unknown
  >
  return hydrateRoot(
    element,
    <PageProvider value={page}>
      <Component {...props} />
    </PageProvider>,
    { identifierPrefix: element.dataset.idPrefix },
  )
}

/** Hydrate every island under `root`; resolves with their React roots. */
export function hydrateIslands(
  root: ParentNode,
  page: PageValue,
): Promise<Root[]> {
  const elements = [...root.querySelectorAll<HTMLElement>(ISLAND_TAG)]
  return Promise.all(elements.map((element) => hydrate(element, page)))
}
