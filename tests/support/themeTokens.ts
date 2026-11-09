import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

/*
 * A token resolver for `@motir/design-system`'s `theme.css` — the harness the
 * AA matrix is measured with (MOTIR-1043).
 *
 * ⚠️ WHY A RESOLVER AND NOT A BROWSER. The matrix is 19 styles × 14 palettes ×
 * 10 pairings × 2 themes = 5,320 cells (at 0.22.0); a reader cannot check that and this
 * repository has no browser lane (`ci.yml` runs lint · typecheck · build ·
 * test, and its own header says not to declare a gate before its job exists).
 * jsdom computes no `var()` and no `color-mix()`, so the values have to be
 * resolved from the stylesheet itself. That is tractable here because the file
 * uses exactly four value forms — a hex, `rgb()`/`rgba()`, `var()` and
 * `color-mix(in srgb, …)` — and its axis blocks are flat, unnested rules.
 *
 * ⚠️ AND THE HARNESS IS ASSERTED BEFORE IT IS TRUSTED. A first run of this
 * sweep during the design pass reported the theme as 10/10 failing in dark:
 * the fixed inks are `color-mix()`, which a browser computes to
 * `color(srgb 0.567 0.519 0.910)`, and the parser read those 0–1 floats as
 * 0–255. A fixed theme and a catastrophically broken one are one parser bug
 * apart, so `tests/aaMatrix.test.ts` opens by reproducing three independently
 * recorded numbers — 5.76 / 6.29 / 4.70 — before it believes a red cell.
 *
 * SCOPE, stated rather than implied: `@media` blocks are NOT applied, so every
 * number here is the DEFAULT condition. `prefers-contrast: more` can only
 * raise contrast, so measuring without it is the strict reading.
 */

const require_ = createRequire(import.meta.url)

/** The INSTALLED package's stylesheet — never motir-core's source copy. */
export const THEME_CSS_PATH = require_.resolve('@motir/design-system/theme.css')

const CSS = readFileSync(THEME_CSS_PATH, 'utf8')

interface Rule {
  /** One compound selector, e.g. `[data-palette='cobalt'][data-theme='dark']`. */
  selector: string
  /** Attribute + pseudo-class count — the only specificity column in play. */
  specificity: number
  order: number
  decls: Map<string, string>
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * Split the stylesheet into its TOP-LEVEL rules. `@theme` is emitted onto
 * `:root` by Tailwind, so it is read as one; `@media` and `@keyframes` are
 * skipped (see the scope note above).
 */
function topLevelRules(css: string): { prelude: string; body: string }[] {
  const out: { prelude: string; body: string }[] = []
  let depth = 0
  let preludeStart = 0
  let bodyStart = 0
  for (let i = 0; i < css.length; i += 1) {
    const c = css[i]
    if (c === '{') {
      if (depth === 0) bodyStart = i + 1
      depth += 1
    } else if (c === '}') {
      depth -= 1
      if (depth === 0) {
        out.push({
          prelude: css.slice(preludeStart, bodyStart - 1).trim(),
          body: css.slice(bodyStart, i),
        })
        preludeStart = i + 1
      }
    } else if (c === ';' && depth === 0) {
      preludeStart = i + 1
    }
  }
  return out
}

function parseDecls(body: string): Map<string, string> {
  const decls = new Map<string, string>()
  let depth = 0
  let start = 0
  const flush = (chunk: string) => {
    const colon = chunk.indexOf(':')
    if (colon === -1) return
    const prop = chunk.slice(0, colon).trim()
    if (!prop.startsWith('--')) return
    decls.set(prop, chunk.slice(colon + 1).trim())
  }
  for (let i = 0; i < body.length; i += 1) {
    const c = body[i]
    if (c === '(') depth += 1
    else if (c === ')') depth -= 1
    else if (c === ';' && depth === 0) {
      flush(body.slice(start, i))
      start = i + 1
    }
  }
  flush(body.slice(start))
  return decls
}

/**
 * The axes an element carries. A selector matches only when it is built
 * ENTIRELY out of `:root` and `[data-<axis>='<id>']` parts — anything with a
 * class, an element or a combinator is a component rule and cannot apply to
 * `<html>`.
 */
export interface Axes {
  theme: 'light' | 'dark'
  palette: string
  style: string
  type: string
}

const AXIS_ATTR = /^\[data-(theme|palette|style|type)='([^']+)'\]$/
const PART = /:root|\[[^\]]+\]/g

