import {
  cpSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { render } from '@/tests/helpers/withCopy'
import { resolveAsync } from '@/tests/helpers/resolveAsync'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CliPage from '@/app/[locale]/docs/(guides)/cli/page'
import PublicAddressPage from '@/app/[locale]/docs/(guides)/public-address/page'
import { documentInvariants, readLedger } from '@/lib/docsDocuments'
import { DOCS_CATALOGUE_ONLY_ROUTES, DOCS_ROUTES } from '@/lib/docsSurfaces'
import { EN_PAGE } from '@/tests/helpers/locale'

/*
 * MOTIR-8035 — /docs/cli and /docs/public-address render from their documents.
 *
 * Proved here: the anchors, the document shape (slots, parts, no code block, no
 * catalogue URL), and — the one that matters for a translation — that a page
 * rendered from a CURRENT German document contains no English from `en.md`, so
 * no sentence is still typed in the TSX. The text-parity evidence against the
 * pre-move pages was captured by hand (the pages no longer hold the old text).
 */

// A `de.md` fixture tree: `resolveDocsDocument` is pointed at it when a test asks.
vi.mock('@/lib/docsDocuments', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/docsDocuments')>()
  const { englishOnlyRoot } = await import('@/tests/helpers/englishOnlyDocs')
  const englishOnly = englishOnlyRoot()
  return {
    ...real,
    resolveDocsDocument: (slug: string, locale: never, root?: string) =>
      real.resolveDocsDocument(
        slug,
        locale,
        root ?? process.env.DOCS_FIXTURE ?? englishOnly,
      ),
  }
})

const catalogue = {
  packageName: '@zq/cli-fixture',
  packageVersion: '9.9.9',
  installCommand: 'npm install -g @zq/cli-fixture',
  nodeRequirement: '>=22',
  defaultServer: 'https://zq-fixture.test',
  commandCount: 1,
  commands: [
    {
      path: 'zqrun',
      signature: '<zqscope>',
      invocation: 'motir zqrun <zqscope>',
      description: 'Generated, so it stays English.',
      helpGroup: 'WORK LOOP COMMANDS:',
      options: [{ flags: '--zq-max <n>', description: 'Stop after n items.' }],
    },
  ],
}

function stubFetch(status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(catalogue), { status })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.DOCS_FIXTURE
})

const read = (slug: string) =>
  readFileSync(join('content/docs', slug, 'en.md'), 'utf8')

async function renderPage(slug: 'cli' | 'public-address', page = EN_PAGE) {
  stubFetch()
  const Page = slug === 'cli' ? CliPage : PublicAddressPage
  const ui = (await resolveAsync(await Page(page))) as never
  return render(ui).container
}

describe('the anchors are explicit, and the rendered ids are exactly them', () => {
  const EXPECTED = {
    cli: [
      'install',
      'authenticate',
      'commands',
      'where-motir-keeps-things',
      'where-a-run-executes',
    ],
    'public-address': [
      'your-motir-address',
      'your-workspace-name',
      'your-own-domain',
      'add-the-domain',
      'the-records-you-create',
      'what-each-status-means',
      'what-your-domain-serves',
      'two-domains-on-one-workspace',
      'removing-a-domain',
      'if-something-is-not-working',
    ],
  } as const

  for (const slug of ['cli', 'public-address'] as const) {
    it(`${slug}: {#id} in the document, the same id on the heading`, async () => {
      expect(documentInvariants(read(slug)).anchors).toEqual(EXPECTED[slug])
      const container = await renderPage(slug)
      // The generated command groups' own headings sit in <section>, not the document.
      const ids = [...container.querySelectorAll('h2, h3')]
        .filter((heading) => !heading.closest('section'))
        .map((heading) => heading.getAttribute('id'))
      expect(ids).toEqual([...EXPECTED[slug]])
    })
  }
})

