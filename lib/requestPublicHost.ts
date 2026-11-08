import { readPublicHost, type PublicHost } from '@/lib/publicHost'

/*
 * THE LIVE SURFACE'S ONE AMBIENT READ (MOTIR-4220 · moved by MOTIR-10643).
 *
 * This lived in `lib/publicHost.ts`. The built site's pages and chrome import
 * that module, and Vite resolves even a lazy `import('next/headers')` when it
 * bundles them, so the one function that reads a Next request moved here,
 * beside the live surface that calls it. The Worker-routes story replaces it
 * with the Worker's own request.
 */

/**
 * This request's address, for the async component at the top of a route.
 *
 * ⚠️ `next/headers` IS IMPORTED LAZILY, and that is not a style choice. It was
 * imported by `proxy.ts`, which runs in Next's proxy bundle where
 * `next/headers` is not available — a top-level import would throw there at
 * import time, before a single line of routing ran. The same lazy-import shape
 * `motir-core`'s CORS module needed for the same class of reason.
 *
 * ⚠️ AND IT DOES NOT CATCH. `headers()` throws outside a request scope, which is
 * also how Next reports a route being PRERENDERED when it needs to be dynamic —
 * so a fallback to {@link SITE_HOST} here would make a test harness and a real
 * static-render bug look identical, and the second one ships a `robots.txt`
 * frozen to whichever host built the image. A test that calls a route function
 * directly supplies the scope instead (`vi.mock('next/headers', …)`), which is
 * also what lets it choose which host it is asking as.
 */
export async function requestPublicHost(): Promise<PublicHost> {
  const { headers } = await import('next/headers')
  return readPublicHost(await headers())
}
