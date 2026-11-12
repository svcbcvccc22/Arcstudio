import { Check, Copy } from 'lucide-react'
import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { toast } from 'sonner'
import clsx from 'clsx'
import type { InvoiceStatus } from '@/lib/payment'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={clsx('glass rounded-3xl p-5', className)}>{children}</section>
}

export function Label({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-soft">{children}</p>
}

export function PrimaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={clsx(
        'min-h-[52px] w-full rounded-2xl bg-ink px-5 text-[15px] font-semibold text-white transition',
        'hover:bg-[#1B2C4D] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-ink/25',
        className,
      )}
    />
  )
}

export function GhostButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={clsx(
        'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-ink',
        'bg-white/60 ring-1 ring-ink/10 transition hover:bg-white disabled:opacity-40',
        className,
      )}
    />
  )
}

export function StatusPill({ status }: { status: InvoiceStatus }) {
  const paid = status === 'paid'
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        paid ? 'bg-emerald-100 text-emerald-800' : 'bg-ink/[0.06] text-slate-soft',
      )}
    >
      {paid && <Check size={12} strokeWidth={3} />}
      {paid ? 'Paid' : 'Awaiting payment'}
    </span>
  )
}

export function CopyButton({ value, label = 'Copy link' }: { value?: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error('Could not copy. Select the link and copy it manually.')
    }
  }
  return (
    <GhostButton onClick={() => void copy()} disabled={!value}>
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? 'Copied' : label}
    </GhostButton>
  )
}
