import { APP_ORIGIN } from '@/lib/appOrigin'
import type { Locale } from '@/i18n/routing'

/**
 * The `/docs` data layer (MOTIR-4046, corrected by MOTIR-4180).
 *
 * The API reference is GENERATED from `motir-core`'s own registry, and it is
 * PUBLISHED as a served, versioned OpenAPI 3.1 document at
 * `/api/openapi/v1.json` — assembled from compile-time declarations, never a
 * hand-maintained file. This repository consumes that published artifact rather
 * than copying a spec that would drift: the build fetches it fresh, so
 * it is always exactly what motir-core serves, and `tests/docs/docs.test.ts`
 * asserts the URL it fetches is the published one and that no spec is committed.
 *
 * THE MCP TOOL REGISTRY IS NOW THE SAME SHAPE (MOTIR-4194 / MOTIR-4195).
 * motir-core publishes the tool catalogue as an anonymous, unversioned
 * documentation artifact at `/api/docs/mcp-tools.json` — derived from the same
 * permission registry that gates the tools, so a tool cannot reach the server
 * undocumented. This module consumes it exactly as it consumes the spec: fetched
 * once per build, parsed through a function a fixture pins, and nothing
 * committed. MOTIR-4180 removed a hand-copied list from this repository because
 * nothing here could check it; what replaced it is not a checked copy but no copy
 * at all.
 *
 * ⚠️ NEITHER READER HAS A FALLBACK, AND THAT IS THE DESIGN. A committed default
 * rendered when the fetch fails is stale exactly when it is displayed and
 * invisible exactly when it is wrong — every guard in this repository runs on the
 * path where the fetch WORKS. Both readers throw instead, and both pages say the
 * artifact is unreachable rather than showing something that looks like an
 * answer.
 *
 * The guide / policy / MCP / CLI / sandbox pages are committed PROSE — authored
 * documentation rather than a registry, which is why they are allowed to live
 * here at all.
 *
 * ⚠️ THE ARTIFACTS ARE READ ONCE PER BUILD (MOTIR-8842, MOTIR-10645). The
 * three artifacts change when motir-core DEPLOYS, not between two page views.
 * Reading them per request cost the site its uptime on 2026-10-16 (a ~4x crawl
 * of `/docs` in eleven locales parsed the 1 MB spec on every hit and both
 * machines died of `JavaScript heap out of memory`). The site is now a static
 * build (`astro build`), so no visitor ever causes a read: each artifact URL is
 * fetched ONCE for the whole build ({@link readArtifactOnce}) and every page
 * and locale that needs it shares that one promise, and a fresh artifact
 * arrives with the next build.
 *
 * ⚠️ AND A FAILED READ FAILS THE BUILD. A page that caught the failure and
 * rendered "unreachable" would bake that paragraph into every locale's HTML
 * and ship it as a 200 until the next build, which is the stale-and-invisible
 * default the no-fallback rule above refuses. So nothing catches it: the read
 * throws {@link DocsArtifactUnavailableError}, naming the artifact and its
 * URL, and the deploy stops on the red build.
 */

/** A published artifact the build could not read: the build stops on it. */
export class DocsArtifactUnavailableError extends Error {
  constructor(
    /** The artifact, in words: `the OpenAPI spec`. */
    readonly artifact: string,
    readonly url: string,
    reason: string,
  ) {
    super(
      `The docs build could not read ${artifact} at ${url}: ${reason}. ` +
        'A docs page is never built without it (lib/docs.ts).',
    )
    this.name = 'DocsArtifactUnavailableError'
  }
}

/*
 * ⚠️ ONE READ PER URL FOR THE LIFE OF THE PROCESS. `astro build` renders every
 * page in one process, so a module-level map is "once per build": the spec once
 * for `/docs/api`, `/docs/api/getting-started` and the API rail in all twelve
 * locales together, which is also what lets the rail's anchors and the page's
 * section ids come from the same bytes. A failed read is kept too, so every
 * page that needs it fails with the same error rather than retrying.
 */
const READS = Symbol.for('motir.docsArtifactReads')
const store = globalThis as typeof globalThis & {
  [READS]?: Map<string, Promise<unknown>>
}
// On `globalThis` under a registered symbol, so the unit suite's setup can
// forget the reads between tests without importing this module first.
const reads = (store[READS] ??= new Map<string, Promise<unknown>>())

/** Fetch `url` once, parse it once, and hand every caller the same promise. */
function readArtifactOnce<T>(
  artifact: string,
  url: string,
  parse: (value: unknown) => T,
): Promise<T> {
  const known = reads.get(url)
  if (known !== undefined) return known as Promise<T>
  const read = (async () => {
    let res: Response
    try {
      res = await fetch(url)
    } catch (error) {
      throw new DocsArtifactUnavailableError(
        artifact,
        url,
        error instanceof Error ? error.message : String(error),
      )
    }
    if (!res.ok) {
      throw new DocsArtifactUnavailableError(
        artifact,
        url,
        `HTTP ${res.status}`,
      )
    }
    return parse(await res.json())
  })()
  reads.set(url, read)
  return read
}

