import { localePageMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'
import {
  exampleRequest,
  fetchOpenApiSpec,
  listOperations,
  operationAnchorId,
  type ApiOperation,
} from '@/lib/docs'
import { APP_ORIGIN } from '@/lib/appOrigin'
import { formatIcu, getCopy, useCopy } from '@/lib/copy'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'
import { DocsDocument } from '../_components/DocsDocument'
import { GeneratedReferenceNote } from '../_components/GeneratedReferenceNote'
import { resolveDocsDocument } from '@/lib/docsDocuments'
import { DEFAULT_LOCALE, type Locale } from '@/i18n/routing'
import {
  CodeBlock,
  MethodPill,
  ParameterTable,
  SchemaTable,
  SectionLabel,
  StatusPill,
} from '../_components/DocSchema'

/*
 * The API reference (MOTIR-4046, RESTORED by MOTIR-4391) — generated from
 * motir-core's PUBLISHED OpenAPI document (`/api/openapi/v1.json`), fetched
 * fresh so it never drifts from the registry.
 *
 * ⚠️ WHAT MOTIR-4391 FIXED, because the shape of the defect is the reason this
 * comment is long. The page ALREADY FETCHED the whole document — 720 KB, 39
 * paths, 49 operations, every one of them carrying its parameters, its request
 * body and its responses — and rendered `method`, `path` and `summary`. A
 * reader looking at `POST /api/v1/projects/{projectKey}/work-items — Create a
 * work item` was given no way to discover what to send, on any of forty-nine
 * operations. It was not a data gap: the answer arrived on every request and
 * was discarded in this file.
 *
 * ⚠️ AND EVERY STRUCTURAL CHECK AGREED WHILE THE CONTENT WAS MISSING — nine
 * routes, nine sitemap entries, nine index links, every page `200` on the right
 * host, and `lib/docs.ts`'s own guards asserting the fetch URL is the published
 * artifact and that no spec is committed. They verify the page FETCHES the
 * document. Nothing asserted it RENDERED any of it, which is why this shipped.
 * `tests/docs/docs.test.ts`'s fetch-versus-render guard is the assertion that
 * was missing, and it is a criterion of the card rather than a nicety: it
 * renders this page over a fixture whose property names appear nowhere in this
 * repository, and fails if they do not reach the output.
 *
 * ── The section order is FIXED, and that is a spec ──────────────────────────
 * scope → request → body → example → responses, per
 * `motir-core/design/api-docs/design-notes.md` (the asset the deleted
 * `OperationSection.tsx` was drawn to). The reason is the whole point of a
 * reference: a reader who has read one operation must be able to SKIM the next,
 * which only works if the next one is laid out identically.
 *
 * ⚠️ THE 49-OPERATION PAGE IS LONG, AND THE NAVIGATION IS THE RAIL beside it —
 * `app/docs/api/layout.tsx`, MOTIR-4396, built to MOTIR-4393's design asset.
 * This page still builds no nav of its own and does not compress the reference
 * to avoid needing one: the length is the honest size of the surface.
 *
 * What it owes the rail is the ANCHOR, and it owes it through the SAME function
 * the rail links with — `operationAnchorId` in `lib/docs.ts`. A second copy of
 * that rule here is how a rail full of links that 404 into the page gets built,
 * which is worse than no rail at all. The layout and this page also read ONE
 * spec, read once per build, so they cannot disagree about which operations
 * exist.
 *
 * ⚠️ NO FALLBACK, DELIBERATELY — the contract `lib/docs.ts`'s header states. A
 * committed default rendered when the fetch fails is stale exactly when it is
 * displayed and invisible exactly when it is wrong, and an "unreachable"
 * paragraph built into the page would ship as a 200: the read throws and the
 * build fails instead (MOTIR-10645).
 */
export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, '/docs/api', (copy) => ({
    title: copy.docs.metaTitleReference,
    description: copy.docs.metaDescriptionReference,
  }))
}

