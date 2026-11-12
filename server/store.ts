import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { InvoiceDto } from '../src/lib/payment'

const FILE = process.env.INVOICE_DB ?? join(process.cwd(), 'data', 'invoices.json')

const invoices = new Map<string, InvoiceDto>()
let ready: Promise<void> | undefined
let writing: Promise<void> = Promise.resolve()

async function load(): Promise<void> {
  try {
    const raw = await readFile(FILE, 'utf8')
    for (const invoice of JSON.parse(raw) as InvoiceDto[]) invoices.set(invoice.id, invoice)
  } catch {
    // First run: nothing stored yet.
  }
}

export function initStore(): Promise<void> {
  ready ??= load()
  return ready
}

/** Serialised, atomic write so a crash never leaves a half-written file. */
function persist(): Promise<void> {
  const snapshot = JSON.stringify([...invoices.values()])
  writing = writing.then(async () => {
    await mkdir(dirname(FILE), { recursive: true })
    const tmp = `${FILE}.tmp`
    await writeFile(tmp, snapshot)
    await rename(tmp, FILE)
  })
  return writing
}

export function getInvoice(id: string): InvoiceDto | undefined {
  return invoices.get(id)
}

export function listByMerchant(merchant: string, limit = 50): InvoiceDto[] {
  const key = merchant.toLowerCase()
  return [...invoices.values()]
    .filter((i) => i.merchant.toLowerCase() === key)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
}

export function countByMerchant(merchant: string): number {
  return listByMerchant(merchant, Number.MAX_SAFE_INTEGER).length
}

export function findByTxHash(txHash: string): InvoiceDto | undefined {
  const key = txHash.toLowerCase()
  return [...invoices.values()].find((i) => i.txHash?.toLowerCase() === key)
}

export async function saveInvoice(invoice: InvoiceDto): Promise<void> {
  invoices.set(invoice.id, invoice)
  await persist()
}
