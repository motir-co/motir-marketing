import { readFileSync } from 'node:fs'
import { render } from '@/tests/helpers/withCopy'
import { EN_PAGE } from '@/tests/helpers/locale'
import { afterEach, describe, expect, it, vi } from 'vitest'
import McpPage from '@/app/[locale]/docs/(guides)/mcp/McpRoute'
import { APP_ORIGIN } from '@/lib/appOrigin'
import {
  CLAUDE_AI_ROUTE_CHECKED_ON,
  CLAUDE_ROUTES_CHECKED_ON,
  CONNECTED_APPS_PATH,
  MCP_AUTH_HEADER,
  MCP_AUTH_SCHEME,
  MCP_ENDPOINT_PATH,
  MCP_TOKEN_ENV_VAR,
  MCP_TOKEN_PLACEHOLDER,
  claudeRoutes,
  mcpClaudeCodeTokenCommand,
  mcpClients,
  mcpTransportFacts,
  mcpVerifyCommand,
} from '@/lib/mcpWiring'

/*
 * THE WIRING GUIDE IS BACK, AND IT IS GENERATED (MOTIR-4429).
 *
 * `/docs/mcp` was two sentences: `0 <pre>` blocks, and `mcpServers` appeared
 * ZERO times across all nine `/docs` pages. A reader was told the endpoint
 * exists and given no way to reach it, on the page the sub-area is named
 * after. This file holds the restore in two halves, and the second is the one
 * the card's acceptance criterion is actually about.
 *
 *  1. The PAGE renders the wiring — a config block per client, each with its
 *     file path and its secret-handling note, plus the token step, the
 *     verification step and the scope table.
 *  2. Every block is INTERPOLATED from one set of transport facts. That is
 *     checked with a SENTINEL origin, which is what makes it a real check: a
 *     block that typed `https://app.motir.co` would satisfy any positive
 *     assertion made against the configured origin and fails here.
 */

const SENTINEL = 'https://sentinel.invalid'

/**
 * Whether a client's config text carries the sentinel origin anywhere. The
 * config is a block of JSON, TOML or a shell line rather than a URL, so this
 * is a text search; it is spelled as a split so CodeQL does not read it as a
 * URL check (`js/incomplete-url-substring-sanitization`).
 */
const carriesOrigin = (config: string) => config.split(SENTINEL).length > 1

/** The catalogue shape the scope table is derived from. Two invented groups. */
const catalogueFixture = {
  endpoint: MCP_ENDPOINT_PATH,
  toolCount: 2,
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
    {
      permission: 'zqthing:edit',
      label: 'Edit zqthings',
      gates: 'Create and change zqthings.',
      grantedByDefault: false,
      tools: [
        { name: 'zqBeta', permission: 'zqthing:edit', summary: 'Change one.' },
      ],
    },
  ],
}

