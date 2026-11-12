import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useAccount, useSendTransaction, useSwitchChain, useWaitForTransactionReceipt } from 'wagmi'
import { USDC_ADDRESS } from '@/hooks/useUsdcBalance'
import { api } from '@/lib/api'
import { parseOnchainError } from '@/lib/format'
import { ARC_TESTNET_CHAIN_ID, buildPaymentData, type InvoiceDto } from '@/lib/payment'

const VERIFY_ATTEMPTS = 10
const VERIFY_DELAY_MS = 1500
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Sends the tagged USDC transfer, waits for the receipt, then asks the server to confirm it. */
export function usePayInvoice(invoice: InvoiceDto) {
  const queryClient = useQueryClient()
  const { chainId } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const { sendTransaction, data: hash, isPending: isSigning, error: sendError, reset } = useSendTransaction()
  const receipt = useWaitForTransactionReceipt({ hash, chainId: ARC_TESTNET_CHAIN_ID })
  const [verifyError, setVerifyError] = useState<string>()
  const [isVerifying, setIsVerifying] = useState(false)

  const isWrongChain = chainId !== ARC_TESTNET_CHAIN_ID

  useEffect(() => {
    if (!hash || !receipt.isSuccess || invoice.status === 'paid') return
    let cancelled = false

    const run = async () => {
      setIsVerifying(true)
      setVerifyError(undefined)
      try {
        for (let attempt = 0; attempt < VERIFY_ATTEMPTS && !cancelled; attempt++) {
          const paid = await api.verifyInvoice(invoice.id, hash)
          if (paid) {
            queryClient.setQueryData(['invoice', invoice.id], paid)
            void queryClient.invalidateQueries({ queryKey: ['invoices'] })
            return
          }
          await sleep(VERIFY_DELAY_MS)
        }
        if (!cancelled) setVerifyError('Your payment was sent, but confirmation is taking longer than expected. Refresh to check again.')
      } catch (error) {
        if (!cancelled) setVerifyError(error instanceof Error ? error.message : 'Could not confirm the payment.')
      } finally {
        if (!cancelled) setIsVerifying(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [hash, receipt.isSuccess, invoice.id, invoice.status, queryClient])

  const pay = () => {
    if (isWrongChain) return switchChain({ chainId: ARC_TESTNET_CHAIN_ID })
    sendTransaction({
      to: USDC_ADDRESS,
      data: buildPaymentData(invoice.merchant, BigInt(invoice.amountRaw), invoice.id),
      chainId: ARC_TESTNET_CHAIN_ID,
    })
  }

  const failed = receipt.isError || (receipt.data && receipt.data.status !== 'success')
  const error = parseOnchainError(sendError) ?? (failed ? 'The transfer failed onchain. Please try again.' : undefined) ?? verifyError

  return {
    pay,
    reset,
    hash,
    error,
    isWrongChain,
    isSwitching,
    isSigning,
    isConfirming: !!hash && receipt.isLoading,
    isVerifying,
  }
}
