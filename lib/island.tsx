import {
  createElement,
  isValidElement,
  useId,
  type ComponentType,
  type ReactNode,
} from 'react'
import { renderToString } from 'react-dom/server'
import { clientCopy, PageProvider, usePage, type Copy } from '@/lib/copy'
import {
  decodeIslandProps,
  IslandSlot,
  ISLAND_NODE_KEY,
  ISLAND_TAG,
  type IslandName,
} from '@/lib/islands'

/*
 * A CLIENT ISLAND INSIDE A BUILT PAGE (MOTIR-10643).
 *
 * Under Next a `'use client'` module imported by a server component became a
 * client boundary: rendered on the server, hydrated in the browser, with
 * everything around it shipping no JavaScript. This is that boundary for the
 * built site. `island(name, Component)` returns a component that renders
 * `Component` at build into `<motir-island data-island=… data-props=…>`, and
 * `lib/hydrateIslands.tsx` hydrates that element in place with the
 * same props. Everything outside an island is HTML only.
 *
 * ⚠️ WHY NOT ASTRO'S `client:` DIRECTIVE. A directive hydrates a component an
 * `.astro` file renders, and the interactive parts of these pages sit deep
 * inside React trees (a cadence toggle inside a price card inside a list).
 * Lifting each to the Astro page would rewrite every page's composition to
 * get the same markup; an island boundary inside the React tree keeps the
 * pages as they are and the JavaScript to exactly the islands.
 *
 * ⚠️ ITS OWN REACT ROOT, AT BUILD AS IN THE BROWSER. The island is rendered
 * with `renderToString` as a separate root, and hydrated as one. That is what
 * keeps a `useId()` inside it identical on both sides — an id is derived from
 * the position in its root, and the page's root is not the island's — and the
 * `identifierPrefix` both sides pass keeps two islands' ids apart.
 *
 * ⚠️ THE ISLAND GETS THE BROWSER'S SHARE OF THE CATALOGUE AT BUILD TOO —
 * `clientCopy`, exactly what hydration will hand it. A component that reads a
 * namespace the browser does not receive therefore fails the BUILD, rather
 * than rendering a word at build and crashing in the browser.
 *
 * Props must survive JSON: they are written into the markup and read back.
 *
 * ⚠️ `children` IS THE ONE EXCEPTION, AND IT STAYS SERVER-RENDERED. An island
 * that wraps server-rendered content (the price card's cadence toggle around
 * the plan cards) gets its children as a SLOT: they are rendered at build, as
 * part of the page, into a `<motir-slot>` inside the island, and hydration
 * hands the component that same markup back as its children
 * (`IslandSlot`). The slot's content is HTML, never hydrated, so it ships
 * no JavaScript — what a server component's children inside a client
 * component were under Next.
 *
 * ⚠️ AND A PROP THAT IS A RENDERED NODE IS A SLOT TOO (MOTIR-10645). The
 * sandbox guide's steps take their words as rendered Markdown, one node per
 * part, and show some of them only for the agent the reader picks — so a node
 * the first render never places must still reach the browser. Each React
 * element among the props (at any depth) is rendered at build, with the page's
 * whole catalogue, and travels in `data-props` as its markup
 * (`{ [ISLAND_NODE_KEY]: html }`). Both sides hand the component that markup
 * back as an `IslandSlot`, so the build's render and the hydration's agree,
 * and the node itself ships no JavaScript.
 */

type JsonValue = string | number | boolean | null | undefined

/**
 * An island's props: what survives `JSON.stringify` and back, plus rendered
 * nodes, which travel as their markup. A function or a class instance maps to
 * `never`, so passing one is a type error.
 */
export type Serializable<T> = [T] extends [ReactNode]
  ? T
  : T extends JsonValue
    ? T
    : T extends readonly (infer Item)[]
      ? readonly Serializable<Item>[]
      : T extends (...args: never[]) => unknown
        ? never
        : T extends object
          ? { readonly [K in keyof T]: Serializable<T[K]> }
          : never

type IslandProps<P> = Omit<P, 'children'>

export function island<P extends object>(
  name: IslandName,
  Component: ComponentType<P>,
  // A component whose props do not survive JSON takes a `never` here, so the
  // call does not compile. `children` is a slot, and exempt.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- a type-level check
  ..._serializable: IslandProps<P> extends Serializable<IslandProps<P>>
    ? []
    : [never]
) {
  function Island(allProps: P) {
    const { children, ...props } = allProps as P & { children?: ReactNode }
    const page = usePage()
    // `useId` is unique within the page's root and stable across builds; the
    // island's own ids hang off it, so no two islands on a page collide.
    const identifierPrefix = `${name}${useId()}`
    const Inner = Component as ComponentType<object>
    // A slot renders with the page's whole catalogue: it is page markup.
    const renderSlot = (node: ReactNode, suffix: string) =>
      renderToString(<PageProvider value={page}>{node}</PageProvider>, {
        identifierPrefix: `${identifierPrefix}${suffix}`,
      })
    const slot =
      children === undefined ? undefined : renderSlot(children, 'slot')
    let nodes = 0
    const encode = (value: unknown): unknown => {
      if (isValidElement(value))
        return { [ISLAND_NODE_KEY]: renderSlot(value, `n${nodes++}`) }
      if (Array.isArray(value)) return value.map(encode)
      if (value !== null && typeof value === 'object')
        return Object.fromEntries(
          Object.entries(value).map(([key, item]) => [key, encode(item)]),
        )
      return value
    }
    const encoded = encode(props) as Record<string, unknown>
    const html = renderToString(
      <PageProvider
        value={{ ...page, copy: clientCopy(page.copy) as unknown as Copy }}
      >
        <Inner {...decodeIslandProps(encoded)}>
          {slot === undefined ? undefined : <IslandSlot html={slot} />}
        </Inner>
      </PageProvider>,
      { identifierPrefix },
    )
    return createElement(ISLAND_TAG, {
      'data-island': name,
      'data-props': JSON.stringify(encoded),
      'data-id-prefix': identifierPrefix,
      style: { display: 'contents' },
      dangerouslySetInnerHTML: { __html: html },
    })
  }
  Island.displayName = `Island(${name})`
  Island.island = { name, Component }
  return Island
}
