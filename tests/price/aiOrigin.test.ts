import { describe, expect, it } from 'vitest'
import { parseAiOrigin } from '@/lib/aiOrigin'

/* The motir-ai origin /price reads (MOTIR-8382): an origin or null, never a throw. */
describe('parseAiOrigin', () => {
  it.each([
    ['https://motir-ai.fly.dev', 'https://motir-ai.fly.dev'],
    [' http://127.0.0.1:4319 ', 'http://127.0.0.1:4319'],
    ['https://motir-ai.fly.dev/', 'https://motir-ai.fly.dev'],
  ])('reads %j as an origin', (raw, origin) => {
    expect(parseAiOrigin(raw)).toBe(origin)
  })

  it.each([
    undefined,
    '',
    'not a url',
    'ftp://motir-ai.fly.dev',
    'https://a.example/v1',
    'https://a.example/?x=1',
    'https://a.example/#x',
  ])('reads %j as no origin', (raw) => {
    expect(parseAiOrigin(raw)).toBeNull()
  })
})
