import { Children, Fragment, type ComponentProps, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { localizedPath } from '@/i18n/localizedPath'
import type { Locale } from '@/i18n/routing'
import { getCopy } from '@/lib/copy'
import {
  DocsDocumentError,
  resolveDocsDocument,
  splitParts,
  splitSlots,
  substituteValues,
  VALUE_MARK_CLOSE,
  VALUE_MARK_OPEN,
  type DocsDocumentText,
} from '@/lib/docsDocuments'
import { TranslationUpdatingNote } from './TranslationUpdatingNote'

/*
 * Renders one /docs page's prose from its authored document (MOTIR-8032).
 * `lib/docsDocuments.ts` is the contract; this is its renderer.
 *
 * - `{{value:name}}` is substituted from `values` BEFORE the Markdown is parsed,
 *   so it works in a paragraph, a list item, a table cell, an inline code span
 *   and a link destination alike, and identically for English and a translation.
 * - `{{slot:name}}` (alone on a line) renders `slots[name]`: the page builds the
 *   node, so what a reader copies is the same bytes in every language. An
 *   unresolved slot or value throws.
 * - A heading's `{#id}` is its DOM id, verbatim.
 * - On a stale or missing translation the English document renders under the
 *   "being updated" note, in a wrapper marked `lang="en"` (design panels C–E).
 */

type ComponentMap = ComponentProps<typeof ReactMarkdown>['components']

const ANCHOR_AT_END = /\s*\{#([a-z0-9]+(?:-[a-z0-9]+)*)\}\s*$/

/** Pull the explicit `{#id}` off a heading's last text child. */
function splitAnchor(children: ReactNode): { id: string; rest: ReactNode[] } {
  const nodes = Children.toArray(children)
  const last = nodes[nodes.length - 1]
  if (typeof last === 'string') {
    const match = ANCHOR_AT_END.exec(last)
    if (match) {
      const trimmed = last.replace(ANCHOR_AT_END, '')
      return {
        id: match[1]!,
        rest:
          trimmed.length > 0
            ? [...nodes.slice(0, -1), trimmed]
            : nodes.slice(0, -1),
      }
    }
  }
  throw new DocsDocumentError(
    '(rendered heading)',
    'a heading reached the renderer without its {#id}',
  )
}

const isExternal = (href: string) => /^https?:\/\//.test(href)

const VALUE_MARK = new RegExp(
  `${VALUE_MARK_OPEN}([^${VALUE_MARK_CLOSE}]+)${VALUE_MARK_CLOSE}`,
)

/** Fill the placeholders a non-string `{{value:…}}` left in a run of text. */
function fill(
  children: ReactNode,
  nodes: Record<string, ReactNode>,
): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child !== 'string' || !child.includes(VALUE_MARK_OPEN))
      return child
    return child
      .split(VALUE_MARK)
      .map((piece, index) =>
        index % 2 === 0 ? (
          piece
        ) : (
          <Fragment key={index}>{nodes[piece]}</Fragment>
        ),
      )
  })
}

