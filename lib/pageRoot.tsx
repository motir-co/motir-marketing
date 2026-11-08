import type { ComponentType, ReactNode } from 'react'
import { SiteBody } from '@/app/_components/SiteDocument'
import { PageProvider, type PageValue } from '@/lib/copy'

/*
 * ONE PAGE, ONE REACT ROOT (MOTIR-10643).
 *
 * An Astro page renders exactly one React tree into `<body>`: this one. It
 * mounts `PageProvider` (the locale, catalogue and path every component reads),
 * wraps the page module in the layouts its route had under Next — outermost
 * first, each receiving `params` and the tree inside it as `children`, which
 * is the contract a Next `layout.tsx` already had — and puts the site's body
 * around it (`SiteBody`). Rendering it as one root is what lets context reach
 * every component, `async` page modules included: a component an `.astro`
 * file renders is a root of its own.
 */

/** A page module's default export: an (`async`) component of its `params`. */
export type PageComponent<Params> = ComponentType<{ params: Promise<Params> }>

/** A route layout: what a Next `layout.tsx` exported. */
export type LayoutComponent<Params> = ComponentType<{
  params: Promise<Params>
  children: ReactNode
}>

export interface PageRootProps<Params> {
  value: PageValue
  page: PageComponent<Params>
  layouts?: ReadonlyArray<LayoutComponent<Params>>
  params: Promise<Params>
}

export function PageRoot<Params>({
  value,
  page,
  layouts = [],
  params,
}: PageRootProps<Params>) {
  const Page = page
  const tree = layouts.reduceRight<ReactNode>(
    (inner, Layout) => <Layout params={params}>{inner}</Layout>,
    <Page params={params} />,
  )
  return (
    <PageProvider value={value}>
      <SiteBody lang={value.locale} description={value.copy.meta.description}>
        {tree}
      </SiteBody>
    </PageProvider>
  )
}
