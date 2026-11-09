import { APP_ORIGIN } from '@/lib/appOrigin'

/**
 * WIRING A CLIENT TO THE MCP SERVER, AS DATA (MOTIR-4429).
 *
 * ── What was lost, and why it is coming back here ───────────────────────────
 * `motir-core` at `95a2d4468^` served this from `lib/apiDocs/mcp.ts` +
 * `app/(public)/docs/mcp/page.tsx` — a fork table, three numbered steps, five
 * ready-to-paste client blocks and a scope legend. The move to motir.co kept
 * the route and shipped two sentences: `mcpServers` appeared ZERO times across
 * all nine `/docs` pages, and `claude mcp add` zero times. A reader was told
 * the endpoint exists and given no way to reach it, on the page the whole
 * sub-area is named after. MOTIR-4397's parity ledger measured it; this is the
 * restore.
 *
 * ── EVERY BLOCK INTERPOLATES THE FACTS. Nothing here hard-codes a URL ───────
 * {@link mcpTransportFacts} resolves the four facts a client needs — the URL,
 * the transport, the header and the token shape — and every config below is
 * built from them. That is what makes the negative test meaningful: build the
 * blocks with a SENTINEL origin and assert every one carries it, and a block
 * that typed `https://app.motir.co` fails rather than passing by coincidence.
 * The origin comes from `PUBLIC_MOTIR_APP_ORIGIN` (`lib/appOrigin.ts`), so
 * a preview build documents the preview it is part of.
 *
 * ── WHY THE PATH IS A LITERAL HERE, and what checks it ──────────────────────
 * `/api/mcp` is a stable public route, and this repository already hard-codes
 * the three sibling public paths it consumes — `/api/openapi/v1.json`,
 * `/api/docs/mcp-tools.json`, `/api/docs/cli-commands.json` — with
 * `tests/docs/docs.test.ts` asserting each literal is present rather than
 * fetched from somewhere. This follows that established shape. The durable
 * cross-repository check is `tests/seam/mcpEndpointSeam.test.ts`, which holds
 * this constant against the `endpoint` motir-core's own published catalogue
 * declares — in the seam lane, because a check that reaches app.motir.co may
 * not run on every pull request (`vitest.seam.config.mts`).
 *
 * ── ⚠️ WHY THE CLIENT BLOCKS LIVE IN A MODULE AND NOT IN THE PAGE ───────────
 * `tests/docs/docs.test.ts`'s tool-name detector scans
 * `app/docs/(guides)/mcp/page.tsx` for a lowercase underscore-joined identifier
 * — the shape every Motir MCP tool name has — because this repository cannot
 * check a tool name it types. Two VENDOR config keys have that same shape
 * (`mcp_servers` and `bearer_token_env_var`, both Codex CLI's TOML), so a page
 * that typed them would trip a guard that is right for a reason unrelated to
 * them. They are the vendor's spelling of its own file format, not a claim
 * about Motir's surface, and they belong beside the other four vendors'
 * spellings rather than inside the page. The guard stays literal, the page
 * stays clean, and this comment is the record of why.
 *
 * ── What is OURS and what is the VENDOR'S ───────────────────────────────────
 * Motir owns exactly the four transport facts. Everything else in a block —
 * the file path, the key names, the nesting, the secret mechanism — is that
 * vendor's, transcribed from that vendor's own documentation on
 * {@link MCP_CLIENT_FORMATS_CHECKED_ON}. So a stale block is wrong about a
 * vendor's syntax and never about Motir, which is why each one carries the
 * vendor's docs link and the date it was read.
 */

/** The served path. See the block comment above for why it is a literal. */
export const MCP_ENDPOINT_PATH = '/api/mcp'

/** The header every request carries; the scheme is separate so blocks compose it. */
export const MCP_AUTH_HEADER = 'Authorization'
export const MCP_AUTH_SCHEME = 'Bearer'

/**
 * The bearer PLACEHOLDER, not a plausible-looking fake. A realistic token in
 * published documentation gets pasted verbatim and then debugged as an auth
 * problem; an obvious placeholder cannot.
 */
export const MCP_TOKEN_PLACEHOLDER = 'motir_pat_<your-token>'

/**
 * The environment variable the two vendors that can read a secret out of the
 * environment are pointed at. One name, so a reader who wires two clients sets
 * one variable.
 */
export const MCP_TOKEN_ENV_VAR = 'MOTIR_TOKEN'

/** The four facts, resolved. Passed into every block so none hard-codes them. */
export interface McpTransportFacts {
  origin: string
  path: string
  url: string
  authHeader: string
  authScheme: string
  tokenPlaceholder: string
  tokenEnvVar: string
}