/**
 * Forget every read, so the next call fetches again. A build never calls it;
 * the unit suite clears the same map between tests (`tests/setup.ts`), each of
 * which stubs `fetch` with its own documents.
 */
export function forgetDocsArtifactReads(): void {
  reads.clear()
}

/**
 * One JSON Schema node of the document. Deliberately open: the spec carries
 * `anyOf`, `items`, `enum`, `format`, `minLength` and more, and a closed type
 * here would be a second, narrower declaration of somebody else's schema.
 * {@link schemaTypeLabel} and {@link describeSchema} read the parts a reader
 * needs; the rest is carried, not interpreted.
 */
export interface OpenApiSchema {
  type?: string
  enum?: unknown[]
  anyOf?: OpenApiSchema[]
  oneOf?: OpenApiSchema[]
  allOf?: OpenApiSchema[]
  items?: OpenApiSchema
  properties?: Record<string, OpenApiSchema>
  required?: string[]
  format?: string
  description?: string
  $ref?: string
  [key: string]: unknown
}

/** One operation node, as the document declares it. */
export interface OpenApiOperationNode {
  summary?: string
  description?: string
  operationId?: string
  'x-motir-permission'?: string
  parameters?: {
    name: string
    in: string
    required?: boolean
    description?: string
    schema?: OpenApiSchema
  }[]
  requestBody?: {
    required?: boolean
    description?: string
    content?: Record<string, { schema?: OpenApiSchema }>
  }
  responses?: Record<
    string,
    {
      description?: string
      content?: Record<string, { schema?: OpenApiSchema }>
    }
  >
}

/** The OpenAPI 3.1 document motir-core serves at `/api/openapi/v1.json`. */
export interface OpenApiDocument {
  openapi: string
  info: { title: string; version: string }
  paths: Record<string, Record<string, OpenApiOperationNode>>
  components?: { schemas?: Record<string, OpenApiSchema> } & Record<
    string,
    unknown
  >
}

/** One path or query parameter, as the reference renders it. */
export interface ApiParameter {
  name: string
  location: string
  required: boolean
  description?: string
  schema?: OpenApiSchema
}

/** An operation's request body — one media type, one schema. */
export interface ApiRequestBody {
  mediaType: string
  required: boolean
  description?: string
  schema: OpenApiSchema
}

/** One documented response status. */
export interface ApiResponse {
  status: string
  description?: string
  schema?: OpenApiSchema
}

export interface ApiOperation {
  method: string
  path: string
  operationId?: string
  summary?: string
  description?: string
  /** `x-motir-permission` — the grant a token must carry to call it. */
  permission?: string
  parameters: ApiParameter[]
  requestBody?: ApiRequestBody
  responses: ApiResponse[]
}

const SPEC_URL = `${APP_ORIGIN}/api/openapi/v1.json`

/**
 * Fetch the published spec, once per build. Throws when the artifact is
 * unreachable.
 *
 * ⚠️ SHARED BY THE RAIL AND THE PAGE (MOTIR-4396 · MOTIR-10645). The API
 * sub-area's layout reads it to build the operation tier and the page reads it
 * to render the operations; both get the one promise
 * {@link readArtifactOnce} holds, so they cannot disagree about the document —
 * which is what guarantees the rail's anchors match the page's section ids.
 */
export function fetchOpenApiSpec(): Promise<OpenApiDocument> {
  return readArtifactOnce(
    'the OpenAPI spec',
    SPEC_URL,
    (value) => value as OpenApiDocument,
  )
}

// ── `$ref` resolution ───────────────────────────────────────────────────────
//
// A 720 KB OpenAPI 3.1 document is mostly `components`: 353 `$ref`s over 32
// distinct component schemas on `v1.24.0`. A renderer that prints
// `$ref: '#/components/schemas/WorkItemDetail'` has rendered NOTHING — it has
// shown the reader the name of the answer.
//
// ⚠️ THE DEPTH HANDLED IS **UNBOUNDED**, not "one level", and the difference is
// a guard rather than a claim. Today no component schema contains a `$ref` of
// its own, so one level would in fact be total — and a renderer written to that
// measurement breaks silently the first time motir-core factors a shared
// sub-schema out. So the walk recurses, and carries a `seen` set: a component
// that refers to itself (a tree node, a nested link group) resolves to its own
// name rather than looping. `tests/docs/docs.test.ts` asserts BOTH — that no
// `$ref` survives into a rendered page, and that a self-referential fixture
// terminates.

/** The component name a `#/components/schemas/X` pointer names, or null. */
function refName(ref: string): string | null {
  const match = /^#\/components\/schemas\/(.+)$/.exec(ref)
  return match ? (match[1] ?? null) : null
}

/**
 * Replace every `$ref` in a schema tree with the component it names.
 *
 * Structural rather than textual: only the VALUE of a `$ref` key is followed, so
 * a description that happens to quote one is left alone.
 */
