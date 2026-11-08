import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useId, useState, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as islandsModule from '@/app/_islands'
import { SITE_HOST } from '@/lib/publicHost'
import {
  clientCopy,
  englishCopy,
  PageProvider,
  useCopy,
  type Copy,
} from '@/lib/copy'
import { island } from '@/lib/island'
import {
  decodeIslandProps,
  ISLAND_NODE_KEY,
  ISLAND_SLOT_TAG,
  ISLAND_TAG,
  ISLANDS,
  PAGE_CONTEXT_ID,
  type IslandName,
} from '@/lib/islands'
import { hydrateIslands, readPageContext } from '@/lib/hydrateIslands'

/*
 * THE ISLAND BOUNDARY (MOTIR-10643).
 *
 * `island()` renders a component at build into `<motir-island>`, and
 * `hydrateIslands` hydrates it in place in the browser. The two halves must
 * agree on the component, its props and its ids, or the page either ships
 * dead controls or throws a hydration mismatch — so this renders one the way
 * the build does and hydrates it the way the browser does.
 */

const PAGE = { locale: 'en' as const, copy: englishCopy, pathname: '/' }

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('the registry', () => {
  it('names every island the site declares, with the same component', async () => {
    const declared = Object.values(islandsModule).map(
      (Island) =>
        (Island as { island: { name: IslandName; Component: unknown } }).island,
    )
    expect(declared.map((d) => d.name).sort()).toEqual(
      Object.keys(ISLANDS).sort(),
    )
    for (const { name, Component } of declared) {
      expect(await ISLANDS[name](), name).toBe(Component)
    }
  })
})

describe('an island at build', () => {
  it('writes its name, props and id prefix, and the component’s own markup', () => {
    const { SiteHeaderIsland } = islandsModule
    const html = renderToStaticMarkup(
      <PageProvider value={PAGE}>
        <SiteHeaderIsland host={SITE_HOST} overlay />
      </PageProvider>,
    )
    expect(html.startsWith(`<${ISLAND_TAG} data-island="SiteHeader"`)).toBe(
      true,
    )
    const props = /data-props="([^"]*)"/
      .exec(html)?.[1]
      ?.replace(/&quot;/g, '"')
    expect(JSON.parse(props!)).toEqual({ host: SITE_HOST, overlay: true })
    expect(html).toMatch(/data-id-prefix="SiteHeader[^"]+"/)
    expect(html).toContain('style="display:contents"')
    expect(html).toContain('<header')
  })

  it('renders on the browser’s share of the catalogue, so a missing namespace fails the build', () => {
    const SeesAll = () => <p>{Object.keys(useCopy()).length}</p>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- a test-only registry name
    const SeesAllIsland = island('SiteHeader' as any, SeesAll)
    const html = renderToStaticMarkup(
      <PageProvider value={PAGE}>
        <SeesAllIsland />
      </PageProvider>,
    )
    expect(html).toContain(
      `<p>${Object.keys(clientCopy(englishCopy)).length}</p>`,
    )
  })

  it('refuses props that do not survive JSON, at compile time', () => {
    const TakesAFunction = (props: { onClick: () => void }) => (
      <button onClick={props.onClick} />
    )
    // @ts-expect-error — a function prop cannot cross into the browser.
    island('SiteHeader', TakesAFunction)
    // A JSON-safe one compiles.
    island('SiteHeader', (props: { label: string; count?: number }) => (
      <span>
        {props.label}
        {props.count}
      </span>
    ))
  })
})

