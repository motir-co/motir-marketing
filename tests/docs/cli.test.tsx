import { readdirSync, readFileSync } from 'node:fs'
import { render } from '@/tests/helpers/withCopy'
import { EN_PAGE } from '@/tests/helpers/locale'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CliPage from '@/app/[locale]/docs/(guides)/cli/CliRoute'
import { groupCliCommands, parseCliCommands } from '@/lib/docs'

/*
 * THE FETCH-VERSUS-RENDER GUARD, THIRD INSTANCE (MOTIR-4395) — over the CLI
 * command catalogue.
 *
 * The page was five sentences of positioning: no install line, no
 * authentication, no command list, no flags. Three `<code>` elements and ZERO
 * `<pre>` blocks. The card is explicit that a page with zero after it is not
 * done, so that is asserted rather than assumed.
 *
 * ⚠️ AND THE OTHER HALF OF THE CARD IS A NEGATIVE: the page must contain no
 * hard-coded server URL of its own, because the catalogue carries it and a
 * second copy could disagree with the binary a reader installed. A positive
 * assertion that the URL appears would pass on a typed one; the negative is
 * what makes "read from the catalogue" checkable.
 */

const catalogue = {
  packageName: '@zq/cli-fixture',
  packageVersion: '9.9.9',
  installCommand: 'npm install -g @zq/cli-fixture',
  nodeRequirement: '>=22',
  defaultServer: 'https://zq-fixture.test',
  commandCount: 3,
  commands: [
    {
      path: 'zqlogin',
      signature: '',
      invocation: 'motir zqlogin',
      description: 'Connect this terminal.',
      helpGroup: 'SETUP COMMANDS:',
      options: [
        { flags: '--zq-server <url>', description: 'Server base URL.' },
        { flags: '--no-zq-browser', description: 'Do not launch a browser.' },
      ],
    },
    {
      path: 'zqlogin sub',
      signature: '',
      invocation: 'motir zqlogin sub',
      description: 'A subcommand, which commander gives no group of its own.',
      helpGroup: null,
      options: [],
    },
    {
      path: 'zqrun',
      signature: '<zqscope>',
      invocation: 'motir zqrun <zqscope>',
      description: 'Run a scope.',
      helpGroup: 'WORK LOOP COMMANDS:',
      options: [{ flags: '--zq-max <n>', description: 'Stop after n items.' }],
    },
  ],
}

/** Strings that exist in this fixture and nowhere in the repository. */
const FIXTURE_TOKENS = [
  'motir zqrun <zqscope>',
  '--zq-max <n>',
  '@zq/cli-fixture',
  'https://zq-fixture.test',
]

function stubCliFetch(document: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(document), { status })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

/** THE PREDICATE, so the counterfactual drives the code the guard runs. */
function missingFromRender(html: string, tokens: readonly string[]): string[] {
  return tokens.filter((token) => !html.includes(token))
}

describe('the CLI page is GENERATED from the catalogue it fetches', () => {
  it('puts every fixture-only command, flag and version on the page — the guard', async () => {
    stubCliFetch(catalogue)
    const { container } = render(await CliPage(EN_PAGE))
    expect(
      missingFromRender(container.textContent ?? '', FIXTURE_TOKENS),
      'the page fetched the catalogue and did not render it',
    ).toEqual([])
  })

  it('the predicate FIRES on the positioning paragraph that shipped', () => {
    const positioningOnly =
      '<p>The Motir CLI talks to the same MCP server the hosted agents use.</p>'
    expect(missingFromRender(positioningOnly, FIXTURE_TOKENS)).toEqual(
      FIXTURE_TOKENS,
    )
  })

  it('renders EVERY command in the catalogue — a count, not a spot check', async () => {
    stubCliFetch(catalogue)
    const { container } = render(await CliPage(EN_PAGE))
    for (const command of catalogue.commands) {
      expect(container.textContent, command.path).toContain(command.invocation)
    }
    const rendered = container.querySelectorAll('section ul > li').length
    expect(rendered).toBe(catalogue.commands.length)
  })

  it('the INVOCATION carries the argument signature, so a scope is not lost', async () => {
    stubCliFetch(catalogue)
    const { container } = render(await CliPage(EN_PAGE))
    expect(container.textContent).toContain('motir zqrun <zqscope>')
  })

  it('carries install and authentication as <pre> blocks — the page had ZERO', async () => {
    stubCliFetch(catalogue)
    const { container } = render(await CliPage(EN_PAGE))
    const panes = [...container.querySelectorAll('pre')].map(
      (pane) => pane.textContent ?? '',
    )
    expect(panes.length).toBeGreaterThanOrEqual(3)
    expect(panes.join('\n')).toContain('npm install -g @zq/cli-fixture')
    expect(panes.join('\n')).toContain('motir login')
    expect(panes.join('\n')).toContain('https://zq-fixture.test')
  })

  it('groups in the catalogue’s own order, and a SUBCOMMAND joins its parent’s group', async () => {
    // Catalogue order is REGISTRATION order, which is the order `motir help`
    // renders; a subcommand carries no group of its own and a reader looks for
    // it under the command it hangs on.
    const groups = groupCliCommands(parseCliCommands(catalogue))
    expect(groups.map((g) => g.heading)).toEqual([
      'SETUP COMMANDS:',
      'WORK LOOP COMMANDS:',
    ])
    expect(groups[0]!.commands.map((c) => c.path)).toEqual([
      'zqlogin',
      'zqlogin sub',
    ])
  })
})

