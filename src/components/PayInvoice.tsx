import { useQuery } from '@tanstack/react-query'
import { TokenUSDC } from '@web3icons/react'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, ExternalLink } from 'lucide-react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { usePayInvoice } from '@/hooks/usePayInvoice'
import { useUsdcBalance } from '@/hooks/useUsdcBalance'
import { ApiError, api } from '@/lib/api'
import { displayUsdc, shortAddress, timeAgo } from '@/lib/format'
import { ARC_TESTNET_CHAIN_ID, type InvoiceDto } from '@/lib/payment'
import { buildAddressExplorerUrl, buildTxExplorerUrl } from '@/onchain-facts'
import { Card, Label, PrimaryButton, StatusPill } from './ui'

function Receipt({ invoice }: { invoice: InvoiceDto }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-2xl bg-emerald-50 p-4">
      <div className="flex items-center gap-2 font-semibold text-emerald-800">
        <CheckCircle2 size={18} /> Payment received
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        {invoice.payer && (
          <div className="flex justify-between">
            <dt className="text-slate-soft">From</dt>
            <dd className="font-mono text-xs">{shortAddress(invoice.payer)}</dd>
          </div>
        )}
        {invoice.paidAt && (
          <div className="flex justify-between">
            <dt className="text-slate-soft">When</dt>
            <dd>{timeAgo(invoice.paidAt)}</dd>
          </div>
        )}
      </dl>
      {invoice.txHash && (
        <a
          href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, invoice.txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-emerald-800 underline-offset-2 hover:underline"
        >
          View on explorer <ExternalLink size={14} />
        </a>
      )}
    </motion.div>
  )
}

function PayAction({ invoice }: { invoice: InvoiceDto }) {
  const { address, isConnected } = useAccount()
  const { data: balance } = useUsdcBalance(address)
  const flow = usePayInvoice(invoice)
  const amount = BigInt(invoice.amountRaw)
  const insufficient = isConnected && balance !== undefined && balance < amount

  if (!isConnected) {
    return (
      <ConnectKitButton.Custom>
        {({ show }) => <PrimaryButton onClick={show}>Connect wallet to pay</PrimaryButton>}
      </ConnectKitButton.Custom>
    )
  }

  const busy = flow.isSigning || flow.isConfirming || flow.isVerifying || flow.isSwitching
  const label = flow.isWrongChain
    ? 'Switch to Arc Testnet'
    : flow.isSigning
      ? 'Confirm in your wallet...'
      : flow.isConfirming
        ? 'Waiting for confirmation...'
        : flow.isVerifying
          ? 'Confirming payment...'
          : insufficient
            ? 'Insufficient USDC'
            : `Pay $${displayUsdc(amount)} USDC`

  return (
    <div>
      <PrimaryButton onClick={flow.pay} disabled={busy || (insufficient && !flow.isWrongChain)}>
        {label}
      </PrimaryButton>
      {insufficient && !flow.isWrongChain && (
        <p className="mt-3 text-center text-sm text-slate-soft">
          You have ${displayUsdc(balance)} USDC. Use <span className="font-semibold">Get test USDC</span> in the sidebar to top up.
        </p>
      )}
      {flow.error && <p className="mt-3 text-center text-sm text-red-700">{flow.error}</p>}
    </div>
  )
}

export function PayInvoice({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: invoice, error, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.getInvoice(id),
    refetchInterval: (query) => (query.state.data?.status === 'paid' ? false : 4000),
    retry: (count, e) => !(e instanceof ApiError && e.status === 404) && count < 2,
  })

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-slate-soft hover:text-ink">
        <ArrowLeft size={16} /> Back to dashboard
      </button>

      <Card className="p-6">
        {isLoading && <p className="py-10 text-center text-sm text-slate-soft">Loading invoice...</p>}
        {error && (
          <p className="py-10 text-center text-sm text-slate-soft">
            {error instanceof ApiError && error.status === 404 ? 'This payment link does not exist.' : 'Could not load this invoice.'}
          </p>
        )}
        {invoice && (
          <>
            <div className="flex items-center justify-between">
              <Label>{invoice.memo || 'Payment request'}</Label>
              <StatusPill status={invoice.status} />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <TokenUSDC variant="branded" size={36} />
              <p className="font-display text-6xl font-bold tracking-tight tabular-nums">{displayUsdc(BigInt(invoice.amountRaw))}</p>
            </div>
            <p className="mt-1 text-sm text-slate-soft">USDC on Arc Testnet</p>

            <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 text-sm ring-1 ring-ink/10">
              <span className="text-slate-soft">Pay to</span>
              <a
                href={buildAddressExplorerUrl(ARC_TESTNET_CHAIN_ID, invoice.merchant)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs font-medium hover:underline"
              >
                {shortAddress(invoice.merchant)}
              </a>
            </div>

            <div className="mt-5">{invoice.status === 'paid' ? <Receipt invoice={invoice} /> : <PayAction invoice={invoice} />}</div>
          </>
        )}
      </Card>
    </div>
  )
}
