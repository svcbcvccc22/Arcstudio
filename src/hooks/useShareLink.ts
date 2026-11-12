import { useEffect, useState } from 'react'
import { buildShareLink } from '@/lib/share'

/** Resolves the shareable URL for an in-app path. Stays `undefined` until the share base is known. */
export function useShareLink(path: string | null): string | undefined {
  const [link, setLink] = useState<{ path: string; url: string }>()

  useEffect(() => {
    if (!path) return
    let cancelled = false
    void buildShareLink(path).then((url) => {
      if (!cancelled) setLink({ path, url })
    })
    return () => {
      cancelled = true
    }
  }, [path])

  return path && link?.path === path ? link.url : undefined
}
