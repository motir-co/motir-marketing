/*
 * JSON INSIDE A `<script>` ELEMENT (MOTIR-10643).
 *
 * The layout writes the page's island context — the catalogue's browser
 * namespaces among it — into a `<script type="application/json">`. Copy is
 * text a translator writes, and a `</script>` or `<!--` inside it would end or
 * break the element early. Escaping `<`, `>` and `&` as `\u` sequences keeps
 * the JSON identical to `JSON.parse` and inert to the HTML parser, and the two
 * line separators JavaScript once treated as newlines go the same way.
 */
const UNSAFE: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
}

export function serializeJsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/g,
    (char) => UNSAFE[char]!,
  )
}