function matches(selector: string, axes: Axes): boolean {
  const parts = selector.match(PART)
  if (!parts) return false
  // Every character must belong to a part — otherwise the selector carries a
  // class, an element or a combinator and is not about `<html>`.
  if (parts.join('') !== selector.replace(/\s+/g, '')) return false
  for (const part of parts) {
    if (part === ':root') continue
    const m = AXIS_ATTR.exec(part)
    if (!m) return false
    const [, axis, value] = m
    if (axis === 'theme' && axes.theme !== value) return false
    if (axis === 'palette' && axes.palette !== value) return false
    if (axis === 'style' && axes.style !== value) return false
    if (axis === 'type' && axes.type !== value) return false
  }
  return true
}

function specificityOf(selector: string): number {
  return (selector.match(PART) ?? []).length
}

const RULES: Rule[] = (() => {
  const rules: Rule[] = []
  let order = 0
  for (const { prelude, body } of topLevelRules(stripComments(CSS))) {
    if (prelude.startsWith('@')) {
      if (prelude !== '@theme') continue
      rules.push({
        selector: ':root',
        specificity: 1,
        order: (order += 1),
        decls: parseDecls(body),
      })
      continue
    }
    const decls = parseDecls(body)
    if (decls.size === 0) {
      order += 1
      continue
    }
    order += 1
    for (const selector of prelude.split(',').map((s) => s.trim())) {
      if (!selector) continue
      rules.push({
        selector,
        specificity: specificityOf(selector),
        order,
        decls,
      })
    }
  }
  return rules
})()

/** Every custom property that resolves on `<html>` under these axes. */
export function customProperties(axes: Axes): Map<string, string> {
  const winners = new Map<string, { spec: number; order: number }>()
  const values = new Map<string, string>()
  for (const rule of RULES) {
    if (!matches(rule.selector, axes)) continue
    for (const [prop, value] of rule.decls) {
      const prev = winners.get(prop)
      if (
        prev &&
        (prev.spec > rule.specificity ||
          (prev.spec === rule.specificity && prev.order > rule.order))
      ) {
        continue
      }
      winners.set(prop, { spec: rule.specificity, order: rule.order })
      values.set(prop, value)
    }
  }
  return values
}

/** Every `[data-<axis>='<id>']` value the stylesheet declares a block for. */
export function declaredAxisValues(axis: string): Set<string> {
  const found = new Set<string>()
  const re = new RegExp(`\\[data-${axis}='([^']+)'\\]`, 'g')
  for (const [, value] of stripComments(CSS).matchAll(re)) found.add(value)
  return found
}

/** Every `--font-*-source` variable the stylesheet READS through `var()`. */
export function referencedFontSources(): Set<string> {
  const found = new Set<string>()
  for (const [, name] of stripComments(CSS).matchAll(
    /var\(\s*(--font-[a-z0-9-]*-source)/g,
  )) {
    found.add(name)
  }
  return found
}

/** Rules whose selector targets a `[data-style]` block, with their declarations. */
export function styleBlockDeclarations(): string[] {
  return RULES.filter((r) => r.selector.includes('[data-style='))
    .flatMap((r) => [...r.decls.keys()])
    .sort()
}

/* ── Colour ─────────────────────────────────────────────────────────────── */

/** Straight-alpha sRGB, each channel 0–1. */
export type Rgba = [r: number, g: number, b: number, a: number]

function parseHex(value: string): Rgba | null {
  const m = /^#([0-9a-f]{3,8})$/i.exec(value)
  if (!m) return null
  let hex = m[1]
  if (hex.length === 3 || hex.length === 4) {
    hex = [...hex].map((ch) => ch + ch).join('')
  }
  if (hex.length !== 6 && hex.length !== 8) return null
  const n = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255
  return [n(0), n(2), n(4), hex.length === 8 ? n(6) : 1]
}

function parseRgb(value: string): Rgba | null {
  const m = /^rgba?\(([^)]+)\)$/i.exec(value)
  if (!m) return null
  const parts = m[1].split(/[,/\s]+/).filter(Boolean)
  if (parts.length < 3) return null
  const chan = (s: string) =>
    s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s) / 255
  return [
    chan(parts[0]),
    chan(parts[1]),
    chan(parts[2]),
    parts[3] === undefined
      ? 1
      : parts[3].endsWith('%')
        ? parseFloat(parts[3]) / 100
        : parseFloat(parts[3]),
  ]
}

