import InvoiceWorkspace from '../_components/InvoiceWorkspace'

export const metadata = { title: 'მიღება-ჩაბარების აქტები | Medical Line' }

export default function AcceptanceActsPage() {
  return <InvoiceWorkspace initialMode="acceptance-act" />
}
