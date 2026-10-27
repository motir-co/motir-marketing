import { Card } from '@motir/design-system'
import type { ExplainerFigures } from '@/lib/explainer/figures'
import type { ExplainerCopy } from './copy'
import type { FigureFormat } from './figureFormat'
import { FIGURE_FREE_HOST_NAME, PlanLines } from './PlanLadder'

/*
 * Section 6's Host plan card (design/explainer, panels 2 and 3): its name, pool
 * and both cadence prices from the catalog read, the sentence that it is a
 * regular plan the calculator never recommends, and the Host accounts rows —
 * Host's three AWS accounts, the only account count the page prints.
 */
export function HostPlan({
  copy,
  fmt,
  figures,
}: {
  copy: ExplainerCopy
  fmt: FigureFormat
  figures: ExplainerFigures | null
}) {
  const host = figures?.host ?? null
  return (
    <Card data-element="host-plan" data-plan="host">
      <div className="grid gap-3">
        <div className="grid gap-2">
          <p className="m-0 text-base font-semibold text-(--el-text-strong)">
            {host?.name ?? FIGURE_FREE_HOST_NAME}
          </p>
          <PlanLines
            copy={copy}
            fmt={fmt}
            plan={host}
            figureFree={copy.plan.figureFree}
          />
        </div>
        <p className="m-0 text-sm text-(--el-text)">{copy.s6.hostBody}</p>
        <ul
          data-element="host-accounts-rows"
          className="m-0 grid list-none gap-2 p-0"
        >
          {copy.s6.accounts.map((account) => (
            <li
              key={account.name}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-(--radius-control) border border-(--el-border) bg-(--el-page-bg) px-(--spacing-control-x-12) py-(--spacing-control-y-8) text-sm text-(--el-text)"
            >
              <span className="font-mono text-xs text-(--el-text-secondary)">
                {account.name}
              </span>
              <span>{account.use}</span>
            </li>
          ))}
        </ul>
        <p className="m-0 text-sm text-(--el-text-secondary)">
          {copy.s6.sharedFloor}
        </p>
      </div>
    </Card>
  )
}