export function resolveSchemaRefs(
  node: OpenApiSchema,
  components: Record<string, OpenApiSchema>,
  seen: readonly string[] = [],
): OpenApiSchema {
  if (typeof node.$ref === 'string') {
    const name = refName(node.$ref)
    // An unresolvable pointer, and a cycle, are both reported AS the component's
    // name rather than followed. The reader is told what it is; the renderer
    // does not hang.
    if (!name || seen.includes(name)) {
      return { type: name ?? node.$ref, description: node.description }
    }
    const target = components[name]
    if (!target) return { type: name, description: node.description }
    return {
      ...resolveSchemaRefs(target, components, [...seen, name]),
      title: name,
    }
  }

  const out: OpenApiSchema = {}
  for (const [key, value] of Object.entries(node)) {
    if (key === 'properties' && value && typeof value === 'object') {
      out.properties = Object.fromEntries(
        Object.entries(value as Record<string, OpenApiSchema>).map(
          ([property, schema]) => [
            property,
            resolveSchemaRefs(schema, components, seen),
          ],
        ),
      )
    } else if (
      (key === 'anyOf' || key === 'oneOf' || key === 'allOf') &&
      Array.isArray(value)
    ) {
      out[key] = (value as OpenApiSchema[]).map((arm) =>
        resolveSchemaRefs(arm, components, seen),
      )
    } else if (key === 'items' && value && typeof value === 'object') {
      out.items = resolveSchemaRefs(value as OpenApiSchema, components, seen)
    } else {
      out[key] = value
    }
  }
  return out
}

/** The FIRST media type an operation declares — `application/json`, in practice. */
function firstContent(
  content: Record<string, { schema?: OpenApiSchema }> | undefined,
): { mediaType: string; schema?: OpenApiSchema } | null {
  const [entry] = Object.entries(content ?? {})
  if (!entry) return null
  return { mediaType: entry[0], schema: entry[1].schema }
}

/**
 * Flatten the spec's paths into an ordered operation list — WITH the detail
 * (MOTIR-4391).
 *
 * The operation carries its parameters, its request body and its responses,
 * every `$ref` already resolved, so the page renders a value rather than
 * re-walking the document. Before this card it carried `method`, `path` and
 * `summary`, and the page rendered exactly those three fields out of a document
 * that answers `what do I send?` on every one of its operations.
 */
export function listOperations(spec: OpenApiDocument): ApiOperation[] {
  const methods = ['get', 'post', 'patch', 'put', 'delete'] as const
  const components = spec.components?.schemas ?? {}
  const resolve = (schema: OpenApiSchema) =>
    resolveSchemaRefs(schema, components)
  const out: ApiOperation[] = []

  for (const [path, byMethod] of Object.entries(spec.paths)) {
    for (const method of methods) {
      const op = byMethod[method]
      if (!op) continue

      const body = firstContent(op.requestBody?.content)
      out.push({
        method: method.toUpperCase(),
        path,
        operationId: op.operationId,
        summary: op.summary,
        description: op.description,
        permission: op['x-motir-permission'],
        parameters: (op.parameters ?? []).map((parameter) => ({
          name: parameter.name,
          location: parameter.in,
          required: parameter.required === true,
          description: parameter.description,
          schema: parameter.schema ? resolve(parameter.schema) : undefined,
        })),
        requestBody:
          body && body.schema
            ? {
                mediaType: body.mediaType,
                required: op.requestBody?.required === true,
                description: op.requestBody?.description,
                schema: resolve(body.schema),
              }
            : undefined,
        responses: Object.entries(op.responses ?? {})
          .map(([status, response]) => {
            const content = firstContent(response.content)
            return {
              status,
              description: response.description,
              schema:
                content && content.schema ? resolve(content.schema) : undefined,
            }
          })
          .sort((a, b) => a.status.localeCompare(b.status)),
      })
    }
  }
  return out.sort(
    (a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method),
  )
}

// ── Reading a schema, for a reader ──────────────────────────────────────────

/** One row of a rendered schema table. */
export interface SchemaField {
  name: string
  type: string
  required: boolean
  description?: string
  enumValues?: string[]
}

/** Is this arm the `{ "type": "null" }` half of a nullable `anyOf`? */
function isNullArm(schema: OpenApiSchema): boolean {
  return schema.type === 'null'
}

/**
 * A human type for one schema node: `string`, `integer`, `string | null`,
 * `string[]`, the component's own name, or the arms of a union.
 *
 * It reads the schema rather than guessing from the property name, which is why
 * `storyPoints` says `number | null` and `targetRepos` says `string[]` — both
 * facts a flattened `type` field would have lost.
 */
export function schemaTypeLabel(schema: OpenApiSchema | undefined): string {
  if (!schema) return 'unknown'
  const union = schema.anyOf ?? schema.oneOf
  if (union && union.length > 0) {
    const arms = union.map(schemaTypeLabel)
    // The nullable case reads better as `string | null` than as a union of two,
    // and it is the overwhelmingly common one in this document.
    return [...new Set(arms)].join(' | ')
  }
  if (schema.allOf && schema.allOf.length > 0) {
    return schema.allOf.map(schemaTypeLabel).join(' & ')
  }
  if (schema.type === 'array') {
    return `${schemaTypeLabel(schema.items)}[]`
  }
  if (typeof schema.title === 'string' && schema.type === 'object') {
    return schema.title
  }
  if (schema.type)
    return schema.format ? `${schema.type} (${schema.format})` : schema.type
  if (schema.properties) return 'object'
  return 'unknown'
}

