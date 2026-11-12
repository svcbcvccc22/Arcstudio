/**
 * Shared between the browser and the invoice server, so both sides agree on
 * how an invoice is tied to a USDC transfer.
 *
 * A payment is a plain ERC-20 `transfer(merchant, amount)` whose calldata carries
 * the 8-byte invoice id as trailing bytes. The ABI decoder ignores the extra bytes,
 * and the server uses them to bind a transaction to exactly one invoice.
 */
import { encodeFunctionData, erc20Abi, type Hex } from 'viem'

export const ARC_TESTNET_CHAIN_ID = 5042002
export const INVOICE_ID_PATTERN = /^[0-9a-f]{16}$/
/** Hex length of `0x` + selector (4 bytes) + two 32-byte words. */
export const TRANSFER_CALLDATA_HEX_LENGTH = 2 + 8 + 64 + 64
export const MAX_AMOUNT_USDC = '10000'
export const MAX_MEMO_LENGTH = 80

export function buildPaymentData(to: `0x${string}`, amountRaw: bigint, invoiceId: string): Hex {
  if (!INVOICE_ID_PATTERN.test(invoiceId)) throw new Error('Invalid invoice id')
  const base = encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [to, amountRaw] })
  return `${base}${invoiceId}` as Hex
}

export type InvoiceStatus = 'open' | 'paid'

export interface InvoiceDto {
  id: string
  merchant: `0x${string}`
  /** USDC base units (6-decimal ERC-20 view) as a decimal string. */
  amountRaw: string
  memo: string
  status: InvoiceStatus
  createdAt: number
  payer?: `0x${string}`
  txHash?: `0x${string}`
  paidAt?: number
}
