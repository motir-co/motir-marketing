import { describe, expect, it } from 'vitest'
import {
  APP_ORIGIN_ENV_VAR,
  MotirAppOriginError,
  parseAppOrigin,
} from '@/lib/appOrigin'

/*
 * MOTIR-1152, acceptance criterion 4: "the build fails with a named error when
 * that variable is unset (assert this with a test, not by inspection)".
 *
 * ⚠️ THIS ASSERTS `parseAppOrigin`, WHICH IS WHAT THE MODULE'S TOP-LEVEL
 * BINDING CALLS — and that is the whole guard, because the call is at MODULE
 * SCOPE. `lib/appOrigin.ts` ends with `export const APP_ORIGIN =
 * parseAppOrigin(process.env.PUBLIC_MOTIR_APP_ORIGIN)`, so an import of
 * that module under an unset variable throws before any component renders,
 * which is what fails `next build`. Testing the parser directly keeps the
 * error's identity and its message pinned without needing to fork a build.
 */
describe('parseAppOrigin', () => {
  it('throws a NAMED error when the variable is unset', () => {
    expect(() => parseAppOrigin(undefined)).toThrowError(MotirAppOriginError)
    expect(() => parseAppOrigin(undefined)).toThrowError(
      /PUBLIC_MOTIR_APP_ORIGIN is not set/,
    )
  })

  it('treats an empty or whitespace value as unset', () => {
    for (const blank of ['', '   ', '\n']) {
      expect(() => parseAppOrigin(blank)).toThrowError(MotirAppOriginError)
    }
  })

  it('names the variable in every message, so the failure is actionable', () => {
    const values = [
      undefined,
      'not a url',
      'ftp://app.motir.co',
      'https://app.motir.co/x',
    ]
    for (const value of values) {
      expect(() => parseAppOrigin(value)).toThrowError(
        new RegExp(APP_ORIGIN_ENV_VAR),
      )
    }
  })

  it('rejects a value that is not a URL', () => {
    expect(() => parseAppOrigin('app.motir.co')).toThrowError(/not a valid URL/)
  })

  it('rejects a non-http(s) scheme', () => {
    expect(() => parseAppOrigin('ftp://app.motir.co')).toThrowError(
      /must be http or https/,
    )
  })

  it('rejects an origin carrying a path, query or fragment', () => {
    // Each of these would compose into a broken door — `…/x/sign-in?draft=1`,
    // a dropped query, a fragment before the query.
    for (const value of [
      'https://app.motir.co/x',
      'https://app.motir.co/?a=1',
      'https://app.motir.co/#top',
    ]) {
      expect(() => parseAppOrigin(value)).toThrowError(/bare origin/)
    }
  })

  it('accepts a bare origin and strips a trailing slash', () => {
    expect(parseAppOrigin('https://app.motir.co')).toBe('https://app.motir.co')
    expect(parseAppOrigin('https://app.motir.co/')).toBe('https://app.motir.co')
    expect(parseAppOrigin('  https://app.motir.co/  ')).toBe(
      'https://app.motir.co',
    )
  })

  it('accepts http for local development', () => {
    expect(parseAppOrigin('http://localhost:3000')).toBe(
      'http://localhost:3000',
    )
  })
})
