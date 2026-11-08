import { describeSchema, schemaTypeLabel, type OpenApiSchema } from '@/lib/docs'
import { CopyControlsIsland } from '@/app/_islands'
import { CodePane, type CodeBlockProps } from './CodePane'

/*
 * The three blocks the API reference renders an operation's DETAIL in
 * (MOTIR-4391) — a spec table, a schema table and a code pane.
 *
 * ⚠️ THEY ARE COMPONENTS, NOT PAGE MARKUP, because three surfaces render the
 * same shapes: the operation's parameters, its request body, its response
 * bodies, and — once `/docs/mcp/tools` renders each tool's arguments — a tool's
 * input schema, which is the same JSON Schema wearing a different name. A table
 * hand-rolled per page is how two documentation surfaces end up disagreeing
 * about what "required" looks like.
 *
 * ── The prior art, and what was kept from it ────────────────────────────────
 * `motir-core` at `95a2d4468^` rendered this surface before the cutover moved
 * it here: `app/(public)/docs/_components/OperationSection.tsx`, drawn to
 * `motir-core/design/api-docs/design-notes.md`. What is KEPT is that asset's
 * SPEC — the fixed section order (scope → request → body → example →
 * responses), so a reader who has read one operation can skim the next; the
 * verb chip carrying its hue in the BACKGROUND with `--el-text-strong` ink; the
 * status chip's three tints by CLASS rather than eleven by code; and the two
 * spec tables scrolling in their own boxes because three columns of prose do
 * not fit a phone.
 *
 * What is NOT kept is that asset's SHELL. It drew a two-tier searchable rail
 * inside motir-core's own chrome; this surface wears `motir.co`'s `SiteShell`,
 * and the navigation question is a sibling card's — the design asset first, then
 * the build. So these components draw an operation and nothing around it.
 */

/** The verb chip. The hue is in the BACKGROUND; the ink is `--el-text-strong`. */
const METHOD_TINT: Record<string, string> = {
  GET: 'bg-(--el-tint-sky)',
  POST: 'bg-(--el-tint-mint)',
  PATCH: 'bg-(--el-tint-peach)',
  PUT: 'bg-(--el-tint-peach)',
  DELETE: 'bg-(--el-tint-rose)',
}

export function MethodPill({ method }: { method: string }) {
  return (
    <span
      className={`inline-flex min-w-[52px] justify-center rounded-(--radius-badge) px-(--spacing-chip-x) py-(--spacing-chip-y) font-(family-name:--font-mono) text-[10.5px] font-bold tracking-wide text-(--el-text-strong) ${
        METHOD_TINT[method] ?? 'bg-(--el-muted)'
      }`}
    >
      {method}
    </span>
  )
}

/**
 * A status chip: three colours by CLASS, not eleven by code — a reader learns
 * three. 2xx mint, 4xx peach, 5xx rose.
 */
export function StatusPill({ status }: { status: string }) {
  const code = Number.parseInt(status, 10)
  const tint = Number.isNaN(code)
    ? 'bg-(--el-muted)'
    : code < 300
      ? 'bg-(--el-tint-mint)'
      : code < 500
        ? 'bg-(--el-tint-peach)'
        : 'bg-(--el-tint-rose)'
  return (
    <span
      className={`inline-flex min-w-[42px] justify-center rounded-(--radius-badge) px-(--spacing-chip-x) py-(--spacing-chip-y) font-(family-name:--font-mono) text-[11px] font-bold text-(--el-text-strong) ${tint}`}
    >
      {status}
    </span>
  )
}

/**
 * A copyable code pane. `caption` names what the reader is looking at.
 *
 * ⚠️ "COPYABLE" IS LITERAL SINCE MOTIR-4977. It used to mean hand-selectable —
 * the docstring said "copyable" while the pane offered nothing but a `<pre>`
 * you could drag across, which is exactly the awkwardness the comment below
 * about wrapping was working around rather than solving. `CopyControls` puts a
 * real button in the caption bar, with the three states
 * `design/docs/design-notes.md` draws.
 *
 * This stays a SERVER component: only the caption row changes when the button
 * is pressed, so only the caption row crosses the client boundary.
 */
export function CodeBlock(props: CodeBlockProps) {
  return <CodePane {...props} controls={CopyControlsIsland} />
}