/**
 * The shipped facts. `origin` is overridable so a test can prove a block
 * INTERPOLATES it rather than reproducing a string somebody expected.
 */
export function mcpTransportFacts(
  origin: string = APP_ORIGIN,
): McpTransportFacts {
  return {
    origin,
    path: MCP_ENDPOINT_PATH,
    url: `${origin}${MCP_ENDPOINT_PATH}`,
    authHeader: MCP_AUTH_HEADER,
    authScheme: MCP_AUTH_SCHEME,
    tokenPlaceholder: MCP_TOKEN_PLACEHOLDER,
    tokenEnvVar: MCP_TOKEN_ENV_VAR,
  }
}

/**
 * One client's wiring block: code, paths, URLs and a date, and no sentence
 * (MOTIR-8055). The client's name, the note on its secret and the words of its
 * caption are prose and live in `content/docs/mcp/<locale>.md`; the page joins
 * them to this by `id`.
 */
export interface McpClient {
  /** Stable id — the section anchor's suffix and the key the page joins prose to. */
  id: string
  /**
   * Where the snippet goes — a path, the first half of the code pane's caption.
   * `null` for the generic block, whose caption is a sentence in the catalogue.
   */
  file: string | null
  /** The snippet, built by interpolating {@link McpTransportFacts}. */
  config: string
  /** That vendor's own MCP documentation — the authority when a block is stale. */
  docsUrl: string
  /** When the FORMAT was last read from `docsUrl`. */
  checkedOn: string
}

/**
 * The key Codex CLI's TOML reads the secret from. It is the VENDOR's spelling,
 * and it has the shape of a tool name (see the block above), so it is exported
 * here for the page to hand a document as a value rather than typed in prose.
 */
export const MCP_CODEX_TOKEN_KEY = 'bearer_token_env_var'

/**
 * The date the vendor formats below were read from their own documentation.
 * ONE constant, because they were checked in one pass and a per-client date
 * that nobody updates is worse than an honest shared one.
 */
export const MCP_CLIENT_FORMATS_CHECKED_ON = '2026-09-04'

/**
 * Every client block. **No entry hard-codes the endpoint, the header or the
 * token shape** — each interpolates `facts`, which is what
 * `tests/docs/mcpWiring.test.ts`'s sentinel-origin case is able to prove.
 *
 * Where a vendor supports reading the secret from somewhere else, the block
 * uses it. A guide whose first instruction is "paste a live credential into a
 * file your repository tracks" has taught the wrong habit in the first five
 * minutes.
 */
export function mcpClients(
  facts: McpTransportFacts = mcpTransportFacts(),
): McpClient[] {
  const bearer = `${facts.authScheme} ${facts.tokenPlaceholder}`
  return [
    {
      id: 'claude-code',
      file: '.mcp.json',
      config: [
        '{',
        '  "mcpServers": {',
        '    "motir": {',
        '      "type": "http",',
        `      "url": "${facts.url}",`,
        `      "headers": { "${facts.authHeader}": "${bearer}" }`,
        '    }',
        '  }',
        '}',
      ].join('\n'),
      docsUrl: 'https://docs.claude.com/en/docs/claude-code/mcp',
      checkedOn: MCP_CLIENT_FORMATS_CHECKED_ON,
    },
    {
      id: 'cursor',
      file: '~/.cursor/mcp.json',
      config: [
        '{',
        '  "mcpServers": {',
        '    "motir": {',
        `      "url": "${facts.url}",`,
        `      "headers": { "${facts.authHeader}": "${facts.authScheme} \${env:${facts.tokenEnvVar}}" }`,
        '    }',
        '  }',
        '}',
      ].join('\n'),
      docsUrl: 'https://cursor.com/docs/context/mcp',
      checkedOn: MCP_CLIENT_FORMATS_CHECKED_ON,
    },
    {
      id: 'vscode',
      file: '.vscode/mcp.json',
      config: [
        '{',
        '  "inputs": [',
        '    {',
        '      "type": "promptString",',
        '      "id": "motir-token",',
        '      "description": "Motir personal access token",',
        '      "password": true',
        '    }',
        '  ],',
        '  "servers": {',
        '    "motir": {',
        '      "type": "http",',
        `      "url": "${facts.url}",`,
        `      "headers": { "${facts.authHeader}": "${facts.authScheme} \${input:motir-token}" }`,
        '    }',
        '  }',
        '}',
      ].join('\n'),
      docsUrl:
        'https://code.visualstudio.com/docs/agents/reference/mcp-configuration',
      checkedOn: MCP_CLIENT_FORMATS_CHECKED_ON,
    },
    {
      id: 'codex',
      file: '~/.codex/config.toml',
      config: [
        '[mcp_servers.motir]',
        `url = "${facts.url}"`,
        `${MCP_CODEX_TOKEN_KEY} = "${facts.tokenEnvVar}"`,
      ].join('\n'),
      docsUrl: 'https://developers.openai.com/codex/mcp',
      checkedOn: MCP_CLIENT_FORMATS_CHECKED_ON,
    },
    {
      id: 'other',
      file: null,
      config: [
        'Transport:  streamable HTTP',
        `URL:        ${facts.url}`,
        `Header:     ${facts.authHeader}: ${bearer}`,
      ].join('\n'),
      docsUrl:
        'https://modelcontextprotocol.io/docs/develop/connect-local-servers',
      checkedOn: MCP_CLIENT_FORMATS_CHECKED_ON,
    },
  ]
}