/** Enum members anywhere in a node — including inside a nullable union arm. */
function enumMembers(schema: OpenApiSchema): string[] | undefined {
  if (Array.isArray(schema.enum)) return schema.enum.map(String)
  for (const arm of schema.anyOf ?? schema.oneOf ?? []) {
    if (!isNullArm(arm) && Array.isArray(arm.enum)) return arm.enum.map(String)
  }
  return undefined
}

/**
 * An object schema's properties, as rows a table can render: the name, the
 * type, whether it is REQUIRED, its description and its enum members.
 *
 * An empty list means the schema is not an object with named properties — a
 * bare array or a scalar — and the caller renders the type instead.
 */
export function describeSchema(
  schema: OpenApiSchema | undefined,
): SchemaField[] {
  if (!schema) return []
  const target = schema.properties
    ? schema
    : (schema.anyOf ?? schema.oneOf ?? []).find((arm) => arm.properties)
  if (!target?.properties) return []
  const required = new Set(target.required ?? [])
  return Object.entries(target.properties).map(([name, property]) => ({
    name,
    type: schemaTypeLabel(property),
    required: required.has(name),
    description:
      typeof property.description === 'string'
        ? property.description
        : undefined,
    enumValues: enumMembers(property),
  }))
}

/**
 * A copyable request for one operation.
 *
 * Built from the operation itself: its method, its path with each path parameter
 * left as its own `{name}` so a reader sees what to substitute, the bearer
 * header every `/api/v1` call needs, and — where there is a body — a JSON object
 * carrying exactly the REQUIRED properties, each with a placeholder of its own
 * type. Optional fields are deliberately absent: an example that sends
 * everything teaches a reader nothing about what the call needs.
 */
export function exampleRequest(
  operation: ApiOperation,
  origin: string,
): string {
  const lines = [`curl -X ${operation.method} '${origin}${operation.path}' \\`]
  lines.push(`  -H 'Authorization: Bearer $MOTIR_TOKEN'`)

  const fields = describeSchema(operation.requestBody?.schema).filter(
    (field) => field.required,
  )
  if (operation.requestBody) {
    lines[lines.length - 1] += ' \\'
    lines.push(`  -H 'Content-Type: ${operation.requestBody.mediaType}' \\`)
    const body = Object.fromEntries(
      fields.map((field) => [field.name, placeholderFor(field)]),
    )
    lines.push(`  -d '${JSON.stringify(body)}'`)
  }
  return lines.join('\n')
}

/** A placeholder value of the field's own type, for the example body. */
function placeholderFor(field: SchemaField): unknown {
  if (field.enumValues && field.enumValues.length > 0)
    return field.enumValues[0]
  if (field.type.endsWith('[]')) return []
  if (field.type.startsWith('number') || field.type.startsWith('integer'))
    return 0
  if (field.type.startsWith('boolean')) return true
  return `<${field.name}>`
}

// ── The MCP tool catalogue (MOTIR-4195) ─────────────────────────────────────
//
// `GET /api/docs/mcp-tools.json` on the app origin — motir-core's
// `lib/apiDocs/mcp.ts`, served by `app/api/docs/mcp-tools.json/route.ts`. Every
// field below is DERIVED over there: the group order is the permission catalog's
// own, a tool's group is the permission that gates it, and the count is computed
// from the rows. Nothing about the tool set is authored in this repository.
//
// ⚠️ WHAT THE PRODUCER PROMISES, AND WHAT IT DOES NOT. It is unversioned on
// purpose: a consumer may rely on the path and on the field names, and must
// tolerate the tool set, the summaries, the labels, the group membership and the
// count changing without notice — and must tolerate NEW fields appearing. So the
// parse below validates the fields this page renders and ignores every other,
// which is what lets motir-core add one without turning this page red.

/** One tool row of the published catalogue. */
export interface McpToolEntry {
  name: string
  permission: string
  summary: string
  /**
   * The language `summary` is written in, as served: the requested locale or
   * `'en'` (MOTIR-8050). Absent on an unlocalized document and on an older
   * server — read it through `catalogueTextLocale`, never directly.
   */
  summaryLocale?: string
  /**
   * The tool's ARGUMENTS — the draft-07 JSON Schema `tools/list` serves for it,
   * as motir-core publishes it (MOTIR-4389 / MOTIR-4394).
   *
   * ⚠️ OPTIONAL, AND DELIBERATELY SO. It is a field the producer ADDED, and the
   * two repositories deploy independently: a consumer that required it would go
   * red on every request between this page shipping and motir-core's deploy
   * landing — turning a documentation improvement into an outage on the merge
   * ORDER, which nobody controls. The parse tolerates its absence and the page
   * SAYS the arguments are not published rather than implying a tool takes
   * none. That is the boundary-contract rule: the consumer is written so either
   * merge order is safe.
   *
   * `undefined` and `{ properties: {} }` are DIFFERENT answers and the page
   * renders them differently — "not published by this Motir version" versus
   * "takes no arguments".
   */
  inputSchema?: OpenApiSchema
  /**
   * The tool's human TITLE — e.g. "Dispatch prompt" — as motir-core publishes
   * it since MOTIR-7002. OPTIONAL for the same reason as `inputSchema`: an older
   * or self-hosted Motir does not serve it, and then the row shows the name
   * alone, exactly as before.
   */
  title?: string
  /**
   * The tool's MCP behaviour HINTS (`ToolAnnotations`, MCP 2025-06-18), as
   * motir-core publishes them since MOTIR-7002. OPTIONAL — absent is its own
   * state ("this Motir version does not publish …"), never read as read-only.
   * All four are kept; the page renders only the two a reader acts on
   * (`toolHint`).
   */
  annotations?: McpToolAnnotations
}

