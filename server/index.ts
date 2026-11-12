import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomBytes } from 'node:crypto'
import { getAddress, isAddress, isHash } from 'viem'
import { parseUsdc } from '../src/onchain-money'
import { INVOICE_ID_PATTERN, MAX_AMOUNT_USDC, MAX_MEMO_LENGTH, type InvoiceDto } from '../src/lib/payment'
import { countByMerchant, findByTxHash, getInvoice, initStore, listByMerchant, saveInvoice } from './store'
import { verifyPayment } from './chain'

const PORT = Number(process.env.PORT ?? 3001)
const MAX_BODY_BYTES = 4096
const MAX_INVOICES_PER_MERCHANT = 200

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'Request too large')
    chunks.push(chunk as Buffer)
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error()
    return parsed as Record<string, unknown>
  } catch {
    throw new HttpError(400, 'Body must be a JSON object')
  }
}

async function createInvoice(req: IncomingMessage): Promise<InvoiceDto> {
  const body = await readJson(req)
  const { merchant, amount, memo = '' } = body
  if (typeof merchant !== 'string' || !isAddress(merchant)) throw new HttpError(400, 'Enter a valid merchant address')
  if (typeof amount !== 'string') throw new HttpError(400, 'Enter an amount')
  if (typeof memo !== 'string' || memo.length > MAX_MEMO_LENGTH) throw new HttpError(400, `Note must be ${MAX_MEMO_LENGTH} characters or fewer`)

  let amountRaw: bigint
  try {
    amountRaw = parseUsdc(amount)
  } catch {
    throw new HttpError(400, 'Enter a valid USDC amount (up to 6 decimals)')
  }
  if (amountRaw <= 0n) throw new HttpError(400, 'Amount must be greater than zero')
  if (amountRaw > parseUsdc(MAX_AMOUNT_USDC)) throw new HttpError(400, `Amount can be at most ${MAX_AMOUNT_USDC} USDC`)

  const checksummed = getAddress(merchant)
  if (countByMerchant(checksummed) >= MAX_INVOICES_PER_MERCHANT) throw new HttpError(429, 'Invoice limit reached for this address')

  const invoice: InvoiceDto = {
    id: randomBytes(8).toString('hex'),
    merchant: checksummed,
    amountRaw: amountRaw.toString(),
    memo: memo.trim(),
    status: 'open',
    createdAt: Date.now(),
  }
  await saveInvoice(invoice)
  return invoice
}

async function verifyInvoice(id: string, req: IncomingMessage): Promise<InvoiceDto> {
  const invoice = getInvoice(id)
  if (!invoice) throw new HttpError(404, 'Invoice not found')
  if (invoice.status === 'paid') return invoice

  const { txHash } = await readJson(req)
  if (typeof txHash !== 'string' || !isHash(txHash)) throw new HttpError(400, 'Enter a valid transaction hash')
  if (findByTxHash(txHash)) throw new HttpError(409, 'That transaction was already used for an invoice')

  const result = await verifyPayment(invoice, txHash)
  if (!result.ok) throw new HttpError(result.code === 'pending' || result.code === 'not_found' ? 202 : 422, result.message)

  // Re-check after the async chain reads: another request may have settled this invoice meanwhile.
  const current = getInvoice(id)
  if (!current || current.status === 'paid' || findByTxHash(txHash)) return current ?? invoice

  const paid: InvoiceDto = { ...current, status: 'paid', payer: result.payer, txHash: txHash, paidAt: Date.now() }
  await saveInvoice(paid)
  return paid
}

async function route(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const parts = url.pathname.split('/').filter(Boolean)
  const method = req.method ?? 'GET'

  if (parts[0] === 'health' && method === 'GET') return send(res, 200, { ok: true })
  if (parts[0] !== 'invoices') throw new HttpError(404, 'Not found')

  if (parts.length === 1 && method === 'POST') return send(res, 201, await createInvoice(req))

  if (parts.length === 1 && method === 'GET') {
    const merchant = url.searchParams.get('merchant')
    if (!merchant || !isAddress(merchant)) throw new HttpError(400, 'merchant must be a valid address')
    return send(res, 200, listByMerchant(merchant))
  }

  const id = parts[1]
  if (!id || !INVOICE_ID_PATTERN.test(id)) throw new HttpError(404, 'Invoice not found')

  if (parts.length === 2 && method === 'GET') {
    const invoice = getInvoice(id)
    if (!invoice) throw new HttpError(404, 'Invoice not found')
    return send(res, 200, invoice)
  }

  if (parts.length === 3 && parts[2] === 'verify' && method === 'POST') {
    return send(res, 200, await verifyInvoice(id, req))
  }

  throw new HttpError(404, 'Not found')
}

await initStore()

createServer((req, res) => {
  route(req, res).catch((error: unknown) => {
    if (error instanceof HttpError) return send(res, error.status, { error: error.message })
    console.error('Unhandled error', error instanceof Error ? error.message : error)
    send(res, 500, { error: 'Something went wrong' })
  })
}).listen(PORT, () => console.log(`Invoice server listening on :${PORT}`))
