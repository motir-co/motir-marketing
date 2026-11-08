import type { APIRoute } from 'astro'
import { robotsTxt } from '@/lib/robots'

/*
 * `/robots.txt`, written once by `astro build` (MOTIR-10646). It was
 * `app/robots.ts`; `lib/robots.ts` writes the text Next serialized from it.
 * Workers static assets serve a `.txt` file as `text/plain`.
 */
export const prerender = true

export const GET: APIRoute = () =>
  new Response(robotsTxt(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
