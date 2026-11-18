'use client'

import { Shuffle } from 'lucide-react'
import { buttonVariants, cn } from '@motir/design-system'
import { useCopy } from '@/lib/copy'
import { useVisitAppearance } from '@/lib/useVisitAppearance'

/*
 * The small button beside the Design link: one click restyles the whole site
 * with a random style and palette for this visit, as a `/design` pick would
 * (`shuffleVisitAppearance`). It is drawn FILLED (the primary accent pair,
 * round, raised) so it stands out from the text links around it; its icon
 * turns on hover unless reduced motion is asked for. `look="row"` is the Menu
 * panel's labelled row.
 */
export function ShuffleDesignButton({
  look = 'icon',
  className,
}: {
  look?: 'icon' | 'row'
  className?: string
}) {
  const copy = useCopy()
  const { shuffle } = useVisitAppearance()
  const label = copy.nav.shuffleDesign

  return look === 'row' ? (
    <button
      type="button"
      onClick={shuffle}
      className={cn(
        'inline-flex items-center gap-2 text-left text-[17px] font-medium text-(--el-text) hover:text-(--el-accent-on-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-accent-on-surface)',
        className,
      )}
    >
      <Shuffle aria-hidden="true" className="size-4" />
      {label}
    </button>
  ) : (
    <button
      type="button"
      onClick={shuffle}
      aria-label={label}
      title={label}
      className={cn(
        buttonVariants({ variant: 'primary', size: 'sm' }),
        'group w-8 shrink-0 rounded-full px-0 shadow-(--shadow-elevated) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-accent-on-surface)',
        className,
      )}
    >
      <Shuffle
        aria-hidden="true"
        className="size-4 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:rotate-180"
      />
    </button>
  )
}
