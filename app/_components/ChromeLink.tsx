/**
 * One link to a MOTIR.CO page from the chrome — the header, the footer and the
 * 404 room's doors.
 *
 * ⚠️ IT IS A PLAIN `<a>` ON EVERY HOST NOW (MOTIR-10643). Under Next it chose
 * between `next/link` (same-origin: prefetched, client-routed) and `<a>`
 * (another origin) per host (MOTIR-4372). The built site has no client router,
 * so every link is a document load and the two arms render the same element;
 * what still differs per host is the HREF, which `siteLinkFor` in
 * `lib/publicHost.ts` spells. The component stays so the chrome's links keep
 * one spelling, and so the Worker-routes story's live pages, which wear the
 * same chrome, keep it too.
 */
export function ChromeLink({
  href,
  children,
  ...rest
}: Readonly<
  {
    href: string
    children: React.ReactNode
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>
>) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}
