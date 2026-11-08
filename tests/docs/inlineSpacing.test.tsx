import { render } from '@/tests/helpers/withCopy'
import { resolveAsync } from '@/tests/helpers/resolveAsync'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DocsIndexPage from '@/app/[locale]/docs/(guides)/DocsIndexRoute'
import CliPage from '@/app/[locale]/docs/(guides)/cli/CliRoute'
import McpPage from '@/app/[locale]/docs/(guides)/mcp/McpRoute'
import PublicAddressPage from '@/app/[locale]/docs/(guides)/public-address/PublicAddressRoute'
import SandboxPage from '@/app/[locale]/docs/(guides)/sandbox/SandboxRoute'
import SentryPage from '@/app/[locale]/docs/(guides)/sentry/SentryRoute'
import DifficultyPage from '@/app/[locale]/docs/(guides)/difficulty/DifficultyRoute'
import SkillsPage from '@/app/[locale]/docs/(guides)/skills/SkillsRoute'
import ClaudeCodePluginPage from '@/app/[locale]/docs/(guides)/claude-code-plugin/ClaudeCodePluginRoute'
import ClaudeCodeConnectorPage from '@/app/[locale]/docs/(guides)/claude-code-connector/ClaudeCodeConnectorRoute'
import ApiReferencePage from '@/app/[locale]/docs/api/ApiReferenceRoute'
import McpToolsPage from '@/app/[locale]/docs/(guides)/mcp/tools/McpToolsRoute'
import GettingStartedPage from '@/app/[locale]/docs/api/getting-started/GettingStartedRoute'
import StabilityPage from '@/app/[locale]/docs/api/stability/StabilityRoute'
import { EN_PAGE } from '@/tests/helpers/locale'

/*
 * A WORD RUNNING INTO THE ELEMENT BEFORE IT (MOTIR-4429).
 *
 * ── The bug this guard exists for, because it is not the one it looks like ──
 * `resource:actionnames`. `limit(the default`. `orisoutside`. Seven of them
 * shipped into this card's own diff, on pages whose JSX plainly reads
 * `<Mono>limit</Mono> (the default …` — the space is IN the source and does
 * not reach the page.
 *
 * The cause is an HTML ENTITY later in the same JSX text node. `&apos;` and
 * `&amp;` split the text into parts, and the leading whitespace of the part
 * after an element is then trimmed as if it were at the start of a line. So
 * the defect is invisible in review (the space is right there), invisible to
 * typecheck, invisible to lint, and it appears and disappears depending on a
 * punctuation mark three lines further down. The fix on this card was to write
 * `’` and `&` as literal characters rather than as entities — which is better
 * typography anyway — but nothing about that fix prevents the next `&apos;`.
 *
 * ── Why the check runs on the RENDER and not on the source ─────────────────
 * The source is correct in every failing case. Only the rendered markup knows.
 *
 * ── What it permits ────────────────────────────────────────────────────────
 * Punctuation immediately after a closing tag is ordinary and often right:
 * `<code>x</code>,` and `<code>x</code>.` and `<a …>link</a>;`. What is never
 * right on these pages is a LETTER or an opening bracket, because that is a
 * word that has lost its space. A plural — `<code>id</code>s` — would be a
 * false positive; none of these pages does it, and a page that wants to should
 * use `<code>ids</code>`.
 */

const catalogueFixture = {
  endpoint: '/api/mcp',
  toolCount: 1,
  groups: [
    {
      permission: 'zqthing:browse',
      label: 'Browse zqthings',
      gates: 'Read zqthings and their detail.',
      grantedByDefault: true,
      tools: [
        { name: 'zqAlpha', permission: 'zqthing:browse', summary: 'Read one.' },
      ],
    },
  ],
}

const cliFixture = {
  packageName: '@zq/cli-fixture',
  packageVersion: '9.9.9',
  installCommand: 'npm install -g @zq/cli-fixture',
  nodeRequirement: '>=22',
  defaultServer: 'https://zq-fixture.test',
  commandCount: 1,
  commands: [
    {
      path: 'zqlogin',
      signature: '',
      invocation: 'motir zqlogin',
      description: 'Connect this terminal.',
      helpGroup: 'SETUP COMMANDS:',
      options: [],
    },
  ],
}

