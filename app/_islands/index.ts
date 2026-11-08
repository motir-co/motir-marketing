import { ImmersiveTilt } from '@motir/design-system'
import { island } from '@/lib/island'
import { CopyControls } from '../[locale]/docs/_components/CopyControls'
import { DocsRail } from '../[locale]/docs/_components/DocsRail'
import { SetupSteps } from '../[locale]/docs/(guides)/sandbox/SetupSteps'
import { RackStage } from '../[locale]/how-it-works/_components/RackStage'
import { StackArt } from '../[locale]/how-to-use/_components/StackArt'
import { DesignShowcase } from '../_components/DesignShowcase'
import { HeroBrief } from '../_components/landing/HeroBrief'
import { HeroWaves } from '../_components/landing/HeroWaves'
import { Calculator } from '../_components/price/Calculator'
import {
  PlansUnavailable,
  PriceCadence,
} from '../_components/price/PriceCadence'
import { SetupPromptButton } from '../_components/SetupPromptButton'
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

/** The landing's and the product pages' brief box (MOTIR-10644). */
export const HeroBriefIsland = island<
  NonNullable<Parameters<typeof HeroBrief>[0]>
>('HeroBrief', HeroBrief)

/** The wave lines behind a hero, drawn from the Motir mark. */
export const HeroWavesIsland = island('HeroWaves', HeroWaves)

/** The price page's credit calculator, which reads motir-ai in the browser. */
export const CalculatorIsland = island('Calculator', Calculator)

/**
 * The price card's Monthly / Annual toggle. The plan cards it wraps are its
 * children, so they stay server-rendered markup in its slot.
 */
export const PriceCadenceIsland = island('PriceCadence', PriceCadence)

/** The price card's unavailable state and its retry. */
export const PlansUnavailableIsland = island(
  'PlansUnavailable',
  PlansUnavailable,
)

/** `/how-it-works`'s rack, with the workflow rack inside it. */
export const RackStageIsland = island('RackStage', RackStage)

/** One `/how-to-use` way's stack drawing, which fits its labels in place. */
export const StackArtIsland = island('StackArt', StackArt)

/** `/design`'s showcase and its appearance pickers. */
export const DesignShowcaseIsland = island('DesignShowcase', DesignShowcase)

/** `/docs`'s setup-prompt button (MOTIR-10645). */
export const SetupPromptButtonIsland = island(
  'SetupPromptButton',
  SetupPromptButton,
)

/**
 * The docs rail: its filter, and the current page and operation marked from
 * the page's own path (MOTIR-10645).
 */
export const DocsRailIsland = island('DocsRail', DocsRail)

/** A docs code pane's caption row: the copy button and its failure note. */
export const CopyControlsIsland = island('CopyControls', CopyControls)

/**
 * `/docs/sandbox`'s agent picker and the setup steps it rewrites. Its words
 * are the document's rendered parts, which travel as markup.
 */
export const SetupStepsIsland = island('SetupSteps', SetupSteps)
