import { ImmersiveTilt } from '@motir/design-system'
import { island } from '@/lib/island'
import { SiteHeader } from '../_components/SiteHeader'

/*
 * EVERY ISLAND A PAGE RENDERS, AT ITS BUILD-TIME CALL SITE (MOTIR-10643).
 *
 * A server-rendered component that places an interactive one renders the
 * island below rather than the component itself, and the page then ships the
 * component's JavaScript and nothing else. `lib/islands.ts` is the browser's
 * half of the same list, and `tests/islands.test.ts` holds each export here to
 * the registry entry of the same name.
 */

/** The site header: the Products menu, the Menu panel, the setup-prompt button and the language switcher. */
export const SiteHeaderIsland = island('SiteHeader', SiteHeader)

/**
 * The 3D / Immersive style's pointer tilt — an effect with no markup, mounted
 * once per page as `SiteDocument` did. Inert under every other style.
 */
export const ImmersiveTiltIsland = island('ImmersiveTilt', ImmersiveTilt)