/** The four MCP tool-annotation hints, each optional on the wire. */
export interface McpToolAnnotations {
  readOnlyHint?: boolean
  destructiveHint?: boolean
  idempotentHint?: boolean
  openWorldHint?: boolean
}

/**
 * What a row's chip says, from its annotations — the mapping the design delta
 * `design/docs/docs--mcp-tool-hints.mock.html` (MOTIR-7077) draws.
 *
 *   · `readOnlyHint: true`               → reads (`destructiveHint` is ignored:
 *                                           MCP gives it no meaning on a read)
 *   · `destructiveHint: true`            → destructive
 *   · annotations present, neither       → writes — INCLUDING a write that does
 *                                           not set `destructiveHint`, though the
 *                                           spec's default is `true`: the chip
 *                                           states what Motir PUBLISHED, and
 *                                           Motir sets it on every write
 *   · annotations absent                 → unpublished — never "reads", which
 *                                           would be the dangerous wrong answer
 */
export type McpToolHint = 'reads' | 'writes' | 'destructive' | 'unpublished'

export function toolHint(
  entry: Pick<McpToolEntry, 'annotations'>,
): McpToolHint {
  const annotations = entry.annotations
  if (!annotations) return 'unpublished'
  if (annotations.readOnlyHint === true) return 'reads'
  if (annotations.destructiveHint === true) return 'destructive'
  return 'writes'
}

const ANNOTATION_KEYS = [
  'readOnlyHint',
  'destructiveHint',
  'idempotentHint',
  'openWorldHint',
] as const

/** One group — a permission, and the tools it gates. */
export interface McpToolGroup {
  permission: string
  label: string
  gates: string
  grantedByDefault: boolean
  /** The language `label` and `gates` are written in, as served (they fall back together). */
  textLocale?: string
  tools: McpToolEntry[]
}

/** The published catalogue document. */
export interface McpToolCatalogue {
  endpoint: string
  toolCount: number
  groups: McpToolGroup[]
  /** The locale the document was served in; absent on an unlocalized document. */
  locale?: string
}

const CATALOGUE_URL = `${APP_ORIGIN}/api/docs/mcp-tools.json`

/** Thrown when the served document is not the shape this page renders. */
export class McpToolCatalogueShapeError extends Error {
  override readonly name = 'McpToolCatalogueShapeError'

