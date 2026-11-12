import type { InvoiceDto } from './payment'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<{ status: number; data: T }> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Request failed')
  return { status: res.status, data }
}

export const api = {
  createInvoice: async (input: { merchant: string; amount: string; memo: string }) =>
    (await request<InvoiceDto>('/invoices', { method: 'POST', body: JSON.stringify(input) })).data,

  getInvoice: async (id: string) => (await request<InvoiceDto>(`/invoices/${id}`)).data,

  listInvoices: async (merchant: string) =>
    (await request<InvoiceDto[]>(`/invoices?merchant=${encodeURIComponent(merchant)}`)).data,

  /** Resolves to the paid invoice, or `null` when the server is still waiting for the transaction. */
  verifyInvoice: async (id: string, txHash: string): Promise<InvoiceDto | null> => {
    try {
      const { status, data } = await request<InvoiceDto>(`/invoices/${id}/verify`, {
        method: 'POST',
        body: JSON.stringify({ txHash }),
      })
      return status === 200 ? data : null
    } catch (error) {
      if (error instanceof ApiError && error.status === 202) return null
      throw error
    }
  },
}