describe('an island in the browser', () => {
  it('hydrates with no mismatch, keeps its ids, and becomes interactive', async () => {
    const Counter = ({ start }: { start: number }) => {
      const [count, setCount] = useState(start)
      const id = useId()
      return (
        <button id={id} onClick={() => setCount(count + 1)}>
          {useCopy().nav.menu} {count}
        </button>
      )
    }
    vi.spyOn(ISLANDS, 'SiteHeader').mockResolvedValue(
      Counter as unknown as Awaited<ReturnType<(typeof ISLANDS)['SiteHeader']>>,
    )
    const CounterIsland = island('SiteHeader', Counter)
    document.body.innerHTML = renderToStaticMarkup(
      <PageProvider value={PAGE}>
        <CounterIsland start={2} />
        <CounterIsland start={5} />
      </PageProvider>,
    )
    const ids = [...document.querySelectorAll('button')].map((b) => b.id)
    expect(new Set(ids).size).toBe(2)

    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    let roots: Awaited<ReturnType<typeof hydrateIslands>> = []
    await act(async () => {
      roots = await hydrateIslands(document, {
        ...PAGE,
        copy: clientCopy(englishCopy) as unknown as Copy,
      })
    })
    expect(roots).toHaveLength(2)
    expect(errors).not.toHaveBeenCalled()
    expect([...document.querySelectorAll('button')].map((b) => b.id)).toEqual(
      ids,
    )

    await userEvent.click(screen.getByRole('button', { name: / 2$/ }))
    expect(screen.getByRole('button', { name: /3$/ })).toHaveTextContent(
      `${englishCopy.nav.menu} 3`,
    )
    act(() => roots.forEach((root) => root.unmount()))
  })

  it('hydrates an island written with no props as one with none', async () => {
    const Bare = () => <b>{useCopy().nav.menu}</b>
    vi.spyOn(ISLANDS, 'ImmersiveTilt').mockResolvedValue(
      Bare as unknown as Awaited<ReturnType<(typeof ISLANDS)['ImmersiveTilt']>>,
    )
    document.body.innerHTML = `<${ISLAND_TAG} data-island="ImmersiveTilt"><b>${englishCopy.nav.menu}</b></${ISLAND_TAG}>`
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    let roots: Awaited<ReturnType<typeof hydrateIslands>> = []
    await act(async () => {
      roots = await hydrateIslands(document, PAGE)
    })
    expect(roots).toHaveLength(1)
    expect(errors).not.toHaveBeenCalled()
    act(() => roots[0]!.unmount())
  })

  it('hands back its server-rendered children as a slot, untouched, and stays interactive', async () => {
    const Toggle = ({
      label,
      children,
    }: {
      label: string
      children?: ReactNode
    }) => {
      const [on, setOn] = useState(false)
      return (
        <div data-on={String(on)}>
          <button onClick={() => setOn(!on)}>{label}</button>
          {children}
        </div>
      )
    }
    vi.spyOn(ISLANDS, 'PriceCadence').mockResolvedValue(
      Toggle as unknown as Awaited<
        ReturnType<(typeof ISLANDS)['PriceCadence']>
      >,
    )
    // The slot reads a namespace the browser never receives: it is page
    // markup, rendered at build with the whole catalogue.
    const Legal = () => <p id="slotted">{useCopy().legal.allDocuments}</p>
    const ToggleIsland = island('PriceCadence', Toggle)
    document.body.innerHTML = renderToStaticMarkup(
      <PageProvider value={PAGE}>
        <ToggleIsland label="flip">
          <Legal />
        </ToggleIsland>
      </PageProvider>,
    )
    const built = document.querySelector(ISLAND_TAG) as HTMLElement
    expect(JSON.parse(built.dataset.props!)).toEqual({ label: 'flip' })
    expect(
      built.querySelector(`${ISLAND_SLOT_TAG} #slotted`),
    ).toHaveTextContent(englishCopy.legal.allDocuments)
    const slotted = document.getElementById('slotted')

    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    let roots: Awaited<ReturnType<typeof hydrateIslands>> = []
    await act(async () => {
      roots = await hydrateIslands(document, {
        ...PAGE,
        copy: clientCopy(englishCopy) as unknown as Copy,
      })
    })
    expect(errors).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'flip' }))
    expect(document.querySelector('[data-on]')).toHaveAttribute(
      'data-on',
      'true',
    )
    // The very node the build wrote, still there and still worded.
    expect(document.getElementById('slotted')).toBe(slotted)
    expect(slotted).toHaveTextContent(englishCopy.legal.allDocuments)
    act(() => roots[0]!.unmount())
  })

  it('carries a rendered-node prop as its markup, at any depth, and shows one the first render never placed (MOTIR-10645)', async () => {
    const Picker = ({
      words,
    }: {
      words: { title: ReactNode; byChoice: Record<string, ReactNode> }
      tags: readonly string[]
    }) => {
      const [choice, setChoice] = useState('a')
      return (
        <div>
          <h2>{words.title}</h2>
          <button onClick={() => setChoice('b')}>pick b</button>
          <p data-choice={choice}>{words.byChoice[choice]}</p>
        </div>
      )
    }
    vi.spyOn(ISLANDS, 'SetupSteps').mockResolvedValue(
      Picker as unknown as Awaited<ReturnType<(typeof ISLANDS)['SetupSteps']>>,
    )
    // The nodes read a namespace the browser never receives: page markup.
    const Legal = () => <em>{useCopy().legal.allDocuments}</em>
    const PickerIsland = island('SetupSteps', Picker)
    document.body.innerHTML = renderToStaticMarkup(
      <PageProvider value={PAGE}>
        <PickerIsland
          tags={['x', 'y']}
          words={{
            title: <Legal />,
            byChoice: {
              a: <b id="node-a">first</b>,
              b: <i id="node-b">second</i>,
            },
          }}
        />
      </PageProvider>,
    )
    const built = document.querySelector(ISLAND_TAG) as HTMLElement
    const props = JSON.parse(built.dataset.props!)
    expect(props.tags).toEqual(['x', 'y'])
    expect(props.words.byChoice.b[ISLAND_NODE_KEY]).toBe(
      '<i id="node-b">second</i>',
    )
    expect(built.querySelector('h2')).toHaveTextContent(
      englishCopy.legal.allDocuments,
    )
    expect(document.getElementById('node-b')).toBeNull()

    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    let roots: Awaited<ReturnType<typeof hydrateIslands>> = []
    await act(async () => {
      roots = await hydrateIslands(document, {
        ...PAGE,
        copy: clientCopy(englishCopy) as unknown as Copy,
      })
    })
    expect(errors).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'pick b' }))
    expect(document.getElementById('node-b')).toHaveTextContent('second')
    expect(document.getElementById('node-a')).toBeNull()
    act(() => roots[0]!.unmount())
  })

  it('leaves props with no rendered node as they were', () => {
    expect(decodeIslandProps({ a: [1, null, { b: 'c' }], d: true })).toEqual({
      a: [1, null, { b: 'c' }],
      d: true,
    })
  })

  it('refuses an island the registry does not name', async () => {
    document.body.innerHTML = `<${ISLAND_TAG} data-island="Nope"></${ISLAND_TAG}>`
    await expect(hydrateIslands(document, PAGE)).rejects.toThrow(
      'Unknown island "Nope"',
    )
  })

  it('reads the page context the layout wrote, and says when it is missing', () => {
    expect(() => readPageContext()).toThrow(`#${PAGE_CONTEXT_ID} is missing`)
    document.body.innerHTML = `<script type="application/json" id="${PAGE_CONTEXT_ID}">${JSON.stringify(
      { locale: 'de', pathname: '/de', copy: {} },
    )}</script>`
    expect(readPageContext()).toEqual({
      locale: 'de',
      pathname: '/de',
      copy: {},
    })
  })
})