const specFixture = {
  openapi: '3.1.0',
  info: { title: 'Motir API', version: '9.9.9' },
  paths: {},
}

function stub(document: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(document), { status: 200 })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A closing inline tag with a word character straight after it. */
const RUN_ON = /<\/(code|strong|em|a|b|i)>(?=[A-Za-z(])/g

/** Every offence, with enough of its surroundings to find in the source. */
export function runOnSites(html: string): string[] {
  return [...html.matchAll(RUN_ON)].map((match) => {
    const at = match.index ?? 0
    return html
      .slice(Math.max(0, at - 60), at + 24)
      .replace(/<[^>]+>/g, '⟨tag⟩')
  })
}

describe('the run-on detector', () => {
  it('FIRES on the shape that shipped, so a green run means something', () => {
    // Two of the seven, verbatim as they rendered.
    const shipped =
      '<p>the same <code>resource:action</code>names the Roles</p>' +
      '<p>a page size with <code>limit</code>(the default is 50)</p>'
    expect(runOnSites(shipped).length).toBe(2)
  })

  it('permits punctuation, which is ordinary and often right', () => {
    const fine =
      '<p>send <code>cursor</code>, then read <code>nextCursor</code>. Done.</p>' +
      '<p>see <a href="/x">the CLI</a> — or <em>not</em>.</p>'
    expect(runOnSites(fine)).toEqual([])
  })
})

describe('no /docs page runs a word into the element before it', async () => {
  const cases: [string, () => Promise<HTMLElement>][] = [
    ['/docs', async () => render(await DocsIndexPage(EN_PAGE)).container],
    [
      '/docs/mcp',
      async () => {
        stub(catalogueFixture)
        return render(await McpPage(EN_PAGE)).container
      },
    ],
    [
      '/docs/cli',
      async () => {
        stub(cliFixture)
        return render(await CliPage(EN_PAGE)).container
      },
    ],
    ['/docs/sandbox', async () => render(await SandboxPage(EN_PAGE)).container],
    [
      '/docs/public-address',
      async () => render(await PublicAddressPage(EN_PAGE)).container,
    ],
    [
      '/docs/sentry',
      async () =>
        render((await resolveAsync(await SentryPage(EN_PAGE))) as never)
          .container,
    ],
    [
      '/docs/difficulty',
      async () =>
        render((await resolveAsync(await DifficultyPage(EN_PAGE))) as never)
          .container,
    ],
    [
      '/docs/skills',
      async () =>
        render((await resolveAsync(await SkillsPage(EN_PAGE))) as never)
          .container,
    ],
    [
      '/docs/claude-code-plugin',
      async () =>
        render(
          (await resolveAsync(await ClaudeCodePluginPage(EN_PAGE))) as never,
        ).container,
    ],
    [
      '/docs/claude-code-connector',
      async () =>
        render(
          (await resolveAsync(await ClaudeCodeConnectorPage(EN_PAGE))) as never,
        ).container,
    ],
    [
      '/docs/api',
      async () => {
        stub(specFixture)
        return render(
          (await resolveAsync(await ApiReferencePage(EN_PAGE))) as never,
        ).container
      },
    ],
    [
      '/docs/mcp/tools',
      async () => {
        stub(catalogueFixture)
        return render(
          (await resolveAsync(await McpToolsPage(EN_PAGE))) as never,
        ).container
      },
    ],
    [
      '/docs/api/getting-started',
      async () => {
        stub(specFixture)
        return render(
          (await resolveAsync(await GettingStartedPage(EN_PAGE))) as never,
        ).container
      },
    ],
    [
      '/docs/api/stability',
      async () =>
        render((await resolveAsync(await StabilityPage(EN_PAGE))) as never)
          .container,
    ],
  ]

  for (const [route, mount] of cases) {
    it(`${route}`, async () => {
      const container = await mount()
      expect(runOnSites(container.innerHTML)).toEqual([])
    })
  }
})
