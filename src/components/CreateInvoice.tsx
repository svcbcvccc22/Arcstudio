import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TokenUSDC } from '@web3icons/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAccount } from 'wagmi'
import { useShareLink } from '@/hooks/useShareLink'
import { api } from '@/lib/api'
import { MAX_MEMO_LENGTH, type InvoiceDto } from '@/lib/payment'
import { parseUsdc } from '@/onchain-money'
import { Card, CopyButton, GhostButton, Label, PrimaryButton } from './ui'

const PRESETS = ['0.10', '0.50', '1', '5']
const AMOUNT_INPUT = /^\d{0,6}(\.\d{0,6})?$/

function isValidAmount(value: string): boolean {
  try {
    return parseUsdc(value) > 0n
  } catch {
    return false
  }
}

function CreatedLink({ invoice, onOpen }: { invoice: InvoiceDto; onOpen: (id: string) => void }) {
  const link = useShareLink(`/?invoice=${invoice.id}`)
  return (
    <div className="mt-5 rounded-2xl bg-ink/[0.04] p-4">
      <Label>Payment link ready</Label>
      <p className="mt-2 break-all font-mono text-xs text-ink/80">{link ?? 'Preparing link...'}</p>
      <div className="mt-3 flex gap-2">
        <CopyButton value={link} />
        <GhostButton onClick={() => onOpen(invoice.id)}>Open pay page</GhostButton>
      </div>
    </div>
  )
}

export function CreateInvoice({ onOpen }: { onOpen: (id: string) => void }) {
  const { address } = useAccount()
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [created, setCreated] = useState<InvoiceDto>()

  const create = useMutation({
    mutationFn: () => api.createInvoice({ merchant: address as string, amount, memo }),
    onSuccess: (invoice) => {
      setCreated(invoice)
      setAmount('')
      setMemo('')
      void queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: (error) => toast.error(error.message),
  })

  const valid = isValidAmount(amount)

  return (
    <Card>
      <Label>Request a payment</Label>
      <div className="mt-3 flex items-center gap-3">
        <TokenUSDC variant="branded" size={32} />
        <input
          inputMode="decimal"
          placeholder="0.00"
          aria-label="Amount in USDC"
          value={amount}
          onChange={(e) => AMOUNT_INPUT.test(e.target.value) && setAmount(e.target.value)}
          className="w-full min-w-0 bg-transparent font-display text-5xl font-bold tracking-tight tabular-nums outline-none placeholder:text-ink/20"
        />
        <span className="font-display text-lg font-semibold text-slate-soft">USDC</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => setAmount(preset)}
            className="min-h-[44px] rounded-full bg-white/70 px-4 text-sm font-semibold tabular-nums ring-1 ring-ink/10 transition hover:bg-white"
          >
            ${preset}
          </button>
        ))}
      </div>

      <input
        placeholder="What is this for? (optional)"
        aria-label="Note"
        maxLength={MAX_MEMO_LENGTH}
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        className="mt-4 min-h-[48px] w-full rounded-2xl bg-white/70 px-4 text-[15px] outline-none ring-1 ring-ink/10 focus:ring-2 focus:ring-mist"
      />

      <PrimaryButton className="mt-4" disabled={!address || !valid || create.isPending} onClick={() => create.mutate()}>
        {!address ? 'Connect a wallet to continue' : create.isPending ? 'Creating link...' : 'Create payment link'}
      </PrimaryButton>
      <p className="mt-3 text-center text-xs text-slate-soft">Funds go straight to {address ? 'your connected wallet' : 'your wallet'}.</p>

      {created && <CreatedLink invoice={created} onOpen={onOpen} />}
    </Card>
  )
}