/** Split a comma list at DEPTH ZERO, so nested `var()` / `color-mix()` survive. */
function splitTopLevel(input: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < input.length; i += 1) {
    const c = input[i]
    if (c === '(') depth += 1
    else if (c === ')') depth -= 1
    else if (c === ',' && depth === 0) {
      out.push(input.slice(start, i).trim())
      start = i + 1
    }
  }
  out.push(input.slice(start).trim())
  return out
}

function matchFunction(value: string, name: string): string | null {
  if (!value.toLowerCase().startsWith(`${name}(`)) return null
  let depth = 0
  for (let i = name.length; i < value.length; i += 1) {
    if (value[i] === '(') depth += 1
    else if (value[i] === ')') {
      depth -= 1
      if (depth === 0) {
        // A trailing tail would mean this is not a single function value.
        return value.slice(i + 1).trim() === ''
          ? value.slice(name.length + 1, i)
          : null
      }
    }
  }
  return null
}

export class UnresolvedTokenError extends Error {}

/**
 * Resolve a declaration value to straight-alpha sRGB, following `var()` chains
 * and `color-mix(in srgb, …)`. Anything it cannot parse THROWS rather than
 * returning a plausible number — an unresolved custom property computes to the
 * initial ink in a browser, which is exactly the pair of believable,
 * AA-passing figures that hid a missing token during the design pass.
 */
export function resolveColor(
  value: string,
  props: Map<string, string>,
  seen: Set<string> = new Set(),
): Rgba {
  const raw = value.trim()

  const hex = parseHex(raw)
  if (hex) return hex
  const rgb = parseRgb(raw)
  if (rgb) return rgb

  const varArgs = matchFunction(raw, 'var')
  if (varArgs !== null) {
    const [name, ...rest] = splitTopLevel(varArgs)
    const fallback = rest.join(', ')
    if (!seen.has(name)) {
      const declared = props.get(name)
      if (declared !== undefined && declared !== '') {
        return resolveColor(declared, props, new Set([...seen, name]))
      }
    }
    if (fallback) return resolveColor(fallback, props, seen)
    throw new UnresolvedTokenError(`unresolved custom property: ${name}`)
  }

  const mixArgs = matchFunction(raw, 'color-mix')
  if (mixArgs !== null) {
    const [space, first, second] = splitTopLevel(mixArgs)
    if (space.trim().toLowerCase() !== 'in srgb') {
      throw new UnresolvedTokenError(`unsupported mix space: ${space}`)
    }
    const read = (part: string): { color: Rgba; pct: number | null } => {
      const m = /\s(\d+(?:\.\d+)?)%$/.exec(part)
      return {
        color: resolveColor(m ? part.slice(0, m.index) : part, props, seen),
        pct: m ? parseFloat(m[1]) : null,
      }
    }
    const a = read(first)
    const b = read(second)
    let pa = a.pct
    let pb = b.pct
    if (pa === null && pb === null) [pa, pb] = [50, 50]
    else if (pa === null) pa = 100 - (pb as number)
    else if (pb === null) pb = 100 - pa
    const total = (pa as number) + (pb as number)
    const wa = (pa as number) / total
    const wb = (pb as number) / total
    return [0, 1, 2, 3].map((i) => a.color[i] * wa + b.color[i] * wb) as Rgba
  }

  throw new UnresolvedTokenError(`unparsed colour: ${raw}`)
}

/** Composite a possibly-translucent ink over an opaque backdrop. */
function over(fg: Rgba, bg: Rgba): Rgba {
  const a = fg[3]
  return [
    fg[0] * a + bg[0] * (1 - a),
    fg[1] * a + bg[1] * (1 - a),
    fg[2] * a + bg[2] * (1 - a),
    1,
  ]
}

function relativeLuminance([r, g, b]: Rgba): number {
  const lin = (v: number) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** WCAG 2.x contrast ratio, to two decimals — the same rounding the asset quotes. */
export function contrastRatio(ink: Rgba, surface: Rgba): number {
  const composited = over(ink, surface)
  const [hi, lo] = [
    relativeLuminance(composited),
    relativeLuminance(surface),
  ].sort((x, y) => y - x)
  return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2))
}

/** The contrast of one token pair under one set of axes. */
export function tokenContrast(
  inkToken: string,
  surfaceToken: string,
  axes: Axes,
): number {
  const props = customProperties(axes)
  const read = (token: string) => {
    const declared = props.get(token)
    if (declared === undefined) {
      throw new UnresolvedTokenError(`token not declared: ${token}`)
    }
    return resolveColor(declared, props)
  }
  return contrastRatio(read(inkToken), read(surfaceToken))
}
