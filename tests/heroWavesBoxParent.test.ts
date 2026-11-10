import { afterEach, describe, expect, it } from 'vitest'
import { boxParent } from '@/app/_components/landing/HeroWaves'

/*
 * The hero waves size their canvas from the hero's box. On a built page the
 * canvas sits inside `<motir-island style="display:contents">`, which has no
 * box, so measuring the direct parent drew a 0×0 canvas and no waves.
 */

afterEach(() => {
  document.body.innerHTML = ''
})

describe('the box the hero waves fill', () => {
  it('is the hero, not the island wrapper around the canvas', () => {
    document.body.innerHTML =
      '<section id="hero"><motir-island style="display:contents"><canvas></canvas></motir-island></section>'
    expect(boxParent(document.querySelector('canvas')!)).toBe(
      document.getElementById('hero'),
    )
  })

  it('is the direct parent when nothing wraps the canvas', () => {
    document.body.innerHTML = '<section id="hero"><canvas></canvas></section>'
    expect(boxParent(document.querySelector('canvas')!)).toBe(
      document.getElementById('hero'),
    )
  })
})
