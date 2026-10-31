'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ErrorState, Pill, Segmented } from '@motir/design-system'
import { useCopy } from '@/lib/copy'
import type { Cadence } from '@/lib/priceLadder'

/*
 * The price card's one client island (MOTIR-8382 · MOTIR-9684): the Monthly /
 * Annual toggle. Every plan card's two price blocks are already in the server
 * markup; the toggle only writes `data-cadence` on the wrapper, and each block
 * shows itself under `group-data-[cadence=…]/cadence:`. So the page's figures
 * render without JavaScript, at the design's default of Monthly (panel 2).
 * The Annual badge's wording arrives computed from the ladder (MOTIR-10156).
 */
export function PriceCadence({
  saveBadge,
  children,
}: {
  /** What annual saves, already worded from the ladder's prices; `null` shows no badge. */
  saveBadge: string | null
  children: ReactNode
}) {
  const words = useCopy().pricePage.plans
  const [cadence, setCadence] = useState<Cadence>('monthly')
  return (
    <div data-cadence={cadence} className="group/cadence grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label={words.cadenceLabel}
          value={cadence}
          onChange={(value) => setCadence(value as Cadence)}
          options={[
            { value: 'monthly', label: words.monthly },
            { value: 'annual', label: words.annual },
          ]}
        />
        {cadence === 'annual' && saveBadge !== null ? (
          <Pill className="border-transparent bg-(--el-tint-mint) text-(--el-text-strong)">
            {saveBadge}
          </Pill>
        ) : null}
      </div>
      {children}
    </div>
  )
}

/**
 * The ladder read failed (design panel 4): no figure, a retry that re-renders
 * the route so the server reads the ladder again.
 */
export function PlansUnavailable() {
  const words = useCopy().pricePage.plans
  const router = useRouter()
  return (
    <ErrorState
      title={words.unavailableTitle}
      retry={() => router.refresh()}
      retryLabel={words.retry}
    />
  )
}