describe('“Where Motir keeps things” is back (MOTIR-4429)', () => {
  /*
   * The deleted motir-core page carried a `files` section naming the
   * credential store and the project link with the path of each; the restore
   * dropped it, and MOTIR-4397's parity ledger measured that — the new page
   * listed `motir help files` as a COMMAND and named no path at all.
   *
   * ⚠️ IT IS AUTHORED PROSE, and that is a decision rather than an oversight.
   * The published catalogue carries commands, flags, the install line and the
   * default server, and no file path — so there is nothing here to derive it
   * from, and `lib/docs.ts`'s carve-out for authored guide content is what
   * allows it. Read from motir-core `packages/cli/src/help.ts`'s FILES topic,
   * which is what `motir help files` prints from the installed binary.
   */
  it('names all three paths, and which one holds the secret', async () => {
    stubCliFetch(catalogue)
    const { container } = render(await CliPage(EN_PAGE))
    const text = container.textContent ?? ''

    expect(text).toContain('Where Motir keeps things')
    expect(text).toContain('~/.config/motir/config.json')
    expect(text).toContain('.motir.json')
    expect(text).toContain('~/.local/state/motir/session-excludes.json')

    // The distinction the section exists for. A reader who takes only one
    // thing from it must take this one.
    expect(text).toMatch(/secret, never commit/)
    expect(text).toMatch(/no secret, safe to commit/)
  })

  it('names the variable that relocates each relocatable one', async () => {
    // A path with no way to move it is half an answer on a machine whose
    // config directory is somewhere else.
    stubCliFetch(catalogue)
    const { container } = render(await CliPage(EN_PAGE))
    const text = container.textContent ?? ''
    expect(text).toContain('MOTIR_CONFIG_HOME')
    expect(text).toContain('XDG_CONFIG_HOME')
    expect(text).toContain('MOTIR_STATE_HOME')
  })

  it('does not add a command list — the guard above still holds', async () => {
    // Stated here as well as above because this section is the most likely
    // place for one to creep back in: it is prose about the CLI, beside a
    // generated table, written by hand.
    stubCliFetch(catalogue)
    const { container } = render(await CliPage(EN_PAGE))
    expect(container.querySelectorAll('section ul > li').length).toBe(
      catalogue.commands.length,
    )
  })
})

