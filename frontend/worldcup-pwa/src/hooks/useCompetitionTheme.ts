import { useEffect } from 'react'

// Competitions we have themes for. Today there's only the World Cup; this is the seam
// where future competitions get mapped (e.g. per-group competition id → theme key).
export type Competition = 'worldcup'

export const DEFAULT_COMPETITION: Competition = 'worldcup'

/**
 * Applies a competition theme by setting `data-competition` on the document root while the
 * calling component is mounted, and clearing it on unmount. The base app keeps the default
 * lime theme; light/dark still works underneath via `data-theme`.
 */
export function useCompetitionTheme(competition: Competition | null = DEFAULT_COMPETITION) {
  useEffect(() => {
    const root = document.documentElement
    if (!competition) return
    root.setAttribute('data-competition', competition)
    return () => { root.removeAttribute('data-competition') }
  }, [competition])
}
