import { useCallback, useEffect, useState } from 'react'
import { INVOICE_ID_PATTERN } from './payment'

function readInvoiceParam(): string | null {
  const id = new URLSearchParams(window.location.search).get('invoice')
  return id && INVOICE_ID_PATTERN.test(id) ? id : null
}

/** Tiny query-string router: `/?invoice=<id>` shows the pay page, `/` shows the dashboard. */
export function useInvoiceRoute(): [string | null, (id: string | null) => void] {
  const [invoiceId, setInvoiceId] = useState<string | null>(readInvoiceParam)

  useEffect(() => {
    const onPop = () => setInvoiceId(readInvoiceParam())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((id: string | null) => {
    window.history.pushState({}, '', id ? `/?invoice=${id}` : '/')
    setInvoiceId(id)
    window.scrollTo({ top: 0 })
  }, [])

  return [invoiceId, navigate]
}
