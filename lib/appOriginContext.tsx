import { createContext, createElement, useContext, type ReactNode } from 'react'
import { APP_ORIGIN } from '@/lib/appOrigin'

/*
 * THE APP ORIGIN A RENDER POINTS AT (MOTIR-10753).
 *
 * A built page bakes `app.motir.co` in at build (`lib/appOrigin.ts`). A page the
 * Worker renders reads it per request from the Worker's `MOTIR_APP_ORIGIN`
 * variable, so re-pointing the live surface is a variable change and never a
 * rebuild. The Worker's document mounts this provider with that value; a
 * component that links into the app reads `useAppOrigin()`, and a tree with no
 * provider — a built page, or an island in the browser — gets the build's
 * origin, which in production is the same value.
 */

const AppOriginContext = createContext<string | null>(null)

export function AppOriginProvider({
  value,
  children,
}: Readonly<{ value: string; children: ReactNode }>) {
  return createElement(AppOriginContext.Provider, { value }, children)
}

/** The app origin this render points at — the Worker's variable, else the build's. */
export function useAppOrigin(): string {
  return useContext(AppOriginContext) ?? APP_ORIGIN
}
