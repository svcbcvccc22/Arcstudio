import { createPublicClient, decodeFunctionData, erc20Abi, http, type Hex } from 'viem'
import { arcTestnet } from 'viem/chains'
import { requireChain, getUsdc } from '../src/onchain-facts'
import { ARC_TESTNET_CHAIN_ID, INVOICE_ID_PATTERN, TRANSFER_CALLDATA_HEX_LENGTH, type InvoiceDto } from '../src/lib/payment'

const COMPASS_CHAIN = 'Arc_Testnet'

function resolveRpcUrl(): string {
  const base = process.env.RPC_PROXY_BASE_URL
  const chains = (process.env.RPC_PROXY_CHAINS || '').split(',')
  if (base && process.env.RPC_PROXY_TOKEN && chains.indexOf(COMPASS_CHAIN) !== -1) {
    return `${base}/api/rpc/${COMPASS_CHAIN}?_rpc_token=${process.env.RPC_PROXY_TOKEN}`
  }
  return requireChain(ARC_TESTNET_CHAIN_ID).rpcUrls[0]
}

const usdc = getUsdc(ARC_TESTNET_CHAIN_ID)
if (!usdc) throw new Error('USDC is not registered for Arc Testnet')
export const USDC_ADDRESS = usdc.address.toLowerCase()

const client = createPublicClient({ chain: arcTestnet, transport: http(resolveRpcUrl()) })

export type VerifyResult =
  | { ok: true; payer: `0x${string}` }
  | { ok: false; code: 'pending' | 'not_found' | 'reverted' | 'wrong_token' | 'wrong_invoice' | 'wrong_recipient' | 'underpaid'; message: string }

const fail = (code: Extract<VerifyResult, { ok: false }>['code'], message: string): VerifyResult => ({ ok: false, code, message })

/** Confirms that `txHash` is a successful USDC transfer to this invoice's merchant, tagged with this invoice's id. */
export async function verifyPayment(invoice: InvoiceDto, txHash: Hex): Promise<VerifyResult> {
  const tx = await client.getTransaction({ hash: txHash }).catch(() => null)
  if (!tx) return fail('not_found', 'Transaction not found yet. Try again in a moment.')

  if (tx.to?.toLowerCase() !== USDC_ADDRESS) return fail('wrong_token', 'That transaction is not a USDC transfer.')

  const input = tx.input.toLowerCase()
  const tag = input.slice(TRANSFER_CALLDATA_HEX_LENGTH)
  if (input.length !== TRANSFER_CALLDATA_HEX_LENGTH + 16 || !INVOICE_ID_PATTERN.test(tag) || tag !== invoice.id) {
    return fail('wrong_invoice', 'That payment was not made for this invoice.')
  }

  let decoded
  try {
    decoded = decodeFunctionData({ abi: erc20Abi, data: input.slice(0, TRANSFER_CALLDATA_HEX_LENGTH) as Hex })
  } catch {
    return fail('wrong_token', 'That transaction is not a USDC transfer.')
  }
  if (decoded.functionName !== 'transfer') return fail('wrong_token', 'That transaction is not a USDC transfer.')

  const [to, value] = decoded.args
  if (to.toLowerCase() !== invoice.merchant.toLowerCase()) return fail('wrong_recipient', 'Paid to a different address.')
  if (value < BigInt(invoice.amountRaw)) return fail('underpaid', 'The amount paid is less than the invoice total.')

  const receipt = await client.getTransactionReceipt({ hash: txHash }).catch(() => null)
  if (!receipt) return fail('pending', 'Waiting for the transaction to be confirmed.')
  if (receipt.status !== 'success') return fail('reverted', 'The transaction failed onchain.')

  return { ok: true, payer: tx.from }
}