/** A section heading inside an operation — the reference's eyebrow label. */
export function SectionLabel({
  children,
  id,
}: {
  children: React.ReactNode
  id?: string
}) {
  return (
    <h3
      id={id}
      className="mt-5 mb-1.5 text-[11px] font-semibold tracking-wide text-(--el-text-secondary) uppercase"
    >
      {children}
    </h3>
  )
}

/** The parameter table — name + type + required-ness, where it goes, what it is. */
export function ParameterTable({
  parameters,
  labelledBy,
  descriptionLang,
}: {
  parameters: {
    name: string
    location: string
    required: boolean
    description?: string
    schema?: OpenApiSchema
  }[]
  labelledBy: string
  /** Marks the description cells (generated text) and nothing else. */
  descriptionLang?: string
}) {
  return (
    <div
      role="region"
      aria-labelledby={labelledBy}
      tabIndex={0}
      className="mb-4 overflow-x-auto"
    >
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {['Parameter', 'In', 'Description'].map((heading) => (
              <th
                key={heading}
                scope="col"
                className="border-b border-(--el-border) px-2.5 py-1.5 text-left text-[11px] font-semibold tracking-wide text-(--el-text-secondary) uppercase"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parameters.map((parameter) => (
            <tr key={`${parameter.location}:${parameter.name}`}>
              <td className="border-b border-(--el-border-soft) px-2.5 py-2 align-top">
                <span className="font-(family-name:--font-mono) text-[12.5px] text-(--el-text)">
                  {parameter.name}
                </span>
                <br />
                <span className="font-(family-name:--font-mono) text-[11.5px] text-(--el-text-secondary)">
                  {schemaTypeLabel(parameter.schema)} ·{' '}
                  {parameter.required ? 'required' : 'optional'}
                </span>
              </td>
              <td className="border-b border-(--el-border-soft) px-2.5 py-2 align-top font-(family-name:--font-mono) text-[11.5px] text-(--el-text-secondary)">
                {parameter.location}
              </td>
              <td
                lang={descriptionLang}
                className="border-b border-(--el-border-soft) px-2.5 py-2 align-top text-(--el-text-secondary)"
              >
                {parameter.description ?? ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * An object schema, as a table of its properties.
 *
 * When the schema is not an object with named properties — a bare array, a
 * scalar, a component with no shape of its own — there is nothing to tabulate
 * and the caller is told so by an empty render, so it can print the TYPE
 * instead. Rendering an empty table would say "this takes no fields", which is
 * a different and false statement.
 */
export function SchemaTable({
  schema,
  labelledBy,
  descriptionLang,
}: {
  schema: OpenApiSchema | undefined
  labelledBy: string
  /** Marks the description cells (generated text) and nothing else. */
  descriptionLang?: string
}) {
  const fields = describeSchema(schema)
  if (fields.length === 0) {
    return (
      <p className="mb-4 text-[13px] text-(--el-text-secondary)">
        <span className="font-(family-name:--font-mono)">
          {schemaTypeLabel(schema)}
        </span>
      </p>
    )
  }

  return (
    <div
      role="region"
      aria-labelledby={labelledBy}
      tabIndex={0}
      className="mb-4 overflow-x-auto"
    >
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {['Property', 'Type', 'Description'].map((heading) => (
              <th
                key={heading}
                scope="col"
                className="border-b border-(--el-border) px-2.5 py-1.5 text-left text-[11px] font-semibold tracking-wide text-(--el-text-secondary) uppercase"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field.name}>
              <td className="border-b border-(--el-border-soft) px-2.5 py-2 align-top">
                <span className="font-(family-name:--font-mono) text-[12.5px] text-(--el-text)">
                  {field.name}
                </span>
                <br />
                <span className="font-(family-name:--font-mono) text-[11.5px] text-(--el-text-secondary)">
                  {field.required ? 'required' : 'optional'}
                </span>
              </td>
              <td className="border-b border-(--el-border-soft) px-2.5 py-2 align-top font-(family-name:--font-mono) text-[11.5px] text-(--el-text-secondary)">
                {field.type}
                {field.enumValues ? (
                  <>
                    <br />
                    {field.enumValues.join(' · ')}
                  </>
                ) : null}
              </td>
              <td
                lang={descriptionLang}
                className="border-b border-(--el-border-soft) px-2.5 py-2 align-top text-(--el-text-secondary)"
              >
                {field.description ?? ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
