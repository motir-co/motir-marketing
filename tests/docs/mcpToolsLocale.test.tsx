import { render } from '@/tests/helpers/withCopy'
import { EN_PAGE } from '@/tests/helpers/locale'
import { resolveAsync } from '@/tests/helpers/resolveAsync'
import { afterEach, describe, expect, it, vi } from 'vitest'
import McpToolsPage from '@/app/[locale]/docs/(guides)/mcp/tools/McpToolsRoute'

/*
 * MOTIR-8050 — the tool catalogue is fetched in the page's locale and every
 * English region left on a translated page is marked lang="en". Panel F
 * (design/docs/design-notes.md, decision F): no per-row marker.
 */

const tool = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  permission: 'thing:browse',
  summary: `Summary of ${name}.`,
  inputSchema: { type: 'object', properties: {} },
  annotations: { readOnlyHint: true },
  ...extra,
})

const group = (
  label: string,
  extra: Record<string, unknown>,
  tools: unknown[],
) => ({
  permission: 'thing:browse',
  label,
  gates: `${label} gates.`,
  grantedByDefault: true,
  ...extra,
  tools,
})

const localized = {
  locale: 'ko',
  endpoint: '/api/mcp',
  toolCount: 3,
  groups: [
    group('Group A', { textLocale: 'ko' }, [
      tool('zqToolOne', { summaryLocale: 'ko' }),
      tool('zqToolTwo', { summaryLocale: 'en' }),
    ]),
    group('Group B', { textLocale: 'en' }, [
      tool('zqToolThree', { summaryLocale: 'en' }),
    ]),
  ],
}

const unlocalized = {
  endpoint: '/api/mcp',
  toolCount: 3,
  groups: [
    group('Group A', {}, [tool('zqToolOne'), tool('zqToolTwo')]),
    group('Group B', {}, [tool('zqToolThree')]),
  ],
}

function stub(document: unknown) {
  const fetchMock = vi.fn<typeof fetch>(
    async () => new Response(JSON.stringify(document), { status: 200 }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function renderPage(locale: 'en' | 'ko') {
  const props =
    locale === 'en' ? EN_PAGE : { params: Promise.resolve({ locale }) }
  return render(
    (await resolveAsync(await McpToolsPage(props))) as never,
    {
      locale,
    } as never,
  ).container
}

const regionOf = (c: HTMLElement, heading: string) =>
  [...c.querySelectorAll('h2')].find((h) => h.textContent === heading)!
    .parentElement!
const summaryOf = (c: HTMLElement, name: string) =>
  c.querySelector(`#tool-${name}`)!.closest('li')!.querySelector('p')!

afterEach(() => vi.unstubAllGlobals())

describe('/docs/mcp/tools in a localized page', () => {
  it('fetches ?locale=ko and marks only the English regions', async () => {
    const fetchMock = stub(localized)
    const c = await renderPage('ko')
    expect(String(fetchMock.mock.calls[0]![0])).toMatch(
      /mcp-tools\.json\?locale=ko$/,
    )

    expect(regionOf(c, 'Group A').hasAttribute('lang')).toBe(false)
    expect(summaryOf(c, 'zqToolOne').hasAttribute('lang')).toBe(false)
    expect(regionOf(c, 'Group B').getAttribute('lang')).toBe('en')
    expect(summaryOf(c, 'zqToolTwo').getAttribute('lang')).toBe('en')
    expect(summaryOf(c, 'zqToolThree').getAttribute('lang')).toBe('en')
    // Panel F: no extra per-row marker beyond the lang attribute.
    expect(summaryOf(c, 'zqToolTwo').textContent).toBe('Summary of zqToolTwo.')
  })

  it('leaves names, permissions and chips as served', async () => {
    stub(localized)
    const c = await renderPage('ko')
    for (const name of ['zqToolOne', 'zqToolTwo', 'zqToolThree']) {
      expect(c.querySelector(`#tool-${name}`)!.textContent).toBe(name)
    }
    expect(c.querySelectorAll('[data-hint="reads"]').length).toBeGreaterThan(3)
  })

  it('marks everything lang="en" against an older server, without throwing', async () => {
    stub(unlocalized)
    const c = await renderPage('ko')
    for (const g of ['Group A', 'Group B'])
      expect(regionOf(c, g).getAttribute('lang')).toBe('en')
    for (const n of ['zqToolOne', 'zqToolTwo', 'zqToolThree'])
      expect(summaryOf(c, n).getAttribute('lang')).toBe('en')
  })
})

describe('/docs/mcp/tools in English', () => {
  it('requests the unlocalized URL and adds no lang to regions or summaries', async () => {
    const fetchMock = stub(unlocalized)
    const c = await renderPage('en')
    expect(String(fetchMock.mock.calls[0]![0])).toMatch(/mcp-tools\.json$/)
    for (const g of ['Group A', 'Group B'])
      expect(regionOf(c, g).hasAttribute('lang')).toBe(false)
    expect(c.querySelectorAll('li [lang]').length).toBe(0)
  })
})
