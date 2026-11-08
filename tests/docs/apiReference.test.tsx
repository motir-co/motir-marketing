import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '@/tests/helpers/withCopy'
import { EN_PAGE } from '@/tests/helpers/locale'
import { resolveAsync } from '@/tests/helpers/resolveAsync'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ApiReferencePage from '@/app/[locale]/docs/api/ApiReferenceRoute'
import {
  describeSchema,
  exampleRequest,
  listOperations,
  resolveSchemaRefs,
  schemaTypeLabel,
  type OpenApiDocument,
  type OpenApiSchema,
} from '@/lib/docs'

/*
 * THE FETCH-VERSUS-RENDER GUARD (MOTIR-4391) — the assertion whose ABSENCE is
 * why MOTIR-4375 shipped.
 *
 * ⚠️ READ THIS BEFORE WEAKENING ANYTHING BELOW. `/docs/api` fetched a 720 KB
 * OpenAPI document on every request and rendered `method`, `path` and `summary`
 * — about 2% of what it had in hand — across 49 operations. Every existing
 * check was GREEN and stayed green: the routes were present, every page
 * answered `200` on the right host, the sitemap and the index links
 * corresponded 9/9/9, and `tests/docs/docs.test.ts` asserted that the fetch URL
 * is the published artifact and that no spec is committed.
 *
 * Every one of those verifies that the page FETCHES the document. Not one of
 * them asserts that it RENDERS any of it. That is the entire gap, and this file
 * is the assertion that closes it: it renders the real page over a fixture whose
 * property names appear NOWHERE ELSE IN THIS REPOSITORY, and fails when they do
 * not reach the output. A page that fetched and discarded could not pass it,
 * because there is no other place those strings could come from.
 *
 * ── Why invented tokens rather than the real document's names ───────────────
 * A guard asserting `requestBody` or `kind` appears in the HTML could be
 * satisfied by a heading this repository types, or by a word in a paragraph. A
 * token that exists only inside the fixture makes the provenance the assertion:
 * if it is on the page, it came off the wire. The last `describe` proves the
 * tokens really are unique to this file, so the guard cannot quietly stop
 * meaning that.
 *
 * ── And it is DRIVEN, not trusted ──────────────────────────────────────────
 * The predicate runs against the shape the page rendered BEFORE this card — a
 * method, a path and a summary — and must report every token missing. A guard
 * proved only to pass is a comment.
 */

/**
 * Strings that exist in this file and nowhere else in the repository. They are
 * deliberately not words — a real English word could appear in copy.
 */
const FIXTURE_ONLY = {
  bodyProperty: 'zqPangolinCadence',
  requiredProperty: 'zqQuorumSemaphore',
  parameter: 'zqZeppelinTint',
  enumMember: 'zqMarmalade',
  componentProperty: 'zqTrellisOffset',
  arrayProperty: 'zqLanternSet',
  nullableProperty: 'zqHalyardDepth',
} as const

const FIXTURE_TOKENS = Object.values(FIXTURE_ONLY)