describe('the documents hold prose only', () => {
  it('has no fenced code block, in either document', () => {
    for (const slug of ['cli', 'public-address']) {
      expect(read(slug), slug).not.toMatch(/^ {0,3}(```|~~~)/m)
    }
  })

  it('cli/en.md carries no URL, so nothing the catalogue carries is restated', () => {
    expect(read('cli')).not.toMatch(/https?:\/\//)
    expect(read('cli')).not.toContain('npm install')
  })

  it('the cli document’s slots, values and parts are the page’s contract', () => {
    const inv = documentInvariants(read('cli'))
    expect(inv.slots).toEqual([
      'install',
      'authenticate',
      'link-and-check',
      'commands',
    ])
    expect(inv.parts).toEqual(['meta', 'reference', 'unreachable'])
    expect([...new Set(inv.values)].sort()).toEqual(
      [
        'apiPage',
        'cliReferenceUrl',
        'commandCount',
        'defaultServer',
        'mcpPage',
        'nodeRequirement',
        'packageName',
        'packageVersion',
        'sandboxPage',
      ].sort(),
    )
  })

  it('public-address has no slot, no value and no part: every word is the document’s', () => {
    expect(documentInvariants(read('public-address'))).toMatchObject({
      slots: [],
      values: [],
      parts: [],
    })
  })

  it('the translator note above the statuses table is never rendered', async () => {
    const container = await renderPage('public-address')
    expect(container.textContent).not.toContain('Translator')
    expect(read('public-address')).toMatch(/^\[\/\/\]: # "Translator:.*label/m)
  })
})

describe('the default server renders in the page’s own <code>, outside the prose', () => {
  it('is a code element carrying the catalogue value', async () => {
    const container = await renderPage('cli')
    const codes = [...container.querySelectorAll('p code')].filter(
      (code) => code.textContent === catalogue.defaultServer,
    )
    expect(codes).toHaveLength(1)
  })

  it('the files list: path in code, the tag in bold, the explanation as prose', async () => {
    const container = await renderPage('cli')
    const items = [...container.querySelectorAll('li')].filter((li) =>
      li.querySelector('strong'),
    )
    expect(items.map((li) => li.querySelector('code')?.textContent)).toEqual([
      '~/.config/motir/config.json',
      '.motir.json',
      '~/.local/state/motir/session-excludes.json',
    ])
    expect(items.map((li) => li.querySelector('strong')?.textContent)).toEqual([
      '— secret, never commit',
      '— no secret, safe to commit',
      '— no secret',
    ])
  })
})

describe('the fetch-failure branch renders the introduction and the unreachable part', () => {
  it('says so, in the document’s words, with no catalogue value on the page', async () => {
    stubFetch(503)
    const container = render(
      (await resolveAsync(await CliPage(EN_PAGE))) as never,
    ).container
    const text = container.textContent ?? ''
    expect(text).toContain('The Motir CLI talks to')
    expect(text).toContain('The work item is the system of record')
    expect(text).not.toContain('The card is the system of record')
    expect(text).toContain('temporarily unreachable')
    expect(text).not.toContain('Install')
    expect(text).not.toContain('@zq/cli-fixture')
  })
})

describe('/docs is catalogue-only', () => {
  it('is the one route without a document, and it is a real route', () => {
    expect(DOCS_CATALOGUE_ONLY_ROUTES).toEqual(['/docs'])
    expect(DOCS_ROUTES).toContain('/docs')
  })
})

describe('NO ENGLISH SENTENCE LIVES IN THE TSX — a current German document shows none of en.md', () => {
  /** Keep the structure, swap every word of prose for a marker. */
  function germanise(english: string, source: string): string {
    const KEEP =
      /(\{\{[^}]+\}\}|`[^`]*`|\]\([^)]*\)|\{#[^}]+\}|\*+|^\s*[-*>]\s|^\[\/\/\]:.*$)/
    const body = english
      .split('\n')
      .map((line) =>
        line
          .split(KEEP)
          .map((piece, index) =>
            index % 2 === 1
              ? piece
              : piece.replace(/[A-Za-z][A-Za-z'’-]*/g, 'zqwort'),
          )
          .join(''),
      )
      .join('\n')
    return `---\nsource: ${source}\n---\n\n${body}`
  }

  /** Every run of four consecutive words of en.md’s prose, lower-cased. */
  function windows(markdown: string): string[] {
    const words = markdown
      .replace(/\{\{[^}]+\}\}/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/\]\([^)]*\)/g, ' ')
      .replace(/^\[\/\/\]:.*$/gm, ' ')
      .toLowerCase()
      .match(/[a-z]+(?:['’-][a-z]+)*/g) as string[]
    return words
      .slice(3)
      .map((_, index) => words.slice(index, index + 4).join(' '))
  }

  for (const slug of ['cli', 'public-address'] as const) {
    it(`${slug}`, async () => {
      const root = mkdtempSync(join(tmpdir(), 'docs-de-'))
      cpSync(join('content/docs', slug), join(root, slug), { recursive: true })
      const ledger = readLedger(slug)
      writeFileSync(
        join(root, slug, 'de.md'),
        germanise(read(slug), ledger[ledger.length - 1]!.revision),
      )
      mkdirSync(root, { recursive: true })
      process.env.DOCS_FIXTURE = root

      const container = await renderPage(slug, {
        params: Promise.resolve({ locale: 'de' }),
      } as never)
      // The document, not the fallback: no "being updated" note and no English
      // wrapper. /docs/cli alone carries the generated-reference note (MOTIR-8049)
      // and `lang="en"` on exactly its generated descriptions.
      const notes = [...container.querySelectorAll('[role="note"]')]
      expect(notes).toHaveLength(slug === 'cli' ? 1 : 0)
      const english = [...container.querySelectorAll('[lang="en"]')]
      expect(english.map((el) => el.tagName)).toEqual(
        slug === 'cli' ? ['P', 'DD'] : [],
      )
      expect(container.textContent).toContain('zqwort')

      // A copy payload is a command, and is English by design.
      for (const pre of container.querySelectorAll('pre')) pre.remove()
      const rendered = (container.textContent ?? '')
        .toLowerCase()
        .replace(/[^a-z'’\s-]+/g, ' ')
        .replace(/\s+/g, ' ')
      const leaked = windows(read(slug)).filter((run) => rendered.includes(run))
      expect(leaked, 'English from en.md survived a German render').toEqual([])
    })
  }
})
