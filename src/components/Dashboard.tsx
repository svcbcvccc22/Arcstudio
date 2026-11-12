import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { useAccount } from 'wagmi'
import { api } from '@/lib/api'
import { displayUsdc, timeAgo } from '@/lib/format'
import { USDC_DECIMALS } from '@/onchain-facts'
import { Amount } from '@/onchain-money'
import { CreateInvoice } from './CreateInvoice'
import { Card, Label, StatusPill } from './ui'

export function Dashboard({ onOpen }: { onOpen: (id: string) => void }) {
  const { address } = useAccount()
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', address],
    queryFn: () => api.listInvoices(address as string),
    enabled: !!address,
    refetchInterval: 5000,
  })

  const paid = invoices?.filter((i) => i.status === 'paid') ?? []
  const received = Amount.sum(
    paid.map((i) => Amount.fromRaw(BigInt(i.amountRaw), USDC_DECIMALS)),
    USDC_DECIMALS,
  )

  return (
    <div className="space-y-4">
      <Card className="bg-ink p-6 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-mist">Received</p>
        <p className="mt-2 font-display text-5xl font-bold tracking-tight tabular-nums">
          ${displayUsdc(received.raw)}
        </p>
        <p className="mt-2 text-sm text-white/65">
          {address
            ? `${paid.length} paid, ${(invoices?.length ?? 0) - paid.length} awaiting payment`
            : 'Connect your wallet to accept USDC on Arc Testnet.'}
        </p>
      </Card>

      <CreateInvoice onOpen={onOpen} />

      <Card className="p-2">
        <div className="px-3 pb-1 pt-3">
          <Label>Payment links</Label>
        </div>
        {!address && <p className="px-3 py-6 text-sm text-slate-soft">Connect a wallet to see your payment links.</p>}
        {address && isLoading && <p className="px-3 py-6 text-sm text-slate-soft">Loading...</p>}
        {address && invoices?.length === 0 && (
          <p className="px-3 py-6 text-sm text-slate-soft">No payment links yet. Create your first one above.</p>
        )}
        <ul>
          {invoices?.map((invoice) => (
            <li key={invoice.id}>
              <button
                onClick={() => onOpen(invoice.id)}
                className="flex min-h-[60px] w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-white/70"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold">{invoice.memo || 'Payment'}</span>
                  <span className="block text-xs text-slate-soft">{timeAgo(invoice.createdAt)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-right">
                    <span className="block font-display text-base font-bold tabular-nums">
                      ${displayUsdc(BigInt(invoice.amountRaw))}
                    </span>
                    <StatusPill status={invoice.status} />
                  </span>
                  <ChevronRight size={16} className="text-slate-soft" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