const fixture: OpenApiDocument = {
  openapi: '3.1.0',
  info: { title: 'Motir API', version: '9.9.9' },
  components: {
    schemas: {
      ZqThing: {
        type: 'object',
        properties: {
          [FIXTURE_ONLY.componentProperty]: {
            type: 'integer',
            // ⚠️ The word is spelled out rather than written as the symbol:
            // the guard below asserts no pointer string reaches the reader, and
            // a fixture DESCRIPTION containing one would fail it for the one
            // reason that is not a defect.
            description: 'A component property, reachable only through a ref.',
          },
        },
      },
    },
  },
  paths: {
    '/api/v1/zq/{zqZeppelinTint}/things': {
      post: {
        operationId: 'createZqThing',
        summary: 'Create a thing',
        description: 'The operation the guard renders.',
        'x-motir-permission': 'thing:edit',
        parameters: [
          {
            name: FIXTURE_ONLY.parameter,
            in: 'path',
            required: true,
            description: 'The path parameter.',
            schema: { type: 'string', minLength: 1 },
          },
        ],
        requestBody: {
          required: true,
          description: 'The thing to create.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: [FIXTURE_ONLY.requiredProperty],
                properties: {
                  [FIXTURE_ONLY.requiredProperty]: {
                    type: 'string',
                    enum: [FIXTURE_ONLY.enumMember, 'other'],
                    description: 'Required, and a closed enum.',
                  },
                  [FIXTURE_ONLY.bodyProperty]: {
                    type: 'string',
                    description: 'Optional.',
                  },
                  [FIXTURE_ONLY.nullableProperty]: {
                    anyOf: [{ type: 'number' }, { type: 'null' }],
                    description:
                      'Nullable — an `anyOf` a flattened list loses.',
                  },
                  [FIXTURE_ONLY.arrayProperty]: {
                    type: 'array',
                    items: { type: 'string' },
                    description:
                      'A list — an item schema a flattened list loses.',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'The created thing.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ZqThing' },
              },
            },
          },
          '422': { description: 'The body did not validate.' },
        },
      },
    },
  },
}

/** THE PREDICATE, so the counterfactual drives the same code the guard runs. */
function missingFromRender(html: string, tokens: readonly string[]): string[] {
  return tokens.filter((token) => !html.includes(token))
}

function stubSpecFetch(document: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(document), { status: 200 })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the API reference RENDERS the document it fetches', () => {
  it('puts every fixture-only property on the page — the guard', async () => {
    stubSpecFetch(fixture)
    const { container } = render(
      (await resolveAsync(await ApiReferencePage(EN_PAGE))) as never,
    )
    expect(
      missingFromRender(container.innerHTML, FIXTURE_TOKENS),
      'the page fetched the document and did not render it',
    ).toEqual([])
  })

  it('the predicate FIRES on the shape the page rendered BEFORE this card', () => {
    // `METHOD /path — summary`, which is exactly what shipped. Not one token
    // survives it, which is the failure this guard exists to catch.
    const summaryOnly =
      '<div>POST /api/v1/zq/{zqZeppelinTint}/things Create a thing</div>'
    // The path parameter appears in the PATH, so it survives even the old
    // rendering — which is precisely why the guard needs more than one token.
    const bodyTokens = FIXTURE_TOKENS.filter(
      (token) => token !== FIXTURE_ONLY.parameter,
    )
    expect(missingFromRender(summaryOnly, bodyTokens)).toEqual(bodyTokens)
  })

  it('marks required and optional properties, not just their names', async () => {
    stubSpecFetch(fixture)
    const { container } = render(
      (await resolveAsync(await ApiReferencePage(EN_PAGE))) as never,
    )
    const html = container.innerHTML
    // The row order is name → required-ness, so the required property's marker
    // follows it before the next property begins.
    const requiredRow = html.slice(html.indexOf(FIXTURE_ONLY.requiredProperty))
    expect(requiredRow.slice(0, 400)).toContain('required')
    const optionalRow = html.slice(html.indexOf(FIXTURE_ONLY.bodyProperty))
    expect(optionalRow.slice(0, 400)).toContain('optional')
  })

  it('renders the response STATUS set and the permission', async () => {
    stubSpecFetch(fixture)
    const { container } = render(
      (await resolveAsync(await ApiReferencePage(EN_PAGE))) as never,
    )
    expect(container.innerHTML).toContain('201')
    expect(container.innerHTML).toContain('422')
    expect(container.innerHTML).toContain('thing:edit')
  })

  it('renders a copyable example carrying the REQUIRED field and not the optional one', async () => {
    stubSpecFetch(fixture)
    const { container } = render(
      (await resolveAsync(await ApiReferencePage(EN_PAGE))) as never,
    )
    const pre = container.querySelector('pre')
    expect(pre?.textContent).toContain('curl -X POST')
    expect(pre?.textContent).toContain(FIXTURE_ONLY.requiredProperty)
    // An example that sends everything teaches a reader nothing about what the
    // call NEEDS.
    expect(pre?.textContent).not.toContain(FIXTURE_ONLY.bodyProperty)
  })

  it('resolves every `$ref` — no pointer string reaches the reader', async () => {
    stubSpecFetch(fixture)
    const { container } = render(
      (await resolveAsync(await ApiReferencePage(EN_PAGE))) as never,
    )
    expect(container.innerHTML).not.toContain('$ref')
    expect(container.innerHTML).not.toContain('#/components/schemas')
    // …and the thing behind the pointer is actually there.
    expect(container.innerHTML).toContain(FIXTURE_ONLY.componentProperty)
  })

  it('fails the build rather than falling back when the document is unreachable', async () => {
    // MOTIR-10645: no built page carries an "unreachable" paragraph as a 200.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 503 })),
    )
    await expect(ApiReferencePage(EN_PAGE)).rejects.toThrow(
      /could not read the OpenAPI spec at .*\/api\/openapi\/v1\.json: HTTP 503/,
    )
  })
})

