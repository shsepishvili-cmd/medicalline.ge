import { ClinicShell } from '../_components/ClinicShell'
import { ClinicPageHeader } from '../_components/ClinicShell'
import { PaymentResult } from './PaymentResult'

export default async function ClinicPaymentResultPage({ searchParams }: { searchParams: Promise<{ transaction?: string; cancelled?: string }> }) {
  const values = await searchParams
  return <ClinicShell><ClinicPageHeader eyebrow="გადახდის შედეგი" title="ტრანზაქციის სტატუსი" /><PaymentResult transactionId={values.transaction || ''} cancelled={values.cancelled === '1'} /></ClinicShell>
}

