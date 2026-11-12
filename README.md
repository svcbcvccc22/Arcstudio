# Arc Checkout

Accept USDC payments on Arc Testnet. Connect a wallet, create a payment link for an amount and note, share it, and watch it flip to paid once the customer's USDC transfer is confirmed onchain.

Built with [Arc Studio](https://studio.arc.io)

## Tech stack

- React 18, Vite, TypeScript, Tailwind CSS
- wagmi, viem, ConnectKit for wallets and transfers
- A small Node-compatible invoice server (runs with Bun) that stores payment links and confirms payments against the chain
- USDC on Arc Testnet

## Development

Prerequisites: [Bun](https://bun.sh).

```bash
bun install
bun run server   # invoice server on port 3001
bun run dev      # web app on port 5173 (proxies /api to the server)
```

Other scripts: `bun run check` (lint and typecheck).

To try it, connect a wallet on Arc Testnet and get test USDC from the [Circle faucet](https://faucet.circle.com).

### Environment variables

All optional.

- `PORT`: invoice server port (default `3001`).
- `INVOICE_DB`: path of the invoice data file (default `data/invoices.json`).
- `RPC_PROXY_BASE_URL`, `RPC_PROXY_TOKEN`, `RPC_PROXY_CHAINS`: RPC proxy settings provisioned by Arc Studio. Outside Arc Studio the server uses the public Arc Testnet RPC.
