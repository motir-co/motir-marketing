import { englishOnlyRoot } from '@/tests/helpers/englishOnlyDocs'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import ApiPage from '@/app/[locale]/docs/api/ApiReferenceRoute'
import CliPage from '@/app/[locale]/docs/(guides)/cli/CliRoute'
import { render } from '@/tests/helpers/withCopy'
import { resolveAsync } from '@/tests/helpers/resolveAsync'
import { LOCALES, type Locale } from '@/i18n/routing'
import { englishCopy, getCopy } from '@/lib/copy'
import { listOperations, operationAnchorId } from '@/lib/docs'
import { readLedger } from '@/lib/docsDocuments'
import { SPEC } from './fixtures/apiMoveCases'

/*
 * MOTIR-8049 — the generated-reference note on /docs/api and /docs/cli, and the
 * `lang="en"` on the generated descriptions (design panels A, B, E, G).
 *
 * `resolveDocsDocument` is pointed at a temporary tree where de / fr / ja have a
 * CURRENT translation (the repository ships none yet), or a STALE one (panel E).
 */
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

const CATALOGUE = {
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

let current: string
let stale: string

function tree(kind: 'current' | 'stale'): string {
  const root = mkdtempSync(join(tmpdir(), `note-${kind}-`))
  for (const slug of ['api', 'cli']) {
    const dir = join(root, slug)
    mkdirSync(dir, { recursive: true })
    cpSync(join('content/docs', slug, 'en.md'), join(dir, 'en.md'))
    const ledger = readLedger(slug)
    const revisions =
      kind === 'stale'
        ? [...ledger, { revision: 'ffffffffffff', recordedAt: '2026-10-10' }]
        : ledger
    writeFileSync(join(dir, 'revisions.json'), JSON.stringify(revisions))
    const body = readFileSync(join('content/docs', slug, 'en.md'), 'utf8')
    for (const locale of ['de', 'fr', 'ja']) {
      writeFileSync(
        join(dir, `${locale}.md`),
        `---\nsource: ${ledger[ledger.length - 1]!.revision}\n---\n\n${body}`,
      )
    }
  }
  return root
}

beforeAll(() => {
  current = tree('current')
  stale = tree('stale')
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.DOCS_FIXTURE
})

const page = (locale: Locale) => ({ params: Promise.resolve({ locale }) })

function stubJson(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })),
  )
}

async function renderApi(locale: Locale, root: string) {
  process.env.DOCS_FIXTURE = root
  stubJson(SPEC)
  const ui = (await resolveAsync(await ApiPage(page(locale)))) as never
  return render(ui).container
}

async function renderCli(locale: Locale, root: string) {
  process.env.DOCS_FIXTURE = root
  stubJson(CATALOGUE)
  const ui = (await resolveAsync(await CliPage(page(locale)))) as never
  return render(ui).container
}

const notes = (c: HTMLElement) => [...c.querySelectorAll('[role="note"]')]

