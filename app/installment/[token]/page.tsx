import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { merchant } from '@/app/lib/merchant'
import { formatInstallmentDate, formatMoney, isRowOverdue, remainingAmount, todayInTbilisi, toTetri, type InstallmentRowStatus } from '@/app/lib/installments'
import styles from '@/app/admin/installments/installments.module.css'
import { PayInstallmentButton } from './PayInstallmentButton'

export const dynamic = 'force-dynamic'

// A secret client link: keep it out of search engines and out of referrer headers.
export const metadata: Metadata = {
  title: 'ჩემი განვადება | Medical Line Georgia',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

type PublicRow = { id: string; installment_number: number; due_date: string; amount: number; paid_amount: number; status: InstallmentRowStatus }
type PublicContract = { contract_number: string; customer_name: string; product_name: string; total_price: number; down_payment: number; months: number; status: 'active' | 'completed' | 'cancelled'; schedule: PublicRow[] }

async function loadContract(token: string): Promise<PublicContract | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return null
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''
  if (!url || !key) return null
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await supabase.rpc('get_installment_public', { p_token: token })
  if (error) {
    console.error('[installment] RPC error:', error.message)
    return null
  }
  return (data as PublicContract | null) ?? null
}

export default async function InstallmentClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ paid?: string; cancelled?: string }>
}) {
  const { token } = await params
  const { paid, cancelled } = await searchParams
  const contract = await loadContract(token)
  const today = todayInTbilisi()

  return (
    <div className={styles.page}>
      <div className={styles.clientWrap}>
        <header className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>✚</div>
            <div>
              <b>MEDICAL LINE <span>GEORGIA</span></b>
              <small>ჩემი განვადება</small>
            </div>
          </div>
        </header>

        {!contract ? (
          <section className={styles.box}>
            <h2>განვადება ვერ მოიძებნა</h2>
            <p className={styles.hint} style={{ margin: '8px 0 0' }}>ბმული არასწორია ან მოძველებულია. დაგვიკავშირდით: <a href={merchant.phoneHref}>{merchant.phone}</a></p>
          </section>
        ) : (
          <>
            {paid ? <div className={styles.ok}>გმადლობთ! გადახდა მუშავდება. სტატუსი ბანკის დადასტურების შემდეგ განახლდება, რასაც შეიძლება რამდენიმე წუთი დასჭირდეს.</div> : null}
            {cancelled ? <div className={styles.notice}>გადახდა არ დასრულებულა და თანხა არ ჩამოგეჭრათ. შეგიძლიათ თავიდან სცადოთ.</div> : null}

            <section className={styles.box}>
              <div className={styles.cardTitle}>
                <div>
                  <h2>{contract.customer_name}</h2>
                  <small>{contract.product_name} · {contract.contract_number}</small>
                </div>
                <span className={`${styles.pill} ${contract.status === 'completed' ? styles.pillDone : contract.status === 'cancelled' ? styles.pillOff : ''}`}>
                  {contract.status === 'completed' ? 'დასრულებული' : contract.status === 'cancelled' ? 'გაუქმებული' : 'აქტიური'}
                </span>
              </div>

              <div className={styles.facts} style={{ paddingTop: 0 }}>
                <span>ღირებულება: <b>{formatMoney(contract.total_price)}</b></span>
                <span>საწყისი შენატანი: <b>{formatMoney(contract.down_payment)}</b></span>
                <span>დარჩენილია: <b>{formatMoney(contract.schedule.filter((row) => row.status === 'pending').reduce((sum, row) => sum + toTetri(remainingAmount(row)), 0) / 100)}</b></span>
              </div>

              {contract.schedule.map((row) => {
                const overdue = isRowOverdue(row, today)
                return (
                  <div key={row.id} className={`${styles.row} ${overdue ? styles.rowLate : ''}`}>
                    <span>№{row.installment_number}<small>{formatInstallmentDate(row.due_date)}{overdue ? ' · ვადაგადაცილებული' : ''}</small></span>
                    <strong>{formatMoney(row.status === 'pending' ? remainingAmount(row) : row.amount)}</strong>
                    {row.status === 'paid' ? (
                      <span className={`${styles.smallBtn} ${styles.smallBtnDone}`}>გადახდილია</span>
                    ) : row.status === 'cancelled' ? (
                      <span className={`${styles.smallBtn} ${styles.smallBtnDone}`} style={{ background: '#eef0f3', color: '#5b6778' }}>გაუქმებული</span>
                    ) : contract.status === 'active' ? (
                      <PayInstallmentButton token={token} scheduleId={row.id} />
                    ) : null}
                  </div>
                )
              })}

              <div className={styles.notice} style={{ margin: '16px 0 0' }}>
                <b>საქართველოს ბანკით გადახდა:</b> ღილაკზე დაჭერით გადახვალთ ბანკის ოფიციალურ გვერდზე, სადაც თავად დაადასტურებთ ოპერაციას. ბარათის მონაცემები ჩვენთან არ ინახება.
              </div>
            </section>

            <p className={styles.hint} style={{ textAlign: 'center', marginTop: 18 }}>
              კითხვები? <a href={merchant.phoneHref}>{merchant.phone}</a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