  constructor(what: string) {
    super(
      `the published MCP tool catalogue at ${CATALOGUE_URL} ${what}. ` +
        `This page renders that document and keeps no copy of it, so a shape ` +
        `it cannot read is an error rather than an empty list.`,
    )
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Read a tool row's `annotations`. Absent ⇒ `undefined`. Present but not an
 * object, or a known hint that is present but not a boolean ⇒ the SHAPE ERROR.
 *
 * ⚠️ STRICTER THAN `inputSchema`, on purpose (MOTIR-7080). A malformed schema
 * read as absent costs a reader an argument table; a malformed hint read as
 * absent or — worse — as `false` could put a "Writes" chip on a destructive
 * tool, or no warning where one belongs. A field that decides whether a write
 * is shown as safe is shape contract, so a wrong type fails loudly.
 */
function readAnnotations(
  entry: Record<string, unknown>,
  at: string,
): McpToolAnnotations | undefined {
  const raw = entry.annotations
  if (raw === undefined) return undefined
  if (!isRecord(raw)) {
    throw new McpToolCatalogueShapeError(
      `has a ${at}.annotations that is not an object`,
    )
  }
  const annotations: McpToolAnnotations = {}
  for (const key of ANNOTATION_KEYS) {
    const value = raw[key]
    if (value === undefined) continue
    if (typeof value !== 'boolean') {
      throw new McpToolCatalogueShapeError(
        `has a ${at}.annotations.${key} that is not a boolean`,
      )
    }
    annotations[key] = value
  }
  return annotations
}

/** Read a tool row's `title`. Absent ⇒ `undefined`; not a string ⇒ the shape error. */
function readTitle(
  entry: Record<string, unknown>,
  at: string,
): string | undefined {
  const raw = entry.title
  if (raw === undefined) return undefined
  if (typeof raw !== 'string') {
    throw new McpToolCatalogueShapeError(
      `has a ${at}.title that is not a string`,
    )
  }
  return raw === '' ? undefined : raw
}

/**
 * Read a locale marker (`locale` / `textLocale` / `summaryLocale`). Absent ⇒
 * `undefined`; present but not a non-empty string ⇒ the shape error. These decide
 * which language a region is marked as, so they are shape contract (the same
 * reasoning as `readAnnotations`), while an older server simply omits them.
 */
function readLocaleField(
  holder: Record<string, unknown>,
  key: string,
  where: string,
): string | undefined {
  const raw = holder[key]
  if (raw === undefined) return undefined
  if (typeof raw !== 'string' || raw === '') {
    throw new McpToolCatalogueShapeError(
      `has a ${where}.${key} that is not a non-empty string`,
    )
  }
  return raw
}

function requireString(
  holder: Record<string, unknown>,
  key: string,
  where: string,
): string {
  const value = holder[key]
  if (typeof value !== 'string' || value === '') {
    throw new McpToolCatalogueShapeError(`is missing ${where}.${key}`)
  }
  return value
}

/** `{ [key]: value }` when defined, `{}` when not — so an absent field stays absent. */
function optionalField<K extends string, V>(
  key: K,
  value: V | undefined,
): Partial<Record<K, V>> {
  return value === undefined ? {} : ({ [key]: value } as Record<K, V>)
}

/**
 * Parse the served document into what the page renders.
 *
 * ⚠️ IT THROWS RATHER THAN DEGRADING, on every axis. A parse that skipped a
 * malformed group, or read a renamed `groups` key as absent, would render a page
 * that looks finished and is short — and nothing downstream could tell that from
 * a genuinely smaller tool surface. `tests/docs/docs.test.ts` pins it against a
 * fixture in both directions: the shape motir-core serves today, and each way it
 * could stop being that shape.
 *
 * An EMPTY `groups` is an error too, deliberately. motir-core drops groups that
 * gate no tool and its catalogue is total over the registry by typecheck, so zero
 * groups is not a smaller answer — it is the failure this whole card exists to
 * make impossible to render quietly.
 */
export function parseMcpToolCatalogue(value: unknown): McpToolCatalogue {
  if (!isRecord(value)) {
    throw new McpToolCatalogueShapeError('is not a JSON object')
  }
  const endpoint = requireString(value, 'endpoint', 'the document')
  if (typeof value.toolCount !== 'number') {
    throw new McpToolCatalogueShapeError('is missing the document.toolCount')
  }
  if (!Array.isArray(value.groups)) {
    throw new McpToolCatalogueShapeError('is missing the document.groups')
  }
  if (value.groups.length === 0) {
    throw new McpToolCatalogueShapeError('carries no groups')
  }

  const groups = value.groups.map((raw, index) => {
    const where = `groups[${index}]`
    if (!isRecord(raw))
      throw new McpToolCatalogueShapeError(
        `has a ${where} that is not an object`,
      )
    if (typeof raw.grantedByDefault !== 'boolean') {
      throw new McpToolCatalogueShapeError(
        `is missing ${where}.grantedByDefault`,
      )
    }
    if (!Array.isArray(raw.tools)) {
      throw new McpToolCatalogueShapeError(`is missing ${where}.tools`)
    }
    return {
      permission: requireString(raw, 'permission', where),
      label: requireString(raw, 'label', where),
      gates: requireString(raw, 'gates', where),
      grantedByDefault: raw.grantedByDefault,
      ...optionalField('textLocale', readLocaleField(raw, 'textLocale', where)),
      tools: raw.tools.map((entry, position) => {
        const at = `${where}.tools[${position}]`
        if (!isRecord(entry)) {
          throw new McpToolCatalogueShapeError(
            `has a ${at} that is not an object`,
          )
        }
        return {
          name: requireString(entry, 'name', at),
          permission: requireString(entry, 'permission', at),
          summary: requireString(entry, 'summary', at),
          ...optionalField(
            'summaryLocale',
            readLocaleField(entry, 'summaryLocale', at),
          ),
          // Read when present, absent when not — never invented. A value that
          // is present but not an object is treated as absent rather than as a
          // parse failure: this field is outside the shape contract (see
          // `McpToolEntry.inputSchema`), so it may not redden the page.
          ...(isRecord(entry.inputSchema)
            ? { inputSchema: entry.inputSchema as OpenApiSchema }
            : {}),
          ...optionalField('title', readTitle(entry, at)),
          ...optionalField('annotations', readAnnotations(entry, at)),
        }
      }),
    }
  })

  return {
    endpoint,
    toolCount: value.toolCount,
    groups,
    ...optionalField(
      'locale',
      readLocaleField(value, 'locale', 'the document'),
    ),
  }
}

/**
 * Fetch the published catalogue, once per build and locale URL. Throws when
 * the artifact is unreachable.
 *
 * No argument or `'en'` requests exactly `CATALOGUE_URL`; any other locale adds
 * `?locale=` (MOTIR-8050). The code comes from the closed `LOCALES` set, so it
 * needs no encoding. An older server ignores the query and answers English.
 */
export function fetchMcpToolCatalogue(
  locale?: Locale,
): Promise<McpToolCatalogue> {
  const url =
    locale === undefined || locale === 'en'
      ? CATALOGUE_URL
      : `${CATALOGUE_URL}?locale=${locale}`
  return readArtifactOnce('the MCP tool catalogue', url, parseMcpToolCatalogue)
}

/**
 * The language a served text region is in. A present marker is returned as
 * served; an absent one means the server did not localize that text, so it is
 * English — on the English page too, where it is simply the page's own language.
 */
export function catalogueTextLocale(
  served: string | undefined,
  pageLocale: Locale,
): string {
  void pageLocale
  return served ?? 'en'
}

/**
 * How many tools the catalogue carries, counted from the rows this page is about
 * to render — never the served `toolCount`. The producer computes that field the
 * same way and the two agree; counting here is what makes it impossible for the
 * number a reader sees to disagree with the list beneath it.
 */
export function countCatalogueTools(catalogue: McpToolCatalogue): number {
  return catalogue.groups.reduce(
    (total, group) => total + group.tools.length,
    0,
  )
}

// ── The CLI command catalogue (MOTIR-4390 / MOTIR-4395) ─────────────────────
//
// `GET /api/docs/cli-commands.json` on the app origin — motir-core's
// `lib/apiDocs/cli.ts`, served by `app/api/docs/cli-commands.json/route.ts`.
// Consumed exactly as the two documents above are: fetched once per build,
// parsed through a function a fixture pins, nothing committed.
//
// ⚠️ WHY IT IS A SERVED DOCUMENT AND NOT AN `@motir/cli` IMPORT. `@motir/cli`
// publishes `exports: { "./package.json": … }` and nothing else, so
// `COMMAND_CATALOG` is bundled in `dist/index.js` and importable by no reader —
// which is the precondition that turned "generate the page from the published
// catalogue" into two cards. MOTIR-4390 weighed the alternative (a package
// export, so the page could not drift from the binary a reader installed) and
// rejected it: this repository would pin a version in its OWN lockfile, so the
// page would describe whatever it last bumped to while a reader gets `latest`
// — agreement with A published version, never THE one they installed — and a
// lockfile-pinned copy is exactly the shape MOTIR-4180 removed from here.
//
// So the document describes the CLI at motir-core's `main`, and SAYS SO: it
// carries `packageVersion`, and the page shows it. The gap is visible rather
// than implied, which is the most either mechanism could honestly offer.

/** One published flag. */
export interface CliCommandOption {
  flags: string
  description: string
}

/** One published command — every field READ from the CLI's own record. */
export interface CliCommand {
  path: string
  signature: string
  /** `motir <path> <signature>` — what a reader actually types. */
  invocation: string
  description: string
  helpGroup: string | null
  options: CliCommandOption[]
}

/** The published document. */
export interface CliCommandsDocument {
  packageName: string
  packageVersion: string
  installCommand: string
  nodeRequirement: string
  defaultServer: string
  commandCount: number
  commands: CliCommand[]
}

const CLI_COMMANDS_URL = `${APP_ORIGIN}/api/docs/cli-commands.json`

/** Thrown when the served document is not the shape this page renders. */
export class CliCommandsShapeError extends Error {
  override readonly name = 'CliCommandsShapeError'

  constructor(what: string) {
    super(
      `the published CLI command catalogue at ${CLI_COMMANDS_URL} ${what}. ` +
        `This page renders that document and keeps no copy of it, so a shape ` +
        `it cannot read is an error rather than an empty list.`,
    )
  }
}

/**
 * Parse the served document into what the page renders.
 *
 * ⚠️ IT THROWS RATHER THAN DEGRADING, on the same axes the tool catalogue's
 * parse does and for the same reason: a parse that read a renamed `commands`
 * key as absent would render a page that looks finished and has no commands on
 * it, and nothing downstream could tell that from a CLI that had lost them.
 *
 * An EMPTY `commands` is an error too. The catalogue is total over the CLI's
 * own record by construction over there, so zero commands is not a smaller
 * answer — it is the failure this page exists to make impossible to render
 * quietly.
 */
export function parseCliCommands(value: unknown): CliCommandsDocument {
  if (!isRecord(value)) {
    throw new CliCommandsShapeError('is not a JSON object')
  }
  for (const key of [
    'packageName',
    'packageVersion',
    'installCommand',
    'nodeRequirement',
    'defaultServer',
  ]) {
    if (typeof value[key] !== 'string' || value[key] === '') {
      throw new CliCommandsShapeError(`is missing the document.${key}`)
    }
  }
  if (!Array.isArray(value.commands)) {
    throw new CliCommandsShapeError('is missing the document.commands')
  }
  if (value.commands.length === 0) {
    throw new CliCommandsShapeError('carries no commands')
  }

  const commands = value.commands.map((raw, index) => {
    const where = `commands[${index}]`
    if (!isRecord(raw)) {
      throw new CliCommandsShapeError(`has a ${where} that is not an object`)
    }
    if (!Array.isArray(raw.options)) {
      throw new CliCommandsShapeError(`is missing ${where}.options`)
    }
    return {
      path: requireString(raw, 'path', where),
      // A command with no positional arguments has an EMPTY signature, which is
      // a legitimate value and not a missing one — so it is read directly
      // rather than through `requireString`, which rejects the empty string.
      signature: typeof raw.signature === 'string' ? raw.signature : '',
      invocation: requireString(raw, 'invocation', where),
      description: requireString(raw, 'description', where),
      helpGroup: typeof raw.helpGroup === 'string' ? raw.helpGroup : null,
      options: raw.options.map((entry, position) => {
        const at = `${where}.options[${position}]`
        if (!isRecord(entry)) {
          throw new CliCommandsShapeError(`has a ${at} that is not an object`)
        }
        return {
          flags: requireString(entry, 'flags', at),
          description: requireString(entry, 'description', at),
        }
      }),
    }
  })

  return {
    packageName: value.packageName as string,
    packageVersion: value.packageVersion as string,
    installCommand: value.installCommand as string,
    nodeRequirement: value.nodeRequirement as string,
    defaultServer: value.defaultServer as string,
    // Counted from the rows this page is about to render, never the served
    // `commandCount` — the producer computes that the same way and the two
    // agree; counting here is what makes it impossible for a number a reader
    // sees to disagree with the list beneath it.
    commandCount: commands.length,
    commands,
  }
}

/** Fetch the published catalogue, once per build. Throws when it is unreachable. */
export function fetchCliCommands(): Promise<CliCommandsDocument> {
  return readArtifactOnce(
    'the CLI command catalogue',
    CLI_COMMANDS_URL,
    parseCliCommands,
  )
}

/**
 * The commands, grouped by their help group in FIRST-APPEARANCE order.
 *
 * Catalogue order is REGISTRATION order, which is the order `motir help`
 * renders — re-sorting here would be a second opinion about the CLI's own list.
 * A subcommand carries no group of its own (commander groups none), so it joins
 * the group of the command it hangs under; a reader looks for it there.
 */
export function groupCliCommands(
  document: CliCommandsDocument,
): { heading: string; commands: CliCommand[] }[] {
  const groups: { heading: string; commands: CliCommand[] }[] = []
  let current: { heading: string; commands: CliCommand[] } | null = null

  for (const command of document.commands) {
    if (command.helpGroup) {
      const existing = groups.find((g) => g.heading === command.helpGroup)
      current = existing ?? { heading: command.helpGroup, commands: [] }
      if (!existing) groups.push(current)
    }
    // A subcommand before any grouped command would have nowhere to go; the
    // catalogue never emits one, and if it ever did it lands in its own group
    // rather than being dropped.
    if (!current) {
      current = { heading: command.helpGroup ?? 'Commands', commands: [] }
      groups.push(current)
    }
    current.commands.push(command)
  }
  return groups
}

// ── The rail's view of the operation list (MOTIR-4396) ──────────────────────
//
// The navigation and the reference must agree about two things: the ANCHOR each
// operation has, and the GROUP it sits under. Both are derived here so the rail
// and the page cannot drift — a rail whose links 404 into the page is worse
// than no rail, and it is the failure a second copy of either rule produces.

/**
 * The in-page anchor for one operation.
 *
 * The `operationId` when the document declares one (every Motir operation
 * does), and a slug of method + path when it does not — so an operation is
 * still reachable from a document that omits the field.
 */
export function operationAnchorId(operation: ApiOperation): string {
  return (
    operation.operationId ??
    `${operation.method}-${operation.path}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  )
}

/**
 * The RESOURCE an operation belongs to, derived from its path.
 *
 * `/api/v1/projects/{projectKey}/work-items` → `Projects`;
 * `/api/v1/work-items/{key}` → `Work items`; `/api/public/explore` → `Explore`.
 *
 * ⚠️ DERIVED, never authored. The old surface carried nine hand-written section
 * labels, which is a second home for a fact the paths already state — a new
 * resource would have arrived ungrouped, or grouped by whoever remembered. The
 * rule instead: drop `api`, drop the version or audience segment, and take the
 * first segment that is not a `{parameter}`.
 */
export function operationGroup(path: string): string {
  const segments = path.split('/').filter(Boolean)
  const rest = segments[0] === 'api' ? segments.slice(1) : segments
  const withoutVersion = /^(v\d+|public|internal)$/.test(rest[0] ?? '')
    ? rest.slice(1)
    : rest
  const head = withoutVersion.find((segment) => !segment.startsWith('{'))
  if (!head) return 'Other'
  const words = head.replace(/-/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** One row of the rail's operation tier. */
export interface RailOperation {
  id: string
  method: string
  path: string
  group: string
}

/**
 * The operation tier, grouped, in the reference's OWN order.
 *
 * Groups appear in first-appearance order and their members keep the order
 * `listOperations` sorted them into, so the rail reads top to bottom exactly as
 * the page does. A rail sorted differently from the page it navigates makes a
 * reader who scrolls lose their place.
 */
export function railOperations(
  operations: readonly ApiOperation[],
): { group: string; operations: RailOperation[] }[] {
  const groups: { group: string; operations: RailOperation[] }[] = []
  for (const operation of operations) {
    const group = operationGroup(operation.path)
    let bucket = groups.find((candidate) => candidate.group === group)
    if (!bucket) {
      bucket = { group, operations: [] }
      groups.push(bucket)
    }
    bucket.operations.push({
      id: operationAnchorId(operation),
      method: operation.method,
      path: operation.path,
      group,
    })
  }
  return groups
}