function stubCatalogue(document: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(document), { status })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the transport facts are ONE source, and every block reads them', () => {
  it('composes the URL from the origin it is given', () => {
    const facts = mcpTransportFacts(SENTINEL)
    expect(facts.url).toBe(`${SENTINEL}${MCP_ENDPOINT_PATH}`)
    expect(facts.authHeader).toBe(MCP_AUTH_HEADER)
    expect(facts.authScheme).toBe(MCP_AUTH_SCHEME)
    expect(facts.tokenPlaceholder).toBe(MCP_TOKEN_PLACEHOLDER)
  })

  it('defaults to the ONE configured app origin, never a literal', () => {
    expect(mcpTransportFacts().url).toBe(`${APP_ORIGIN}${MCP_ENDPOINT_PATH}`)
  })

  it('THE GUARD — every client config carries the sentinel origin', () => {
    // ⚠️ THE NEGATIVE CASE, and the whole reason the blocks are built rather
    // than typed. A hand-copied config would carry `https://app.motir.co` and
    // would pass any assertion made against the configured origin, because
    // that IS the configured origin in production. Building with an origin
    // that appears nowhere in the repository is what separates "interpolated"
    // from "happens to match".
    const clients = mcpClients(mcpTransportFacts(SENTINEL))
    expect(clients.length).toBeGreaterThanOrEqual(5)
    const missing = clients
      .filter((client) => !carriesOrigin(client.config))
      .map((client) => client.id)
    expect(missing, 'a config that does not interpolate the origin').toEqual([])
  })

  it('THE PREDICATE FIRES on a hand-copied block', () => {
    // The counterfactual, so the guard above is known to be able to go red.
    const handCopied = [
      { id: 'typed', config: '{ "url": "https://app.motir.co/api/mcp" }' },
    ]
    expect(
      handCopied
        .filter((client) => !carriesOrigin(client.config))
        .map((client) => client.id),
    ).toEqual(['typed'])
  })

  it('carries no literal Motir origin anywhere in its source', () => {
    // The other direction, stated as an absence — the same shape
    // `tests/docs/cli.test.tsx` uses for the CLI's default server.
    const text = readFileSync('lib/mcpWiring.ts', 'utf8')
    // Comments are exempt: the block comment above the module EXPLAINS the
    // rule by quoting the string it forbids, which is the right place for it.
    const codeOnly = text.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(codeOnly).not.toContain('https://app.motir.co')
    expect(codeOnly).not.toContain('motir.co/api/mcp')
  })

  it('every block names its file, its note, its vendor docs and a date', () => {
    // Each field is the reason a block is usable rather than decorative: the
    // file says where it goes, the note says what to do about the secret, and
    // the vendor link is the authority when the format goes stale.
    for (const client of mcpClients()) {
      // Only the generic block has no path: its caption is a catalogue sentence.
      if (client.id === 'other') expect(client.file).toBeNull()
      else expect(client.file, client.id).toMatch(/\S/)
      expect(client.docsUrl, client.id).toMatch(/^https:\/\//)
      expect(client.checkedOn, client.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('reads the secret from the environment where the vendor supports it', () => {
    // A guide whose first instruction is "paste a live credential into a file
    // your repository tracks" has taught the wrong habit in five minutes.
    const configs = mcpClients().map((client) => client.config)
    const fromEnvironment = configs.filter((config) =>
      config.includes(MCP_TOKEN_ENV_VAR),
    )
    expect(fromEnvironment.length).toBeGreaterThanOrEqual(2)
    // VS Code prompts instead, and stores it outside the file.
    expect(configs.join('\n')).toContain('promptString')
  })

  it('the verification command, the one-command form and the page read the same facts', async () => {
    const facts = mcpTransportFacts(SENTINEL)
    expect(mcpVerifyCommand(facts)).toContain(`${SENTINEL}${MCP_ENDPOINT_PATH}`)
    expect(mcpVerifyCommand(facts)).toContain(`$${MCP_TOKEN_ENV_VAR}`)
    expect(mcpClaudeCodeTokenCommand(facts)).toBe(
      `claude mcp add --transport http motir ${SENTINEL}${MCP_ENDPOINT_PATH} --header "${MCP_AUTH_HEADER}: ${MCP_AUTH_SCHEME} ${MCP_TOKEN_PLACEHOLDER}"`,
    )
    // The tables now live in the document and read those facts as values.
    stubCatalogue(catalogueFixture)
    const { container } = render(await McpPage(EN_PAGE))
    const cells = [...container.querySelectorAll('td')].map(
      (cell) => cell.textContent,
    )
    expect(cells).toContain(`POST ${MCP_ENDPOINT_PATH}`)
    expect(cells).toContain(`${APP_ORIGIN}${MCP_ENDPOINT_PATH}`)
    expect(cells).toContain(
      `${MCP_TOKEN_PLACEHOLDER} — the one you minted in step 1`,
    )
  })
})

describe('/docs/mcp is a wiring GUIDE, not a definition', () => {
  it('carries a config block per client — the page had ZERO', async () => {
    stubCatalogue(catalogueFixture)
    const { container } = render(await McpPage(EN_PAGE))

    const panes = [...container.querySelectorAll('pre')].map(
      (pane) => pane.textContent ?? '',
    )
    // One per client, plus the verification command.
    expect(panes.length).toBeGreaterThanOrEqual(mcpClients().length + 1)

    const code = panes.join('\n')
    // The two strings MOTIR-4397 measured at ZERO across the whole surface.
    expect(code).toContain('mcpServers')
    expect(container.textContent).toContain('claude mcp add')
  })

  it('every rendered block carries the SERVED origin', async () => {
    // The card's own criterion. In this lane the served origin is the test
    // value `vitest.config.mts` sets, which is not production — so a block
    // that typed the production URL fails here.
    stubCatalogue(catalogueFixture)
    const { container } = render(await McpPage(EN_PAGE))
    const panes = [...container.querySelectorAll('pre')].map(
      (pane) => pane.textContent ?? '',
    )
    const configs = panes.filter((pane) => pane.includes('motir'))
    expect(configs.length).toBeGreaterThanOrEqual(mcpClients().length)
    for (const pane of configs) {
      expect(pane, pane.slice(0, 40)).toContain(APP_ORIGIN)
    }
  })

  it('names every supported client, with the file its config goes in', async () => {
    stubCatalogue(catalogueFixture)
    const { container } = render(await McpPage(EN_PAGE))
    const text = container.textContent ?? ''
    const labels: Record<string, string> = {
      'claude-code': 'Claude Code',
      cursor: 'Cursor',
      vscode: 'VS Code',
      codex: 'Codex CLI',
      other: 'Any other streamable-HTTP client',
    }
    expect(Object.keys(labels).sort()).toEqual(
      mcpClients()
        .map((client) => client.id)
        .sort(),
    )
    for (const client of mcpClients()) {
      expect(text, client.id).toContain(labels[client.id]!)
      if (client.file) expect(text, `${client.id} file`).toContain(client.file)
    }
  })

  it('leads with Add Motir to Claude, then walks the token route: mint, wire, check', async () => {
    stubCatalogue(catalogueFixture)
    const { container } = render(await McpPage(EN_PAGE))
    const headings = [...container.querySelectorAll('h2')].map(
      (heading) => heading.textContent ?? '',
    )
    expect(headings).toEqual([
      'Add Motir to Claude',
      'Other clients and CI: use a token',
      'This server, or the REST API?',
      '1. Mint a token',
      '2. Wire your client',
      '3. Check the connection',
      'What a connection may call',
      'What next',
    ])
  })

  it('KEEPS the token-route anchors, so inbound links still land', async () => {
    stubCatalogue(catalogueFixture)
    const { container } = render(await McpPage(EN_PAGE))
    for (const id of [
      'claude',
      'token-route',
      'token',
      'wire',
      'check',
      'scopes',
    ]) {
      expect(container.querySelector(`#${id}`), id).not.toBeNull()
    }
  })

  it('warns that an unauthorized answer is about the TOKEN', async () => {
    stubCatalogue(catalogueFixture)
    const { container } = render(await McpPage(EN_PAGE))
    expect(container.textContent).toMatch(/unauthorized answer is about the/i)
  })

  it('DERIVES the scope table from the published catalogue', async () => {
    // Every scope on the page comes from the fixture and from nowhere else —
    // this repository keeps no copy of a scope list it could not check.
    stubCatalogue(catalogueFixture)
    const { container } = render(await McpPage(EN_PAGE))
    const text = container.textContent ?? ''
    for (const group of catalogueFixture.groups) {
      expect(text, group.permission).toContain(group.permission)
      expect(text, `${group.permission} gates`).toContain(group.gates)
    }
    expect(text).toContain('Off by default')
  })

  it('UNREACHABLE fails the build — the scope table is never built without its catalogue', async () => {
    // Under Next this page degraded the scope table alone and kept the wiring,
    // because a reader met it at request time. A built page is never read at a
    // moment the catalogue is unreachable, and a degraded page would ship as a
    // 200 until the next build (MOTIR-10645): so the read throws and the build
    // stops, naming the artifact.
    stubCatalogue({}, 503)
    await expect(McpPage(EN_PAGE)).rejects.toThrow(
      /could not read the MCP tool catalogue at .*: HTTP 503/,
    )
  })
})

/**
 * A route or client's block: its heading and every sibling after it up to the
 * next heading. The anchor is on the heading itself since the move to a
 * document (MOTIR-8055), where it used to be on a wrapping element.
 */
function sectionOf(container: HTMLElement, id: string) {
  const heading = container.querySelector(`#${id}`)!
  const siblings: Element[] = []
  for (
    let next = heading.nextElementSibling;
    next && !/^H[1-6]$/.test(next.tagName) && !next.querySelector('h1,h2,h3');
    next = next.nextElementSibling
  ) {
    siblings.push(next)
  }
  return {
    heading,
    pre: siblings.map((e) => e.querySelector('pre')).find(Boolean) ?? null,
    button:
      siblings.map((e) => e.querySelector('button')).find(Boolean) ?? null,
    text: [heading, ...siblings].map((e) => e.textContent).join(' '),
  }
}

describe('Add Motir to Claude — the route with no token (MOTIR-7078)', () => {
  it('every Claude route interpolates the origin, and none carries a header or token', () => {
    const routes = claudeRoutes(mcpTransportFacts(SENTINEL))
    expect(routes.map((route) => route.id)).toEqual([
      'claude-ai',
      'claude-desktop',
      'claude-code',
    ])
    for (const route of routes) {
      expect(route.code, route.id).toContain(`${SENTINEL}${MCP_ENDPOINT_PATH}`)
      expect(route.code, route.id).not.toContain(MCP_AUTH_HEADER)
      expect(route.code, route.id).not.toContain(MCP_TOKEN_PLACEHOLDER)
      expect(route.docsUrl, route.id).toMatch(/^https:\/\//)
      expect(route.checkedOn, route.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
    expect(routes.find((route) => route.id === 'claude-code')!.code).toBe(
      `claude mcp add --transport http motir ${SENTINEL}${MCP_ENDPOINT_PATH}`,
    )
  })

  it('renders the three clients INSIDE the first section, before the token route', async () => {
    stubCatalogue(catalogueFixture)
    const { container } = render(await McpPage(EN_PAGE))
    const first = container.querySelector('h2')!
    const tokenRoute = container.querySelector('#token-route')!
    expect(first.textContent).toBe('Add Motir to Claude')
    const labels: Record<string, string> = {
      'claude-ai': 'claude.ai',
      'claude-desktop': 'Claude desktop app',
      'claude-code': 'Claude Code',
    }
    for (const route of claudeRoutes()) {
      const block = sectionOf(container, route.id)
      // Between the first H2 and the token route, in document order.
      expect(
        first.compareDocumentPosition(block.heading) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        route.id,
      ).toBeTruthy()
      expect(
        block.heading.compareDocumentPosition(tokenRoute) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        route.id,
      ).toBeTruthy()
      expect(block.heading.textContent, route.id).toBe(labels[route.id])
      expect(block.text, route.id).toContain(
        `${APP_ORIGIN}${MCP_ENDPOINT_PATH}`,
      )
    }
  })

  // MOTIR-7178: the claude.ai step names the OAuth client option the
  // production proof (MOTIR-7177, 2026-10-02) chose — Use Claude's published
  // identity, marked Detected — and no longer the DCR one. The desktop and
  // Claude Code routes were not re-checked, so their wording and date stand
  // and nothing says how Claude Code identifies itself.
  it('tells claude.ai users to choose Claude’s published identity, and only them', async () => {
    stubCatalogue(catalogueFixture)
    const { container } = render(await McpPage(EN_PAGE))
    const [claudeAi, desktop, claudeCode] = claudeRoutes()
    const step = sectionOf(container, 'claude-ai').text
    expect(step).toContain(
      'Under OAuth client, choose Use Claude’s published identity',
    )
    expect(step).toContain('claude.ai marks it Detected')
    expect(step).toContain('Leave the OAuth client ID and secret empty')
    expect(step).not.toMatch(/Register\s+automatically/)
    expect(claudeAi!.checkedOn).toBe(CLAUDE_AI_ROUTE_CHECKED_ON)
    for (const route of [desktop!, claudeCode!]) {
      expect(sectionOf(container, route.id).text, route.id).not.toMatch(
        /published identity|Register\s+automatically|verified/i,
      )
      expect(route.checkedOn, route.id).toBe(CLAUDE_ROUTES_CHECKED_ON)
    }
  })

  it('says claude.ai shows as a verified domain, and a self-registered client as Unverified', async () => {
    stubCatalogue(catalogueFixture)
    const { container } = render(await McpPage(EN_PAGE))
    const consent = sectionOf(container, 'consent').text
    expect(consent).toContain(
      'shows claude.ai as a verified domain on the sign-in page and in Connected apps',
    )
    expect(consent).toContain(
      'Any other MCP client that registers itself reads Unverified',
    )
    expect(container.textContent).not.toMatch(/Register\s+automatically/)
  })

  it('prints the Claude Code command with a copy control', async () => {
    stubCatalogue(catalogueFixture)
    const { container } = render(await McpPage(EN_PAGE))
    const block = sectionOf(container, 'claude-code')
    expect(block.pre!.textContent).toBe(
      `claude mcp add --transport http motir ${APP_ORIGIN}${MCP_ENDPOINT_PATH}`,
    )
    expect(block.button?.getAttribute('aria-label')).toBe(
      'Copy the Claude Code command',
    )
  })

  it('says what is approved, that Claude asks before a write, and where to revoke', async () => {
    stubCatalogue(catalogueFixture)
    const { container } = render(await McpPage(EN_PAGE))
    const text = container.textContent ?? ''
    expect(text).toContain('pick one workspace')
    expect(text).toContain(
      'Claude asks before it uses a tool that changes anything',
    )
    expect(text).toContain('Settings → Account → Tokens')
    expect(container.querySelector('a[href="/docs/mcp/tools"]')).not.toBeNull()
    expect(container.querySelector('a[href="/docs/skills"]')).not.toBeNull()
    const revoke = container.querySelector(
      `a[href="${APP_ORIGIN}${CONNECTED_APPS_PATH}"]`,
    )
    expect(revoke?.textContent).toBe('Connected apps')
  })
})
