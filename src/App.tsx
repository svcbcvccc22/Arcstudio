import { Dashboard } from '@/components/Dashboard'
import { Header } from '@/components/Header'
import { PayInvoice } from '@/components/PayInvoice'
import { useInvoiceRoute } from '@/lib/router'

export default function App() {
  const [invoiceId, navigate] = useInvoiceRoute()

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-md px-4 pb-24">
        <Header onHome={() => navigate(null)} />
        <main>
          {invoiceId ? <PayInvoice id={invoiceId} onBack={() => navigate(null)} /> : <Dashboard onOpen={navigate} />}
        </main>
        <p className="mt-8 text-center text-xs text-slate-soft">Arc Testnet. Test USDC only, no real funds.</p>
      </div>
    </div>
  )
}
