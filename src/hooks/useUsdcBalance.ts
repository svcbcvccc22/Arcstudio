import { erc20Abi } from 'viem'
import { useReadContract } from 'wagmi'
import { ARC_TESTNET_CHAIN_ID } from '@/lib/payment'
import { getUsdc } from '@/onchain-facts'

const usdc = getUsdc(ARC_TESTNET_CHAIN_ID)
if (!usdc) throw new Error('USDC is not registered for Arc Testnet')

export const USDC_ADDRESS = usdc.address as `0x${string}`

/** USDC balance in the 6-decimal ERC-20 view (the same pool that pays gas on Arc). */
export function useUsdcBalance(address?: `0x${string}`) {
  return useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 8000 },
  })
}