function components(
  locale: Locale,
  nodes: Record<string, ReactNode>,
): ComponentMap {
  function heading(Tag: 'h1' | 'h2' | 'h3' | 'h4', className: string) {
    function Heading({ children }: { children?: ReactNode }) {
      const { id, rest } = splitAnchor(children)
      return (
        <Tag id={id} className={className}>
          {fill(rest, nodes)}
        </Tag>
      )
    }
    return Heading
  }
  return {
    h1: heading(
      'h1',
      'font-(family-name:--font-serif) text-[30px] leading-[1.2] font-bold tracking-[-0.01em] text-(--el-text)',
    ),
    h2: heading(
      'h2',
      'mt-9 text-[11px] font-semibold tracking-[0.06em] text-(--el-text-secondary) uppercase',
    ),
    h3: heading('h3', 'mt-6 text-[15px] font-semibold text-(--el-text)'),
    h4: heading('h4', 'mt-5 text-[15px] font-semibold text-(--el-text)'),
    p: ({ children }) => (
      <p className="mt-4 max-w-[68ch] text-[15px] leading-relaxed text-(--el-text)">
        {fill(children, nodes)}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="mt-2.5 max-w-[68ch] list-disc pl-5">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mt-2.5 max-w-[68ch] list-decimal pl-5">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="py-1 text-[13.5px] leading-relaxed text-(--el-text-secondary)">
        {fill(children, nodes)}
      </li>
    ),
    // The callout: a Markdown blockquote on the yellow tint, `--el-text-strong` ink.
    blockquote: ({ children }) => (
      <blockquote className="mt-4 max-w-[68ch] rounded-(--radius-card) bg-(--el-tint-yellow) px-4 py-3 text-[14px] text-(--el-text-strong) [&_p]:mt-0">
        {fill(children, nodes)}
      </blockquote>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-(--el-text)">
        {fill(children, nodes)}
      </strong>
    ),
    code: ({ children }) => (
      <code className="font-(family-name:--font-mono) text-[0.92em]">
        {children}
      </code>
    ),
    a: ({ href, children }) => {
      const external = href !== undefined && isExternal(href)
      return (
        <a
          href={href?.startsWith('/') ? localizedPath(locale, href) : href}
          {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
          className="text-(--el-link) underline underline-offset-2 hover:text-(--el-link-pressed)"
        >
          {fill(children, nodes)}
        </a>
      )
    },
    table: ({ children }) => (
      <div className="mt-4 max-w-[68ch] overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border border-(--el-border) bg-(--el-surface-soft) px-2.5 py-2 text-left font-semibold text-(--el-text-strong)">
        {fill(children, nodes)}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-(--el-border) px-2.5 py-2 align-top text-(--el-text-secondary)">
        {fill(children, nodes)}
      </td>
    ),
  }
}

function renderText(
  text: string,
  document: DocsDocumentText,
  locale: Locale,
  slots: Record<string, ReactNode>,
  values: Record<string, ReactNode>,
  keyPrefix: string,
): ReactNode[] {
  const markdown = substituteValues(
    text,
    values,
    document.file,
    document.bodyStartLine,
  )
  return splitSlots(markdown).map((part, index) => {
    if (part.kind === 'slot') {
      if (!(part.name in slots)) {
        throw new DocsDocumentError(
          document.file,
          `no slot named "${part.name}" was passed to the renderer`,
        )
      }
      return <div key={`${keyPrefix}slot-${index}`}>{slots[part.name]}</div>
    }
    return (
      <ReactMarkdown
        key={`${keyPrefix}md-${index}`}
        remarkPlugins={[remarkGfm]}
        components={components(locale, values)}
      >
        {part.text}
      </ReactMarkdown>
    )
  })
}

interface DocsDocumentProps {
  /** The route minus `/docs`: `index`, `sandbox`, `mcp/tools`. */
  slug: string
  locale: Locale
  /** Block slots: what a reader copies or a generated table renders. */
  slots: Record<string, ReactNode>
  /**
   * Inline values the prose must not restate; built per page and locale. A
   * string works anywhere (a paragraph, a cell, a code span, a link destination);
   * a React node the page renders works anywhere outside backticks.
   */
  values?: Record<string, ReactNode>
  /** Tests only: point at a fixture tree. */
  root?: string
}

export async function DocsDocument({
  slug,
  locale,
  slots,
  values = {},
  root,
}: DocsDocumentProps) {
  const { document, fallback } = resolveDocsDocument(slug, locale, root)
  // One flowing body: every part, in order, with the markers dropped.
  const body = splitParts(document.markdown).flatMap((part) =>
    renderText(part.text, document, locale, slots, values, `${part.name}-`),
  )
  if (fallback === null) return <>{body}</>
  const copy = await getCopy(locale)
  return (
    <>
      <TranslationUpdatingNote text={copy.docs.notes.beingUpdated} />
      <div lang="en">{body}</div>
    </>
  )
}

/**
 * Resolve a document ONCE and hand its named parts to the page (MOTIR-8054), for
 * prose that is not one flowing body: a paragraph that renders only when a fetch
 * fails, text a client component holds. Every part comes from the same resolved
 * document, so a page never mixes a fresh part with a stale one — a stale
 * translation falls back as a whole, each English part's root carrying
 * `lang="en"`. `note` is the "being updated" note, for the page to render once at
 * the top. Asking for a part the document lacks throws.
 */
export async function renderDocsParts({
  slug,
  locale,
  slots,
  values = {},
  root,
}: DocsDocumentProps): Promise<{
  parts: Record<string, ReactNode>
  names: string[]
  note: ReactNode | null
  shownLocale: Locale
}> {
  const { document, fallback, shownLocale } = resolveDocsDocument(
    slug,
    locale,
    root,
  )
  const rendered: Record<string, ReactNode> = {}
  for (const part of splitParts(document.markdown)) {
    const nodes = renderText(
      part.text,
      document,
      locale,
      slots,
      values,
      `${part.name}-`,
    )
    rendered[part.name] =
      fallback === null ? <>{nodes}</> : <div lang="en">{nodes}</div>
  }
  const parts = new Proxy(rendered, {
    get(target, key) {
      if (typeof key === 'symbol' || key === 'then' || key in target) {
        return Reflect.get(target, key)
      }
      throw new DocsDocumentError(
        document.file,
        `the document has no part named "${key}"`,
      )
    },
  })
  let note: ReactNode | null = null
  if (fallback !== null) {
    const copy = await getCopy(locale)
    note = <TranslationUpdatingNote text={copy.docs.notes.beingUpdated} />
  }
  return { parts, names: Object.keys(rendered), note, shownLocale }
}

// Exported so the tests can assert the heading splitter's contract directly.
export { splitAnchor }