function Operation({
  operation,
  locale,
}: {
  operation: ApiOperation
  locale: Locale
}) {
  const copy = useCopy()
  // The generated text is English wherever the page is not (MOTIR-8049); omitted
  // in English as redundant. Never on an element that holds catalogue words.
  const generatedLang = locale === DEFAULT_LOCALE ? undefined : 'en'
  const id = operationAnchorId(operation)
  return (
    <section
      id={id}
      className="min-w-0 scroll-mt-6 border-b border-(--el-border-soft) pt-8 pb-10 last:border-b-0"
    >
      <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
        <MethodPill method={operation.method} />
        <span className="font-(family-name:--font-mono) text-[15px] font-semibold break-all text-(--el-text)">
          {operation.path}
        </span>
        {operation.permission ? (
          <span className="inline-flex rounded-(--radius-badge) bg-(--el-tint-lavender) px-(--spacing-chip-x) py-(--spacing-chip-y) font-(family-name:--font-mono) text-[11px] text-(--el-text-strong)">
            {operation.permission}
          </span>
        ) : null}
      </div>

      <h2
        lang={generatedLang}
        className="mb-1 text-[16px] font-semibold text-(--el-text)"
      >
        {operation.summary}
      </h2>
      {operation.description ? (
        <p
          lang={generatedLang}
          className="mb-5 max-w-[68ch] text-[14px] leading-relaxed whitespace-pre-line text-(--el-text-secondary)"
        >
          {operation.description}
        </p>
      ) : null}

      {operation.parameters.length > 0 ? (
        <>
          <SectionLabel id={`${id}-request`}>
            {copy.docs.sectionRequest}
          </SectionLabel>
          <ParameterTable
            parameters={operation.parameters}
            labelledBy={`${id}-request`}
            descriptionLang={generatedLang}
          />
        </>
      ) : null}

      {operation.requestBody ? (
        <>
          <SectionLabel id={`${id}-body`}>{copy.docs.sectionBody}</SectionLabel>
          {operation.requestBody.description ? (
            <p
              lang={generatedLang}
              className="mb-2 max-w-[68ch] text-[13px] text-(--el-text-secondary)"
            >
              {operation.requestBody.description}
            </p>
          ) : null}
          <SchemaTable
            schema={operation.requestBody.schema}
            labelledBy={`${id}-body`}
            descriptionLang={generatedLang}
          />
        </>
      ) : null}

      <SectionLabel>{copy.docs.sectionExample}</SectionLabel>
      <CodeBlock caption="curl" code={exampleRequest(operation, APP_ORIGIN)} />

      {operation.responses.length > 0 ? (
        <>
          <SectionLabel id={`${id}-responses`}>
            {copy.docs.sectionResponses}
          </SectionLabel>
          <div
            role="region"
            aria-labelledby={`${id}-responses`}
            tabIndex={0}
            className="mb-4 overflow-x-auto"
          >
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {[copy.docs.thStatus, copy.docs.thCondition].map(
                    (heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="border-b border-(--el-border) px-2.5 py-1.5 text-left text-[11px] font-semibold tracking-wide text-(--el-text-secondary) uppercase"
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {operation.responses.map((response) => (
                  <tr key={response.status}>
                    <td className="border-b border-(--el-border-soft) px-2.5 py-2 align-top">
                      <StatusPill status={response.status} />
                    </td>
                    <td
                      lang={generatedLang}
                      className="border-b border-(--el-border-soft) px-2.5 py-2 align-top text-(--el-text-secondary)"
                    >
                      {response.description ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {/* The SUCCESS body's shape, which is the second half of "what comes
          back" — the status table says WHEN, this says WHAT. */}
      {successSchema(operation) ? (
        <>
          <SectionLabel id={`${id}-response-schema`}>
            {copy.docs.sectionResponseSchema}
          </SectionLabel>
          <SchemaTable
            schema={successSchema(operation)}
            labelledBy={`${id}-response-schema`}
            descriptionLang={generatedLang}
          />
        </>
      ) : null}
    </section>
  )
}

/** The schema of the first 2xx response that declares one. */
function successSchema(operation: ApiOperation) {
  return operation.responses.find(
    (response) =>
      response.schema !== undefined && response.status.startsWith('2'),
  )?.schema
}

export default async function ApiReferencePage({ params }: LocalePageProps) {
  const locale = await enterLocale(params)
  const copy = await getCopy(locale)
  const heading = (
    <h1 className="font-(family-name:--font-serif) text-[30px] leading-[1.2] font-bold tracking-[-0.01em] text-(--el-text)">
      {copy.docs.api}
    </h1>
  )
  // Read once per build, with the rail beside it; a failed read fails the build.
  const spec = await fetchOpenApiSpec()

  const operations = listOperations(spec)
  // Panel E: a page whose own document is the English fallback is English top to
  // bottom, so only the being-updated note (DocsDocument's) describes it.
  const ownDocument = resolveDocsDocument('api', locale).fallback === null

  return (
    <>
      {heading}
      <DocsDocument
        slug="api"
        locale={locale}
        slots={{
          'spec-summary': (
            <p className="mt-2 text-[13px] text-(--el-text-secondary)">
              {formatIcu(locale, copy.docs.apiSpecSummary, {
                title: spec.info.title,
                version: spec.info.version,
                count: operations.length,
                path: '/api/openapi/v1.json',
                /* ⚠️ THE DOCUMENT ITSELF, RESTORED (MOTIR-4429). The deleted
                   motir-core page linked the spec path beside this line; the
                   move dropped it, so a reader who wanted to point a code
                   generator at the contract had to guess its URL. It is built
                   from the ONE configured origin, like every other door out of
                   this repository. */
                link: (chunks) => (
                  <a
                    className="text-(--el-accent-on-surface) underline underline-offset-2"
                    href={`${APP_ORIGIN}/api/openapi/v1.json`}
                    rel="noreferrer noopener"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </p>
          ),
          operations: (
            <>
              {ownDocument ? (
                <GeneratedReferenceNote
                  source="openapi"
                  locale={locale}
                  copy={copy}
                />
              ) : null}
              <div className="mt-2 flex flex-col">
                {operations.map((operation) => (
                  <Operation
                    key={`${operation.method} ${operation.path}`}
                    operation={operation}
                    locale={locale}
                  />
                ))}
              </div>
            </>
          ),
        }}
      />
    </>
  )
}
