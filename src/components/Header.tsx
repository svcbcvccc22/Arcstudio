import { TokenUSDC } from '@web3icons/react'
import { CircleDollarSign } from 'lucide-react'
import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'
import { useUsdcBalance } from '@/hooks/useUsdcBalance'
import { displayUsdc, shortAddress } from '@/lib/format'

export function Header({ onHome }: { onHome: () => void }) {
  const { address } = useAccount()
  const { data: balance } = useUsdcBalance(address)

  return (
    <header className="flex items-center justify-between py-5">
      <button onClick={onHome} className="flex min-h-[44px] items-center gap-2.5" aria-label="Arc Checkout home">
        <span className="grid size-8 place-items-center rounded-xl bg-ink text-white">
          <CircleDollarSign size={18} />
        </span>
        <span className="font-display text-lg font-bold tracking-tight">Arc Checkout</span>
      </button>

      <ConnectKitButton.Custom>
        {({ isConnected, show, address: connected }) => (
          <button
            onClick={show}
            className="glass flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-semibold tabular-nums"
          >
            {isConnected && connected ? (
              <>
                <TokenUSDC variant="branded" size={18} />
                {balance !== undefined && <span>{displayUsdc(balance)}</span>}
                <span className="font-mono text-xs font-medium text-slate-soft">{shortAddress(connected)}</span>
              </>
            ) : (
              'Connect wallet'
            )}
          </button>
        )}
      </ConnectKitButton.Custom>
    </header>
  )
}
