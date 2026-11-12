import { formatUsdc } from '@/onchain-money'

/** USDC base units to a display string with at least two decimals, e.g. "1.50". */
export function displayUsdc(raw: bigint): string {
  const [whole, fraction = ''] = formatUsdc(raw).split('.')
  return `${Number(whole).toLocaleString('en-US')}.${fraction.padEnd(2, '0')}`
}

export const shortAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`

export function timeAgo(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function parseOnchainError(error: unknown): string | null {
  const e = error as { message?: string; code?: number; shortMessage?: string } | null
  const message = (e?.shortMessage ?? e?.message ?? '').toLowerCase()
  if (e?.code === 4001 || message.includes('user rejected') || message.includes('user denied')) return null
  if (message.includes('insufficient funds') || message.includes('exceeds balance')) {
    return 'Insufficient balance. Add test USDC and try again.'
  }
  if (message.includes('reverted')) return 'The transfer failed onchain. Please try again.'
  if (message.includes('network') || message.includes('timeout')) return 'Network issue. Check your connection and retry.'
  return 'Something went wrong. Please try again.'
}
