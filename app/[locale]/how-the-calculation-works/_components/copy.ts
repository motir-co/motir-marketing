import type { Copy } from '@/lib/copy'

/** The `explainer` key group, as every explainer component reads it. */
export type ExplainerCopy = Copy['explainer']

/** The sections' anchors, in the design's order (`#s1` … `#s10`). */
export const SECTION_IDS = [
  's1',
  's2',
  's3',
  's4',
  's5',
  's6',
  's7',
  's8',
  's9',
  's10',
] as const

export type SectionId = (typeof SECTION_IDS)[number]

/** A section's two-digit number, as the contents list and the heading show it. */
export const sectionNumber = (index: number) =>
  String(index + 1).padStart(2, '0')