describe('listOperations carries the detail, not just the head', () => {
  it('reads parameters, the body, the responses and the permission', () => {
    const [operation] = listOperations(fixture)
    expect(operation).toBeDefined()
    expect(operation!.method).toBe('POST')
    expect(operation!.permission).toBe('thing:edit')
    expect(operation!.parameters.map((p) => p.name)).toEqual([
      FIXTURE_ONLY.parameter,
    ])
    expect(operation!.parameters[0]!.required).toBe(true)
    expect(operation!.requestBody?.mediaType).toBe('application/json')
    expect(operation!.responses.map((r) => r.status)).toEqual(['201', '422'])
  })

  it('an operation with no body, no parameters and no responses is still legal', () => {
    const bare: OpenApiDocument = {
      openapi: '3.1.0',
      info: { title: 'x', version: '1' },
      paths: { '/api/x': { get: { summary: 'only get' } } },
    }
    const [operation] = listOperations(bare)
    expect(operation!.parameters).toEqual([])
    expect(operation!.requestBody).toBeUndefined()
    expect(operation!.responses).toEqual([])
  })
})

describe('resolveSchemaRefs', () => {
  const components: Record<string, OpenApiSchema> = {
    Leaf: { type: 'object', properties: { a: { type: 'string' } } },
    Branch: {
      type: 'object',
      properties: { leaf: { $ref: '#/components/schemas/Leaf' } },
    },
    Loop: {
      type: 'object',
      properties: { self: { $ref: '#/components/schemas/Loop' } },
    },
  }

  it('follows a ref through MORE than one level', () => {
    // Today no component in the served document contains a `$ref`, so one level
    // would be total — and a renderer written to that measurement breaks
    // silently the first time motir-core factors a shared sub-schema out.
    const resolved = resolveSchemaRefs(
      { $ref: '#/components/schemas/Branch' },
      components,
    )
    const leaf = resolved.properties?.leaf
    expect(leaf?.properties?.a?.type).toBe('string')
  })

  it('TERMINATES on a self-referential component instead of looping', () => {
    const resolved = resolveSchemaRefs(
      { $ref: '#/components/schemas/Loop' },
      components,
    )
    expect(resolved.properties?.self?.type).toBe('Loop')
  })

  it('reports an unresolvable pointer as its own name rather than dropping it', () => {
    const resolved = resolveSchemaRefs(
      { $ref: '#/components/schemas/Absent' },
      components,
    )
    expect(resolved.type).toBe('Absent')
  })

  it('leaves a description that merely QUOTES a pointer alone', () => {
    // Structural, not textual: only the VALUE of a `$ref` key is followed.
    const resolved = resolveSchemaRefs(
      { type: 'string', description: 'see #/components/schemas/Leaf' },
      components,
    )
    expect(resolved.description).toBe('see #/components/schemas/Leaf')
  })
})

