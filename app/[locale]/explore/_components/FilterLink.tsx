import type { ComponentProps } from 'react'
import { filterLinkRel } from '@/lib/crawlPolicy'

/**
 * A link to another state of the square — a rank, a window, a topic chip, a
 * cleared filter. `nofollow` whenever the address carries a query string, so a
 * crawler is not invited into the filter combinations (`lib/crawlPolicy.ts`).
 */
export function FilterLink(props: ComponentProps<'a'> & { href: string }) {
  return <a rel={filterLinkRel(props.href)} {...props} />
}
