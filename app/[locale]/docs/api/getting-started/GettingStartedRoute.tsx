import { localePageMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'
import { APP_ORIGIN } from '@/lib/appOrigin'
import { getCopy } from '@/lib/copy'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'
import { fetchOpenApiSpec } from '@/lib/docs'
import { DocsDocument } from '../../_components/DocsDocument'
import { CodeBlock } from '../../_components/DocSchema'

/*
 * The getting-started guide (MOTIR-4046, RESTORED by MOTIR-4429).
 *
 * ⚠️ WHAT THIS CARD FIXED. The page was five prose bullets — `0 <pre>` blocks
 * and ZERO occurrences of `curl`. A page titled *Getting started* that contains
 * no request a reader can run has exactly the defect MOTIR-4391 removed from
 * the reference beside it. The deleted `motir-core` page at `95a2d4468^`
 * (`lib/apiDocs/guide.ts`) was a hands-on walkthrough: a first call and its
 * `200` body, two paginated calls and both bodies, a `404` body, and the
 * response headers read back. MOTIR-4397's parity ledger measured the loss;
 * this is the restore, and the five steps it was reduced to are kept as the
 * spine rather than replaced.
 *
 * ⚠️ EVERY REQUEST IS BUILT FROM THE CONFIGURED ORIGIN, never from a literal.
 * `lib/appOrigin.ts` is the one place the motir-core origin lives, so a preview
 * build prints requests against the preview it is part of.
 * `tests/docs/apiGuide.test.tsx` asserts every rendered `curl` carries it — a
 * hard-coded `https://app.motir.co` fails there rather than silently pointing a
 * reader at production from a preview.
 *
 * ── What the RESPONSE bodies are, said plainly ─────────────────────────────
 * Authored illustrations of the documented shapes, elided with `…` where a real
 * body is long — the same treatment the deleted page used. They are not fetched
 * and they are not generated: nothing in this repository can make an
 * authenticated call, and the SHAPES are what a reader needs. What IS derived is
 * the operation set beside them — `/docs/api` renders the served OpenAPI
 * document — so the contract itself is never described from memory here.
 *
 * ⚠️ AND THE ONE NUMBER IN THE HEADER BLOCK IS DERIVED TOO. The deleted page
 * interpolated motir-core's `V1_CONTRACT_VERSION`, which this repository cannot
 * import — so the version comes from the served document's `info.version`, read
 * through the SAME once-per-build read `DocsApiLayout.tsx` already makes for
 * the rail. That is one document per build, not two, and it is why a typed
 * literal was not the cheaper option: a committed version is stale exactly when
 * it is displayed, which is the copy MOTIR-4180 removed from this repository.
 * Unreachable ⇒ the build fails (MOTIR-10645); the page never shows a number
 * that might be wrong, nor a placeholder baked into a 200.
 */

export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, '/docs/api/getting-started', (copy) => ({
    title: copy.docs.metaTitleGuide,
    description: copy.docs.metaDescriptionGuide,
  }))
}

export default async function GettingStartedPage({ params }: LocalePageProps) {
  const locale = await enterLocale(params)
  const copy = await getCopy(locale)
  const origin = APP_ORIGIN

  /*
   * The contract version, from the document motir-core serves. The document is
   * read once per build and the layout above has already read it, so this
   * costs nothing; an unreadable document fails the build rather than leaving
   * a number this repository invented.
   */
  const contractVersion = (await fetchOpenApiSpec()).info.version

  return (
    <>
      <h1 className="font-(family-name:--font-serif) text-[30px] leading-[1.2] font-bold tracking-[-0.01em] text-(--el-text)">
        {copy.docs.apiGettingStarted}
      </h1>
      <DocsDocument
        slug="api/getting-started"
        locale={locale}
        slots={{
          'app-host': (
            <div className="mt-3">
              <CodeBlock caption="host" code={origin} copyable={false} />
            </div>
          ),
          'first-call-request': (
            <div className="mt-3">
              <CodeBlock
                caption="curl"
                code={`curl ${origin}/api/v1/me \\
  -H "Authorization: Bearer $MOTIR_TOKEN"`}
              />
            </div>
          ),
          'first-call-response': (
            <CodeBlock
              caption="200 · application/json"
              code={`{
  "user": { "id": "usr_…", "name": "Ada", "email": "ada@example.com" },
  "workspaceId": "wsp_…",
  "permissions": ["project:browse"]
}`}
            />
          ),
          'paginate-first-request': (
            <div className="mt-3">
              <CodeBlock
                caption="curl · the first page"
                code={`curl "${origin}/api/v1/projects/MOTIR/work-items?limit=2" \\
  -H "Authorization: Bearer $MOTIR_TOKEN"`}
              />
            </div>
          ),
          'paginate-first-response': (
            <CodeBlock
              caption="200 · application/json"
              code={`{
  "items": [ { "key": "MOTIR-1", … }, { "key": "MOTIR-2", … } ],
  "nextCursor": "eyJjIjoid29ya0l0ZW1zIiwicCI6…"
}`}
            />
          ),
          'paginate-next-request': (
            <CodeBlock
              caption="curl · the next page"
              code={`curl "${origin}/api/v1/projects/MOTIR/work-items?limit=2&cursor=$CURSOR" \\
  -H "Authorization: Bearer $MOTIR_TOKEN"`}
            />
          ),
          'error-404-response': (
            <div className="mt-3">
              <CodeBlock
                caption="404 · application/json"
                code={`{ "code": "WORK_ITEM_NOT_FOUND", "error": "Work item not found." }`}
              />
            </div>
          ),
          'response-headers': (
            <div className="mt-3">
              <CodeBlock
                caption="response headers"
                code={`X-RateLimit-Limit:     600
X-RateLimit-Remaining: 594
X-RateLimit-Reset:     1785312000
X-Request-Id:          c7771231-e18c-48bc-90c9-c1a9720436a4
X-Motir-Api-Version:   ${contractVersion}`}
              />
            </div>
          ),
        }}
      />
    </>
  )
}
