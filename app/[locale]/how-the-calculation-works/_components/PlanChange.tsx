import { Card } from '@motir/design-system'
import type { ExplainerCopy } from './copy'

/*
 * Section 8's plan-change blocks (design/explainer, panels 2 and 4): moving up
 * on mint, moving down on peach, side by side when wide and stacked — moving
 * up first — when narrow. No price or credit figure.
 */
export function PlanChange({ copy }: { copy: ExplainerCopy }) {
  const s8 = copy.s8
  const blocks = [
    {
      element: 'plan-change-up',
      tint: 'mint',
      title: s8.upTitle,
      lines: [s8.upBody, s8.upRenewal],
    },
    {
      element: 'plan-change-down',
      tint: 'peach',
      title: s8.downTitle,
      lines: [s8.downBody, s8.downClear],
    },
  ] as const
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {blocks.map((block) => (
          <Card
            key={block.element}
            tint={block.tint}
            data-element={block.element}
          >
            <div className="grid gap-2 text-sm text-(--el-text-strong)">
              <h3 className="m-0 text-base font-semibold">{block.title}</h3>
              {block.lines.map((line) => (
                <p key={line} className="m-0">
                  {line}
                </p>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <p className="m-0 max-w-prose text-sm text-(--el-text-secondary)">
        {s8.billingNote}
      </p>
    </div>
  )
}