describe('/docs/api in German, over a current translation (panel A)', () => {
  it('shows the German note once, before the first operation', async () => {
    const c = await renderApi('de', current)
    const copy = await getCopy('de')
    const found = notes(c)
    expect(found).toHaveLength(1)
    expect(found[0]!.textContent).toBe(
      copy.docs.notes.generatedReference.openapi,
    )
    expect(found[0]!.hasAttribute('lang')).toBe(false)
    const firstOperation = c.querySelector('section[id]')!
    expect(
      found[0]!.compareDocumentPosition(firstOperation) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('marks every generated description lang="en", and no catalogue label', async () => {
    const c = await renderApi('de', current)
    const section = c.querySelector('section[id]')!
    const marked = [...section.querySelectorAll('[lang="en"]')].map(
      (el) => `${el.tagName}:${el.textContent}`,
    )
    for (const text of [
      'H2:Create a thing',
      'P:The operation the snapshot renders.',
      'P:The thing to create.',
      'TD:The path parameter.',
      'TD:Required, and a closed enum.',
      'TD:Optional.',
      'TD:The created thing.',
      'TD:The body did not validate.',
      'TD:Through a ref.',
    ]) {
      expect(marked, text).toContain(text)
    }
    for (const el of c.querySelectorAll('[lang="en"]')) {
      // Never a wrapper, a heading label or a table heading.
      expect(['H2', 'P', 'TD']).toContain(el.tagName)
      expect(el.closest('h3, th')).toBeNull()
    }
    const labels = [...c.querySelectorAll('h3, th')]
    expect(labels.length).toBeGreaterThan(0)
    expect(labels.every((el) => el.getAttribute('lang') === null)).toBe(true)
  })

  it('keeps every operation anchor equal to the English render', async () => {
    const english = await renderApi('en', current)
    const german = await renderApi('de', current)
    const ids = (c: HTMLElement) =>
      [...c.querySelectorAll('section[id]')].map((el) => el.id)
    expect(ids(german)).toEqual(ids(english))
    expect(ids(german)).toEqual(
      listOperations(SPEC as never).map(operationAnchorId),
    )
  })
})

describe('/docs/cli in French and Japanese (panel B)', () => {
  it('fr: the French note, before the commands, and lang="en" on every description', async () => {
    const c = await renderCli('fr', current)
    const copy = await getCopy('fr')
    const found = notes(c)
    expect(found).toHaveLength(1)
    expect(found[0]!.textContent).toBe(copy.docs.notes.generatedReference.cli)
    expect(
      found[0]!.compareDocumentPosition(c.querySelector('li')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    const marked = [...c.querySelectorAll('[lang="en"]')].map(
      (el) => `${el.tagName}:${el.textContent}`,
    )
    expect(marked).toEqual([
      'P:Generated, so it stays English.',
      'DD:Stop after n items.',
    ])
    const li = c.querySelector('li')!
    expect(li.querySelector('code')!.hasAttribute('lang')).toBe(false)
    expect(li.querySelector('dt')!.hasAttribute('lang')).toBe(false)
  })

  it('ja: the Japanese note', async () => {
    const c = await renderCli('ja', current)
    const copy = await getCopy('ja')
    expect(notes(c).map((n) => n.textContent)).toEqual([
      copy.docs.notes.generatedReference.cli,
    ])
  })

  it('invocation and flags read the same as English', async () => {
    const text = (c: HTMLElement) =>
      [...c.querySelectorAll('li code, li dt')].map((el) => el.textContent)
    expect(text(await renderCli('fr', current))).toEqual(
      text(await renderCli('en', current)),
    )
  })
})

describe('English (panel G)', () => {
  it('shows no note and adds no lang attribute on either page', async () => {
    const api = await renderApi('en', current)
    const cli = await renderCli('en', current)
    for (const c of [api, cli]) {
      expect(notes(c)).toHaveLength(0)
      expect(c.querySelector('[lang]')).toBeNull()
    }
  })
})

describe('a stale page (panel E)', () => {
  it('api in German: only the being-updated note shows', async () => {
    const c = await renderApi('de', stale)
    const copy = await getCopy('de')
    expect(notes(c).map((n) => n.textContent)).toEqual([
      copy.docs.notes.beingUpdated,
    ])
  })

  it('cli in French: only the being-updated note shows', async () => {
    const c = await renderCli('fr', stale)
    const copy = await getCopy('fr')
    expect(notes(c).map((n) => n.textContent)).toEqual([
      copy.docs.notes.beingUpdated,
    ])
  })

  it('a locale with no translation is the same fallback', async () => {
    const c = await renderApi('de', englishOnlyRoot())
    expect(notes(c)).toHaveLength(1)
    expect(notes(c)[0]!.textContent).toBe(
      (await getCopy('de')).docs.notes.beingUpdated,
    )
  })

  it('the shipped German translation is current: the reference note shows and the being-updated note does not', async () => {
    const c = await renderApi('de', 'content/docs')
    expect(notes(c)).toHaveLength(1)
    expect(notes(c)[0]!.textContent).toBe(
      (await getCopy('de')).docs.notes.generatedReference.openapi,
    )
  })
})

describe('the catalogue', () => {
  it('has both wordings in every locale, naming Motir', async () => {
    for (const locale of LOCALES) {
      const copy = locale === 'en' ? englishCopy : await getCopy(locale)
      const { openapi, cli } = copy.docs.notes.generatedReference
      expect(openapi.length, locale).toBeGreaterThan(20)
      expect(openapi, locale).toContain('Motir')
      expect(cli, locale).toContain('motir')
    }
  })
})
