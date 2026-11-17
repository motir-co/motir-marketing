import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { boxParent } from '@motir/design-system'
import { HeroBackground } from '@/app/_components/landing/HeroBackground'

/*
 * The motir.co heroes draw the package's Wave (MOTIR-11610), gathered around
 * the same element the hand-kept HeroWaves gathered around.
 */

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('HeroBackground', () => {
  it('draws the Wave around the idea box by default', () => {
    const { container } = render(<HeroBackground />)
    const canvas = container.querySelector('canvas')!
    expect(canvas.dataset.background).toBe('wave')
    expect(canvas.dataset.backgroundFocus).toBe('hero-brief')
    expect(canvas.getAttribute('aria-hidden')).toBe('true')
  })

  it('gathers around the element a page names', () => {
    const { container } = render(<HeroBackground focusId="explore-search" />)
    expect(container.querySelector('canvas')!.dataset.backgroundFocus).toBe(
      'explore-search',
    )
  })
})

/*
 * On a built page the canvas sits inside `<motir-island style="display:contents">`,
 * which has no box: measuring the direct parent drew a 0×0 canvas and no waves.
 * The package's measure skips that wrapper, and this pins it for the island
 * markup this site writes.
 */
describe('the box the hero background fills', () => {
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