describe('schemaTypeLabel and describeSchema read the shape a flattened list loses', () => {
  it('a nullable union reads as `number | null`', () => {
    expect(
      schemaTypeLabel({ anyOf: [{ type: 'number' }, { type: 'null' }] }),
    ).toBe('number | null')
  })

  it('an array reads as its item type', () => {
    expect(schemaTypeLabel({ type: 'array', items: { type: 'string' } })).toBe(
      'string[]',
    )
  })

  it('a format is carried, so `string (date-time)` is not just `string`', () => {
    expect(schemaTypeLabel({ type: 'string', format: 'date-time' })).toBe(
      'string (date-time)',
    )
  })

  it('an unknown node is reported as unknown, never as a guess', () => {
    expect(schemaTypeLabel(undefined)).toBe('unknown')
    expect(schemaTypeLabel({})).toBe('unknown')
  })

  it('describeSchema marks required-ness and surfaces enum members', () => {
    const fields = describeSchema(
      listOperations(fixture)[0]!.requestBody!.schema,
    )
    const required = fields.find(
      (f) => f.name === FIXTURE_ONLY.requiredProperty,
    )
    expect(required?.required).toBe(true)
    expect(required?.enumValues).toEqual([FIXTURE_ONLY.enumMember, 'other'])
    expect(
      fields.find((f) => f.name === FIXTURE_ONLY.bodyProperty)?.required,
    ).toBe(false)
    expect(
      fields.find((f) => f.name === FIXTURE_ONLY.arrayProperty)?.type,
    ).toBe('string[]')
  })

  it('describeSchema returns nothing for a schema with no named properties', () => {
    // An empty table would say "this takes no fields", which is a different and
    // false statement from "this is not an object".
    expect(describeSchema({ type: 'string' })).toEqual([])
    expect(describeSchema(undefined)).toEqual([])
  })
})

describe('exampleRequest', () => {
  it('builds a runnable curl carrying the bearer header and the required body', () => {
    const example = exampleRequest(
      listOperations(fixture)[0]!,
      'https://app.example.test',
    )
    expect(example).toContain(
      "curl -X POST 'https://app.example.test/api/v1/zq/",
    )
    expect(example).toContain('Authorization: Bearer $MOTIR_TOKEN')
    expect(example).toContain('Content-Type: application/json')
    // An enum member is a better placeholder than `<name>` — it is a value the
    // call actually accepts.
    expect(example).toContain(FIXTURE_ONLY.enumMember)
  })

  it('omits the body block entirely for an operation that takes none', () => {
    const bare: OpenApiDocument = {
      openapi: '3.1.0',
      info: { title: 'x', version: '1' },
      paths: { '/api/x': { get: { summary: 'read' } } },
    }
    const example = exampleRequest(listOperations(bare)[0]!, 'https://x.test')
    expect(example).not.toContain('-d ')
    expect(example).not.toContain('Content-Type')
  })
})

describe('the fixture tokens really are unique to this file', () => {
  /** Every source file the site is built from. */
  function sourceFiles(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) sourceFiles(path, out)
      else if (/\.(tsx?|json|css|md)$/.test(path)) out.push(path)
    }
    return out
  }

  it('no token appears in app/, lib/ or messages/ — so a match on the page came off the wire', () => {
    // This is what makes the guard above MEAN something. If a token were ever
    // typed into the source, the guard would keep passing while the page went
    // back to rendering nothing.
    const files = [
      ...sourceFiles('app'),
      ...sourceFiles('lib'),
      ...sourceFiles('messages'),
    ]
    const offenders: string[] = []
    for (const file of files) {
      const contents = readFileSync(file, 'utf8')
      for (const token of FIXTURE_TOKENS) {
        if (contents.includes(token)) offenders.push(`${file}: ${token}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