describe('the page keeps NO copy of what the catalogue carries', () => {
  it('contains no hard-coded server URL of its own', () => {
    // The card's own criterion, and it is a NEGATIVE for a reason: a positive
    // assertion that the URL appears on the page would pass on a typed one.
    const source = readFileSync(
      'app/[locale]/docs/(guides)/cli/CliRoute.tsx',
      'utf8',
    )
    expect(source).not.toContain('https://app.motir.co')
    // MOTIR-8035: the prose moved into the page's documents, so the guard reads
    // every one of them as well — a translation could restate the server too.
    for (const file of readdirSync('content/docs/cli').filter((name) =>
      name.endsWith('.md'),
    )) {
      const text = readFileSync(`content/docs/cli/${file}`, 'utf8')
      expect(text, file).not.toContain('https://app.motir.co')
      expect(text, file).not.toMatch(/https?:\/\//)
    }
  })

  it('hand-maintains NO command list — the reference is generated, and only the first-run procedure is typed', () => {
    /*
     * ⚠️ THE BOUNDARY THIS DRAWS, because it is a judgement and not an
     * absolute. The card forbids a hand-maintained command LIST; it does not
     * forbid prose. `lib/docs.ts`'s own carve-out says the guide pages are
     * authored documentation, and a first-run procedure — log in, bind a
     * folder, check the setup — is exactly that: four lines a reader types
     * once, in the order they type them, which a generated table sorted by
     * help group cannot express.
     *
     * So the guard is a CEILING on what may be typed, enumerated here with its
     * reason, rather than a zero. It fires the moment somebody starts adding
     * flags to the page instead of letting the catalogue carry them — which is
     * the drift the card is actually about.
     */
    const source = readFileSync(
      'app/[locale]/docs/(guides)/cli/CliRoute.tsx',
      'utf8',
    )

    // A CSS custom property is not a CLI flag. They are the only other thing in
    // this file spelled with two leading dashes.
    const CSS_TOKEN = /^--(el|font|radius|spacing|height|shadow|color)-/
    const flags = [
      ...new Set(
        (source.match(/--[a-z][a-z-]*/g) ?? []).filter(
          (token) => !CSS_TOKEN.test(token),
        ),
      ),
    ].sort()

    // The three the authenticate block types, each carried BY the catalogue as
    // well — they are shown in a worked order, not enumerated as a reference.
    expect(flags).toEqual(['--help', '--project', '--server', '--token'])

    const AUTHORED = [
      'motir login', // the device flow — the shortest first run
      'motir auth', // …and the token form, for someone who already holds one
      'motir link', // bind a folder to a project
      'motir doctor', // check the setup before the first run
      'motir help', // the fallback when the catalogue is unreachable
    ]
    const invocations = [
      ...new Set(source.match(/motir [a-z]+/g) ?? []),
    ].filter((m) => !AUTHORED.includes(m))
    expect(invocations).toEqual([])
  })

  it('commits no catalogue artifact', () => {
    const source = readFileSync('lib/docs.ts', 'utf8')
    expect(source).toContain('/api/docs/cli-commands.json')
    expect(source).toContain('APP_ORIGIN')
  })
})

describe('unreachable — the build fails, never a stale list', () => {
  it('rejects naming the catalogue, so no page ships without it (MOTIR-10645)', async () => {
    // A built page is never read at a moment the catalogue is unreachable, so
    // the state that used to render an introduction and a route out is now a
    // red build: the paragraph would otherwise ship as a 200 until the next one.
    stubCliFetch({}, 503)
    await expect(CliPage(EN_PAGE)).rejects.toThrow(
      /could not read the CLI command catalogue at .*: HTTP 503/,
    )
  })
})

describe('parseCliCommands throws rather than degrading', () => {
  const mutate = (fn: (doc: Record<string, unknown>) => void) => {
    const doc = JSON.parse(JSON.stringify(catalogue)) as Record<string, unknown>
    fn(doc)
    return doc
  }

  it('reads the document motir-core serves', () => {
    const parsed = parseCliCommands(catalogue)
    expect(parsed.commandCount).toBe(3)
    expect(parsed.commands[2]!.options[0]!.flags).toBe('--zq-max <n>')
  })

  it('counts the ROWS, never the served count', () => {
    // A producer whose `commandCount` disagreed with its own list would put a
    // number on the page that the list beneath it contradicts.
    const lying = mutate((doc) => {
      doc.commandCount = 99
    })
    expect(parseCliCommands(lying).commandCount).toBe(3)
  })

  it('tolerates an EMPTY signature, which is a value and not an absence', () => {
    expect(parseCliCommands(catalogue).commands[0]!.signature).toBe('')
  })

  for (const [what, fn] of [
    ['`commands` is missing', (doc) => delete doc.commands],
    [
      '`commands` is renamed',
      (doc) => {
        doc.commandList = doc.commands
        delete doc.commands
      },
    ],
    [
      '`commands` is empty',
      (doc) => {
        doc.commands = []
      },
    ],
    ['`installCommand` is missing', (doc) => delete doc.installCommand],
    ['`defaultServer` is missing', (doc) => delete doc.defaultServer],
    ['`packageVersion` is missing', (doc) => delete doc.packageVersion],
    [
      'a command has lost its options array',
      (doc) => {
        delete (doc.commands as Record<string, unknown>[])[0]!.options
      },
    ],
    [
      'an option has lost its flags',
      (doc) => {
        delete (
          (doc.commands as Record<string, unknown>[])[0]!.options as Record<
            string,
            unknown
          >[]
        )[0]!.flags
      },
    ],
  ] as [string, (doc: Record<string, unknown>) => void][]) {
    it(`throws when ${what}`, () => {
      expect(() => parseCliCommands(mutate(fn))).toThrow()
    })
  }

  it('throws when the document is not an object at all', () => {
    expect(() => parseCliCommands(undefined)).toThrow()
  })
})