/**
 * ADDING MOTIR TO CLAUDE, OVER OAUTH (MOTIR-7078).
 *
 * The route that needs no token: the person adds the server URL to a Claude
 * client, signs in on app.motir.co, picks ONE workspace and approves what the
 * client may do. Motir's half is the URL alone, interpolated from the same
 * facts as every block above. Everything else in a step is ANTHROPIC'S UI or
 * CLI, transcribed from its own documentation on {@link CLAUDE_ROUTES_CHECKED_ON}
 * and checked against `claude mcp add --help` (Claude Code 2.1.286), so each
 * route carries the page it was read from — that page is the authority when a
 * menu moves.
 */
export const CLAUDE_ROUTES_CHECKED_ON = '2026-10-01'

/**
 * The claude.ai route's own check date (MOTIR-7178). Its OAuth client step was
 * re-read on this date against Anthropic's page, which now lists Use Claude's
 * published identity (CIMD) as the recommended option, and against the
 * production proof (MOTIR-7177, 2026-10-02): a real claude.ai connector chose
 * that option, marked Detected, and Motir's consent screen named claude.ai a
 * verified domain. The desktop and Claude Code routes were not re-checked, so
 * they keep {@link CLAUDE_ROUTES_CHECKED_ON}.
 */
export const CLAUDE_AI_ROUTE_CHECKED_ON = '2026-10-02'

/** The Account → Tokens page, where the Connected apps card lists and revokes grants. */
export const CONNECTED_APPS_PATH = '/settings/account/tokens#connected-apps'

/**
 * One Claude client's route to the connector: what to paste or run, Anthropic's
 * page and the date it was read — and no sentence (MOTIR-8055). The steps, the
 * note, the client's name and the pane's caption and copy label are prose, in
 * `content/docs/mcp/<locale>.md` and the catalogue.
 */
export interface ClaudeRoute {
  /** Stable id — the section anchor and the key the page joins prose to. */
  id: string
  /** What to paste or run — always built from the facts. */
  code: string
  /** Anthropic's page the steps were read from. */
  docsUrl: string
  checkedOn: string
}

export function claudeRoutes(
  facts: McpTransportFacts = mcpTransportFacts(),
): ClaudeRoute[] {
  return [
    {
      id: 'claude-ai',
      code: facts.url,
      docsUrl:
        'https://claude.com/docs/connectors/custom/remote-mcp#choose-authentication-settings',
      checkedOn: CLAUDE_AI_ROUTE_CHECKED_ON,
    },
    {
      id: 'claude-desktop',
      code: facts.url,
      docsUrl: 'https://claude.com/docs/connectors/overview',
      checkedOn: CLAUDE_ROUTES_CHECKED_ON,
    },
    {
      id: 'claude-code',
      code: `claude mcp add --transport http motir ${facts.url}`,
      docsUrl: 'https://code.claude.com/docs/en/mcp',
      checkedOn: CLAUDE_ROUTES_CHECKED_ON,
    },
  ]
}

/**
 * The one-command form of the Claude Code CLIENT block, header and all — the
 * token route's twin of the headerless command in {@link claudeRoutes}.
 */
export function mcpClaudeCodeTokenCommand(
  facts: McpTransportFacts = mcpTransportFacts(),
): string {
  return `claude mcp add --transport http motir ${facts.url} --header "${facts.authHeader}: ${facts.authScheme} ${facts.tokenPlaceholder}"`
}

/** How a reader verifies the connection, once the config is in place. */
export function mcpVerifyCommand(
  facts: McpTransportFacts = mcpTransportFacts(),
): string {
  return [
    `curl -sS -X POST ${facts.url} \\`,
    `  -H "${facts.authHeader}: ${facts.authScheme} $${facts.tokenEnvVar}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -H "Accept: application/json, text/event-stream" \\`,
    `  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`,
  ].join('\n')
}

/** motir-core's own MCP reference — the authority beyond this page. */
export const MCP_REFERENCE_URL =
  'https://github.com/motir-co/motir-core/blob/main/docs/mcp.md'
