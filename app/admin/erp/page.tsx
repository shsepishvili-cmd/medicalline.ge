'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  Banknote,
  Box,
  Building2,
  ClipboardList,
  Database,
  FileText,
  Landmark,
  Menu,
  Package,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wrench,
} from 'lucide-react'
import { adminSupabase as supabase } from '@/app/lib/supabase-admin-browser'

const colors = {
  blue: '#087db7',
  blueDark: '#056a9d',
  ink: '#17334a',
  muted: '#5f6d77',
  line: '#d7e0e6',
  header: '#f2f6f8',
  panel: '#ffffff',
  canvas: '#ffffff',
  green: '#0b6b4d',
  danger: '#a43737',
}

type ModuleKey = 'main' | 'purchases' | 'sales' | 'stock' | 'cash' | 'rs' | 'reports' | 'admin'

type Profile = {
  id: string
  full_name: string | null
  role: string | null
  status: string | null
}

type Company = {
  id: string
  code: string
  name: string
  tax_id: string | null
  vat_registered: boolean
  default_vat_rate: number
  default_currency: string
}

type Counts = {
  products: number
  parties: number
  sales: number
  payments: number
  journalEntries: number
  rsLogs: number
  bankImports: number
  waybillReview: number
}

type ProductOption = {
  id: string
  code: string | null
  name: string
  category: string | null
  unit: string
  default_cost: number
  default_price: number
  vat_rate: number
}

type PartyOption = {
  id: string
  code: string | null
  name: string
  tax_id: string | null
  phone: string | null
  party_type: string
}

type SaleRow = {
  id: string
  sale_date: string
  invoice_number: string | null
  waybill_number: string | null
  customer_name: string | null
  total: number
  vat_amount: number
  profit: number
  payment_status: string
  status: string
}

type SaleDraftLine = {
  lineId: string
  product: ProductOption
  quantity: number
  unitPrice: number
  vatRate: number
  vatAmount: number
  lineTotal: number
  costTotal: number
}

type ImportDraftLine = {
  lineId: string
  product: ProductOption
  quantity: number
  foreignUnitPrice: number
  gelUnitPrice: number
  gelLineTotal: number
  customsShare: number
  unitCost: number
  totalCost: number
  markupPercent: number
  salePrice: number
}

type StockLot = {
  id: string
  product_id: string
  import_date: string | null
  quantity_in: number
  quantity_out: number
  unit_cost: number
  total_cost: number
  source_doc: string | null
  source: string | null
}

type WaybillReviewRow = {
  id: string
  waybill_number: string
  party_name: string | null
  amount_without_vat: number
  vat_amount: number
  total: number
  import_status: string
}

const emptyCounts: Counts = {
  products: 0,
  parties: 0,
  sales: 0,
  payments: 0,
  journalEntries: 0,
  rsLogs: 0,
  bankImports: 0,
  waybillReview: 0,
}

const modules: { key: ModuleKey; label: string; icon: React.ReactNode }[] = [
  { key: 'main', label: 'მთავარი', icon: <Menu size={30} /> },
  { key: 'purchases', label: 'შესყიდვები', icon: <ShoppingCart size={28} /> },
  { key: 'sales', label: 'გაყიდვები', icon: <ReceiptText size={28} /> },
  { key: 'stock', label: 'საწყობი', icon: <Box size={28} /> },
  { key: 'cash', label: 'ფულადი სახსრები', icon: <Landmark size={28} /> },
  { key: 'rs', label: 'RS', icon: <RotateCcw size={28} /> },
  { key: 'reports', label: 'ანგარიშგებები', icon: <ClipboardList size={28} /> },
  { key: 'admin', label: 'ადმინისტრირება', icon: <Wrench size={28} /> },
]

function money(value: number | null | undefined) {
  return Number(value || 0).toLocaleString('ka-GE', { maximumFractionDigits: 2 })
}

function roundMoney(value: number) {
  return Math.round(Number(value || 0) * 100) / 100
}

function fieldStyle() {
  return {
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box' as const,
    border: `1px solid ${colors.line}`,
    borderRadius: 2,
    background: '#fff',
    color: colors.ink,
    fontSize: 13,
    padding: '8px 9px',
  }
}

function buttonStyle(kind: 'primary' | 'plain' = 'plain') {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 34,
    padding: '7px 12px',
    borderRadius: 2,
    border: kind === 'primary' ? `1px solid ${colors.blueDark}` : `1px solid ${colors.line}`,
    background: kind === 'primary' ? colors.blue : '#fff',
    color: kind === 'primary' ? '#fff' : colors.ink,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 5, color: colors.muted, fontSize: 12, fontWeight: 700 }}>
      {label}
      {children}
    </label>
  )
}

function RegisterTable({ columns, children, empty }: { columns: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div style={{ overflowX: 'auto', border: `1px solid ${colors.line}` }}>
      <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: colors.header, color: colors.ink, textAlign: 'left' }}>
            {columns.map((column) => (
              <th key={column} style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.line}`, fontSize: 12, fontWeight: 800 }}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {empty ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: 14, color: colors.muted }}>ჩანაწერი ჯერ არ არის.</td>
            </tr>
          ) : children}
        </tbody>
      </table>
    </div>
  )
}

function MenuLink({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: 'none',
        background: 'transparent',
        padding: 0,
        margin: 0,
        color: colors.ink,
        fontSize: 16,
        lineHeight: 1.9,
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function MenuGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={{ margin: '0 0 14px', fontSize: 24, fontWeight: 500, color: colors.ink }}>{title}</h2>
      <div style={{ display: 'grid', gap: 3 }}>{children}</div>
    </section>
  )
}

export default function AdminErpPage() {
  const [activeModule, setActiveModule] = useState<ModuleKey>('main')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [counts, setCounts] = useState<Counts>(emptyCounts)
  const [products, setProducts] = useState<ProductOption[]>([])
  const [parties, setParties] = useState<PartyOption[]>([])
  const [sales, setSales] = useState<SaleRow[]>([])
  const [stockLots, setStockLots] = useState<StockLot[]>([])
  const [waybillReview, setWaybillReview] = useState<WaybillReviewRow[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [savingSale, setSavingSale] = useState(false)
  const [savingPayment, setSavingPayment] = useState(false)

  const [saleProductId, setSaleProductId] = useState('')
  const [salePartyId, setSalePartyId] = useState('')
  const [saleQuantity, setSaleQuantity] = useState('1')
  const [salePrice, setSalePrice] = useState('')
  const [saleInvoice, setSaleInvoice] = useState('')
  const [saleLines, setSaleLines] = useState<SaleDraftLine[]>([])

  const [paymentSaleId, setPaymentSaleId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'card' | 'installment'>('cash')

  const [purchaseProductId, setPurchaseProductId] = useState('')
  const [purchaseSupplierId, setPurchaseSupplierId] = useState('')
  const [purchaseQuantity, setPurchaseQuantity] = useState('1')
  const [purchaseUnitCost, setPurchaseUnitCost] = useState('')
  const [purchaseSalePrice, setPurchaseSalePrice] = useState('')
  const [purchaseDocNo, setPurchaseDocNo] = useState('')
  const [savingPurchase, setSavingPurchase] = useState(false)

  const [importSupplierId, setImportSupplierId] = useState('')
  const [importInvoiceNo, setImportInvoiceNo] = useState('')
  const [importInvoiceDate, setImportInvoiceDate] = useState(new Date().toISOString().slice(0, 10))
  const [importCurrency, setImportCurrency] = useState<'USD' | 'EUR'>('USD')
  const [importRate, setImportRate] = useState('2.70')
  const [importCustomsGel, setImportCustomsGel] = useState('0')
  const [importProductId, setImportProductId] = useState('')
  const [importQuantity, setImportQuantity] = useState('1')
  const [importForeignPrice, setImportForeignPrice] = useState('')
  const [importMarkup, setImportMarkup] = useState('25')
  const [importLines, setImportLines] = useState<ImportDraftLine[]>([])
  const [savingImport, setSavingImport] = useState(false)
  const [loadingNbgRate, setLoadingNbgRate] = useState(false)

  const selectedProduct = useMemo(() => products.find((item) => item.id === saleProductId) || null, [products, saleProductId])
  const selectedPurchaseProduct = useMemo(() => products.find((item) => item.id === purchaseProductId) || null, [products, purchaseProductId])
  const selectedImportProduct = useMemo(() => products.find((item) => item.id === importProductId) || null, [products, importProductId])
  const selectedPaymentSale = useMemo(() => sales.find((item) => item.id === paymentSaleId) || null, [sales, paymentSaleId])
  const saleDraftTotals = useMemo(() => {
    return saleLines.reduce(
      (total, line) => ({
        subtotal: total.subtotal + (line.lineTotal - line.vatAmount),
        vatAmount: total.vatAmount + line.vatAmount,
        total: total.total + line.lineTotal,
        costTotal: total.costTotal + line.costTotal,
        profit: total.profit + (line.lineTotal - line.costTotal),
      }),
      { subtotal: 0, vatAmount: 0, total: 0, costTotal: 0, profit: 0 },
    )
  }, [saleLines])

  const importDraftTotals = useMemo(() => {
    const rate = Number(importRate)
    const customsTotal = Number(importCustomsGel)
    const goodsGelTotal = importLines.reduce((sum, line) => sum + line.gelLineTotal, 0)
    return importLines.reduce(
      (total, line) => {
        const customsShare = goodsGelTotal > 0 && Number.isFinite(customsTotal) ? roundMoney((line.gelLineTotal / goodsGelTotal) * customsTotal) : 0
        const totalCost = roundMoney(line.gelLineTotal + customsShare)
        return {
          goodsGelTotal: total.goodsGelTotal + line.gelLineTotal,
          customsTotal: Number.isFinite(customsTotal) ? customsTotal : 0,
          landedTotal: total.landedTotal + totalCost,
          rate: Number.isFinite(rate) ? rate : 0,
        }
      },
      { goodsGelTotal: 0, customsTotal: Number.isFinite(customsTotal) ? customsTotal : 0, landedTotal: 0, rate: Number.isFinite(rate) ? rate : 0 },
    )
  }, [importCustomsGel, importLines, importRate])

  const calculatedImportLines = useMemo(() => {
    const customsTotal = Number(importCustomsGel)
    const goodsGelTotal = importLines.reduce((sum, line) => sum + line.gelLineTotal, 0)
    return importLines.map((line) => {
      const customsShare = goodsGelTotal > 0 && Number.isFinite(customsTotal) ? roundMoney((line.gelLineTotal / goodsGelTotal) * customsTotal) : 0
      const totalCost = roundMoney(line.gelLineTotal + customsShare)
      const unitCost = line.quantity > 0 ? roundMoney(totalCost / line.quantity) : 0
      const salePrice = roundMoney(unitCost * (1 + line.markupPercent / 100))
      return { ...line, customsShare, totalCost, unitCost, salePrice }
    })
  }, [importCustomsGel, importLines])

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return products
    return products.filter((item) => [item.code || '', item.name, item.category || ''].some((value) => value.toLowerCase().includes(needle)))
  }, [products, query])

  const filteredParties = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return parties
    return parties.filter((item) => [item.code || '', item.name, item.tax_id || '', item.phone || ''].some((value) => value.toLowerCase().includes(needle)))
  }, [parties, query])

  const stockBalances = useMemo(() => {
    return products.map((product) => {
      const lots = stockLots.filter((lot) => lot.product_id === product.id)
      const quantityIn = lots.reduce((sum, lot) => sum + Number(lot.quantity_in || 0), 0)
      const quantityOut = lots.reduce((sum, lot) => sum + Number(lot.quantity_out || 0), 0)
      const totalCost = lots.reduce((sum, lot) => sum + Number(lot.total_cost || 0), 0)
      return {
        product,
        quantityIn,
        quantityOut,
        balance: quantityIn - quantityOut,
        totalCost,
      }
    })
  }, [products, stockLots])

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id
      if (!userId) throw new Error('ადმინ ERP ხელმისაწვდომია მხოლოდ ავტორიზებული მომხმარებლისთვის.')

      const { data: profileRow, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role, status')
        .eq('id', userId)
        .single()
      if (profileError) throw profileError
      if (!profileRow || profileRow.role !== 'admin' || profileRow.status !== 'active') throw new Error('ამ ანგარიშს ERP მოდულზე წვდომა არ აქვს.')
      setProfile(profileRow as Profile)

      const { data: companyRow, error: companyError } = await supabase
        .from('erp_companies')
        .select('id, code, name, tax_id, vat_registered, default_vat_rate, default_currency')
        .eq('code', 'MEDIQALJORJIA')
        .maybeSingle()
      if (companyError) throw companyError
      if (!companyRow) throw new Error('MEDIQALJORJIA კომპანია ვერ მოიძებნა. ჯერ გაუშვი ERP SQL migration.')

      const activeCompany = companyRow as Company
      setCompany(activeCompany)

      const [
        productCount,
        partyCount,
        saleCount,
        paymentCount,
        entryCount,
        rsCount,
        bankCount,
        reviewCount,
        cleanProductCount,
        cleanPartyCount,
        productRows,
        partyRows,
        cleanProductRows,
        cleanPartyRows,
        saleRows,
        stockRows,
        reviewRows,
      ] = await Promise.all([
        supabase.from('erp_products').select('id', { count: 'exact', head: true }).eq('company_id', activeCompany.id),
        supabase.from('erp_parties').select('id', { count: 'exact', head: true }).eq('company_id', activeCompany.id),
        supabase.from('erp_sales').select('id', { count: 'exact', head: true }).eq('company_id', activeCompany.id),
        supabase.from('erp_payments').select('id', { count: 'exact', head: true }).eq('company_id', activeCompany.id),
        supabase.from('erp_journal_entries').select('id', { count: 'exact', head: true }).eq('company_id', activeCompany.id),
        supabase.from('erp_rs_logs').select('id', { count: 'exact', head: true }).eq('company_id', activeCompany.id),
        supabase.from('erp_bank_imports').select('id', { count: 'exact', head: true }).eq('company_id', activeCompany.id),
        supabase.from('erp_oris_waybill_review').select('id', { count: 'exact', head: true }).eq('company_id', activeCompany.id),
        supabase.from('erp_products_clean').select('id', { count: 'exact', head: true }).eq('company_id', activeCompany.id),
        supabase.from('erp_parties_clean').select('id', { count: 'exact', head: true }).eq('company_id', activeCompany.id),
        supabase
          .from('erp_products')
          .select('id, code, name, category, unit, default_cost, default_price, vat_rate')
          .eq('company_id', activeCompany.id)
          .eq('is_active', true)
          .order('name', { ascending: true })
          .limit(2000),
        supabase
          .from('erp_parties')
          .select('id, code, name, tax_id, phone, party_type')
          .eq('company_id', activeCompany.id)
          .order('name', { ascending: true })
          .limit(3000),
        supabase
          .from('erp_products_clean')
          .select('id, code, name, category, unit, default_cost, default_price, vat_rate')
          .eq('company_id', activeCompany.id)
          .eq('is_active', true)
          .order('name', { ascending: true })
          .limit(2000),
        supabase
          .from('erp_parties_clean')
          .select('id, code, name, tax_id, phone, party_type')
          .eq('company_id', activeCompany.id)
          .order('name', { ascending: true })
          .limit(3000),
        supabase
          .from('erp_sales')
          .select('id, sale_date, invoice_number, waybill_number, customer_name, total, vat_amount, profit, payment_status, status')
          .eq('company_id', activeCompany.id)
          .order('created_at', { ascending: false })
          .limit(80),
        supabase
          .from('erp_stock_lots')
          .select('id, product_id, import_date, quantity_in, quantity_out, unit_cost, total_cost, source_doc, source')
          .eq('company_id', activeCompany.id)
          .order('created_at', { ascending: false })
          .limit(5000),
        supabase
          .from('erp_oris_waybill_review')
          .select('id, waybill_number, party_name, amount_without_vat, vat_amount, total, import_status')
          .eq('company_id', activeCompany.id)
          .order('total', { ascending: false })
          .limit(80),
      ])

      const optionalReviewMissing = reviewCount.error?.message?.includes('erp_oris_waybill_review')
      const optionalReviewRowsMissing = reviewRows.error?.message?.includes('erp_oris_waybill_review')
      const optionalCleanProductsMissing = cleanProductRows.error?.message?.includes('erp_products_clean') || cleanProductCount.error?.message?.includes('erp_products_clean')
      const optionalCleanPartiesMissing = cleanPartyRows.error?.message?.includes('erp_parties_clean') || cleanPartyCount.error?.message?.includes('erp_parties_clean')
      const firstError = [
        productCount,
        partyCount,
        saleCount,
        paymentCount,
        entryCount,
        rsCount,
        bankCount,
        optionalReviewMissing ? null : reviewCount,
        optionalCleanProductsMissing ? null : cleanProductCount,
        optionalCleanPartiesMissing ? null : cleanPartyCount,
        productRows,
        partyRows,
        optionalCleanProductsMissing ? null : cleanProductRows,
        optionalCleanPartiesMissing ? null : cleanPartyRows,
        saleRows,
        stockRows,
        optionalReviewRowsMissing ? null : reviewRows,
      ].find((item) => item?.error)?.error
      if (firstError) throw firstError

      setCounts({
        products: optionalCleanProductsMissing ? productCount.count || 0 : cleanProductCount.count || 0,
        parties: optionalCleanPartiesMissing ? partyCount.count || 0 : cleanPartyCount.count || 0,
        sales: saleCount.count || 0,
        payments: paymentCount.count || 0,
        journalEntries: entryCount.count || 0,
        rsLogs: rsCount.count || 0,
        bankImports: bankCount.count || 0,
        waybillReview: optionalReviewMissing ? 0 : reviewCount.count || 0,
      })
      setProducts(((optionalCleanProductsMissing ? productRows.data : cleanProductRows.data) || []) as ProductOption[])
      setParties(((optionalCleanPartiesMissing ? partyRows.data : cleanPartyRows.data) || []) as PartyOption[])
      setSales((saleRows.data || []) as SaleRow[])
      setStockLots((stockRows.data || []) as StockLot[])
      setWaybillReview(optionalReviewRowsMissing ? [] : (reviewRows.data || []) as WaybillReviewRow[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ERP მოდულის ჩატვირთვა ვერ მოხერხდა.')
    } finally {
      setLoading(false)
    }
  }

  async function saveSale() {
    if (!company) return
    setSavingSale(true)
    setError('')
    setMessage('')

    try {
      if (!saleLines.length) throw new Error('დოკუმენტში დაამატე მინიმუმ ერთი საქონლის ხაზი.')
      const party = parties.find((item) => item.id === salePartyId) || null
      const invoiceNumber = saleInvoice.trim() || `ERP-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Date.now().toString().slice(-5)}`

      const { data: saleRow, error: saleError } = await supabase
        .from('erp_sales')
        .insert({
          company_id: company.id,
          sale_date: new Date().toISOString().slice(0, 10),
          invoice_number: invoiceNumber,
          status: 'confirmed',
          channel: 'retail',
          customer_id: party?.id || null,
          customer_name: party?.name || 'საცალო',
          subtotal: Math.round(saleDraftTotals.subtotal * 100) / 100,
          vat_amount: Math.round(saleDraftTotals.vatAmount * 100) / 100,
          total: Math.round(saleDraftTotals.total * 100) / 100,
          cost_total: Math.round(saleDraftTotals.costTotal * 100) / 100,
          profit: Math.round(saleDraftTotals.profit * 100) / 100,
          payment_status: 'unpaid',
          source: 'BALANCE_MIX',
        })
        .select('id, sale_date, invoice_number, waybill_number, customer_name, total, vat_amount, profit, payment_status, status')
        .single()
      if (saleError) throw saleError

      const { error: itemError } = await supabase.from('erp_sale_items').insert(
        saleLines.map((line) => ({
          sale_id: saleRow.id,
          product_id: line.product.id,
          product_code: line.product.code,
          product_name: line.product.name,
          quantity: line.quantity,
          unit: line.product.unit || 'ცალი',
          unit_price: line.unitPrice,
          vat_rate: line.vatRate,
          vat_amount: line.vatAmount,
          line_total: line.lineTotal,
          unit_cost: Number(line.product.default_cost || 0),
          cost_total: line.costTotal,
        })),
      )
      if (itemError) throw itemError

      const { data: stockOutRows, error: stockOutError } = await supabase
        .from('erp_stock_lots')
        .insert(
          saleLines.map((line) => ({
            company_id: company.id,
            product_id: line.product.id,
            import_date: new Date().toISOString().slice(0, 10),
            quantity_in: 0,
            quantity_out: line.quantity,
            unit_cost: Number(line.product.default_cost || 0),
            total_cost: line.costTotal,
            currency: company.default_currency || 'GEL',
            source_doc: invoiceNumber,
            source: 'SALE_DOCUMENT',
          })),
        )
        .select('id, product_id, import_date, quantity_in, quantity_out, unit_cost, total_cost, source_doc, source')
      if (stockOutError) throw stockOutError

      setSales((rows) => [saleRow as SaleRow, ...rows].slice(0, 80))
      setStockLots((rows) => ([...((stockOutRows || []) as StockLot[]), ...rows]))
      setCounts((current) => ({ ...current, sales: current.sales + 1 }))
      setPaymentSaleId(saleRow.id)
      setPaymentAmount(String(Math.round(saleDraftTotals.total * 100) / 100))
      setSaleInvoice('')
      setSaleQuantity('1')
      setSaleLines([])
      setMessage(`დოკუმენტი შეიქმნა: ${invoiceNumber}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'გაყიდვის შენახვა ვერ მოხერხდა.')
    } finally {
      setSavingSale(false)
    }
  }

  function addSaleLine() {
    setError('')
    setMessage('')

    if (!selectedProduct) {
      setError('აირჩიე საქონელი.')
      return
    }

    const quantity = Number(saleQuantity)
    const unitPrice = Number(salePrice)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('რაოდენობა სწორად შეიყვანე.')
      return
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setError('ფასი სწორად შეიყვანე.')
      return
    }

    const vatRate = Number(selectedProduct.vat_rate ?? company?.default_vat_rate ?? 18)
    const lineTotal = Math.round(quantity * unitPrice * 100) / 100
    const vatAmount = Math.round((lineTotal * vatRate / (100 + vatRate)) * 100) / 100
    const costTotal = Math.round(quantity * Number(selectedProduct.default_cost || 0) * 100) / 100

    setSaleLines((lines) => [
      ...lines,
      {
        lineId: `${selectedProduct.id}-${Date.now()}`,
        product: selectedProduct,
        quantity,
        unitPrice,
        vatRate,
        vatAmount,
        lineTotal,
        costTotal,
      },
    ])
    setSaleProductId('')
    setSaleQuantity('1')
    setSalePrice('')
  }

  function removeSaleLine(lineId: string) {
    setSaleLines((lines) => lines.filter((line) => line.lineId !== lineId))
  }

  function addImportLine() {
    setError('')
    if (!selectedImportProduct) {
      setError('აირჩიე საქონელი იმპორტის ხაზისთვის.')
      return
    }

    const quantity = Number(importQuantity)
    const foreignUnitPrice = Number(importForeignPrice)
    const rate = Number(importRate)
    const markupPercent = Number(importMarkup || 0)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('იმპორტის რაოდენობა სწორად შეიყვანე.')
      return
    }
    if (!Number.isFinite(foreignUnitPrice) || foreignUnitPrice < 0) {
      setError('ვალუტაში ფასი სწორად შეიყვანე.')
      return
    }
    if (!Number.isFinite(rate) || rate <= 0) {
      setError('კურსი სწორად შეიყვანე.')
      return
    }

    const gelUnitPrice = roundMoney(foreignUnitPrice * rate)
    const gelLineTotal = roundMoney(quantity * gelUnitPrice)
    const initialSalePrice = roundMoney(gelUnitPrice * (1 + (Number.isFinite(markupPercent) ? markupPercent : 0) / 100))

    setImportLines((lines) => [
      ...lines,
      {
        lineId: `${selectedImportProduct.id}-${Date.now()}`,
        product: selectedImportProduct,
        quantity,
        foreignUnitPrice,
        gelUnitPrice,
        gelLineTotal,
        customsShare: 0,
        unitCost: gelUnitPrice,
        totalCost: gelLineTotal,
        markupPercent: Number.isFinite(markupPercent) ? markupPercent : 0,
        salePrice: initialSalePrice,
      },
    ])
    setImportProductId('')
    setImportQuantity('1')
    setImportForeignPrice('')
  }

  function removeImportLine(lineId: string) {
    setImportLines((lines) => lines.filter((line) => line.lineId !== lineId))
  }

  async function loadNbgRate() {
    setLoadingNbgRate(true)
    setError('')

    try {
      const response = await fetch(`/api/erp/nbg-rate?currency=${importCurrency}&date=${importInvoiceDate || new Date().toISOString().slice(0, 10)}`)
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.toLowerCase().includes('application/json')) {
        throw new Error(
          `NBG კურსის API-მ JSON-ის ნაცვლად HTML დააბრუნა (HTTP ${response.status}). შეამოწმე, რომ /api/erp/nbg-rate მარშრუტი ხელმისაწვდომია.`,
        )
      }

      const data = (await response.json()) as { currency?: string; error?: string; rate?: number }
      if (!response.ok) throw new Error(data?.error || 'NBG კურსის მიღება ვერ მოხერხდა.')
      setImportRate(String(roundMoney(Number(data.rate))))
      setMessage(`NBG კურსი ჩაიტვირთა: ${data.currency} ${money(Number(data.rate))}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'NBG კურსის მიღება ვერ მოხერხდა.')
    } finally {
      setLoadingNbgRate(false)
    }
  }

  async function saveImportDocument() {
    if (!company) return
    setSavingImport(true)
    setError('')
    setMessage('')

    try {
      const supplier = parties.find((item) => item.id === importSupplierId) || null
      const lines = calculatedImportLines
      const rate = Number(importRate)
      const customsTotal = Number(importCustomsGel || 0)
      if (!lines.length) throw new Error('იმპორტის დოკუმენტში დაამატე მინიმუმ ერთი ხაზი.')
      if (!Number.isFinite(rate) || rate <= 0) throw new Error('კურსი სწორად შეიყვანე.')
      if (!Number.isFinite(customsTotal) || customsTotal < 0) throw new Error('საბაჟო ხარჯი სწორად შეიყვანე.')

      const invoiceNumber = importInvoiceNo.trim() || `IMP-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Date.now().toString().slice(-5)}`
      const documentPayload = {
        company_id: company.id,
        supplier_id: supplier?.id || null,
        supplier_name: supplier?.name || null,
        invoice_number: invoiceNumber,
        invoice_date: importInvoiceDate || new Date().toISOString().slice(0, 10),
        currency: importCurrency,
        exchange_rate: rate,
        customs_gel: customsTotal,
        goods_gel_total: roundMoney(importDraftTotals.goodsGelTotal),
        landed_total: roundMoney(importDraftTotals.goodsGelTotal + customsTotal),
        status: 'posted',
      }

      const { data: documentRow, error: documentError } = await supabase
        .from('erp_import_documents')
        .insert(documentPayload)
        .select('id')
        .single()
      if (documentError) throw documentError

      const documentId = (documentRow as { id: string }).id
      const { error: lineError } = await supabase.from('erp_import_lines').insert(lines.map((line) => ({
        document_id: documentId,
        product_id: line.product.id,
        product_code: line.product.code,
        product_name: line.product.name,
        quantity: line.quantity,
        foreign_unit_price: line.foreignUnitPrice,
        gel_unit_price: line.gelUnitPrice,
        gel_line_total: line.gelLineTotal,
        customs_share: line.customsShare,
        unit_cost: line.unitCost,
        total_cost: line.totalCost,
        markup_percent: line.markupPercent,
        sale_price: line.salePrice,
      })))
      if (lineError) throw lineError

      const { data: lotRows, error: lotError } = await supabase
        .from('erp_stock_lots')
        .insert(lines.map((line) => ({
          company_id: company.id,
          product_id: line.product.id,
          import_date: importInvoiceDate || new Date().toISOString().slice(0, 10),
          supplier_id: supplier?.id || null,
          quantity_in: line.quantity,
          quantity_out: 0,
          unit_cost: line.unitCost,
          total_cost: line.totalCost,
          currency: company.default_currency || 'GEL',
          source_doc: invoiceNumber,
          source: 'IMPORT_DOCUMENT',
        })))
        .select('id, product_id, import_date, quantity_in, quantity_out, unit_cost, total_cost, source_doc, source')
      if (lotError) throw lotError

      await Promise.all(lines.map((line) => supabase
        .from('erp_products')
        .update({
          default_cost: line.unitCost,
          default_price: line.salePrice,
          updated_at: new Date().toISOString(),
        })
        .eq('id', line.product.id)))

      setStockLots((rows) => [...((lotRows || []) as StockLot[]), ...rows])
      setProducts((rows) => rows.map((product) => {
        const line = lines.find((item) => item.product.id === product.id)
        return line ? { ...product, default_cost: line.unitCost, default_price: line.salePrice } : product
      }))
      setImportSupplierId('')
      setImportInvoiceNo('')
      setImportInvoiceDate(new Date().toISOString().slice(0, 10))
      setImportCurrency('USD')
      setImportRate('2.70')
      setImportCustomsGel('0')
      setImportLines([])
      setMessage(`იმპორტი გატარდა და საწყობში შევიდა: ${invoiceNumber}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'იმპორტის შენახვა ვერ მოხერხდა.')
    } finally {
      setSavingImport(false)
    }
  }

  async function savePurchase() {
    if (!company) return
    setSavingPurchase(true)
    setError('')
    setMessage('')

    try {
      if (!selectedPurchaseProduct) throw new Error('აირჩიე საქონელი.')
      const supplier = parties.find((item) => item.id === purchaseSupplierId) || null
      const quantity = Number(purchaseQuantity)
      const unitCost = Number(purchaseUnitCost)
      const salePrice = Number(purchaseSalePrice || selectedPurchaseProduct.default_price || 0)
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('რაოდენობა სწორად შეიყვანე.')
      if (!Number.isFinite(unitCost) || unitCost < 0) throw new Error('თვითღირებულება სწორად შეიყვანე.')

      const sourceDoc = purchaseDocNo.trim() || `PUR-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Date.now().toString().slice(-5)}`
      const totalCost = Math.round(quantity * unitCost * 100) / 100

      const { data: lotRow, error: lotError } = await supabase
        .from('erp_stock_lots')
        .insert({
          company_id: company.id,
          product_id: selectedPurchaseProduct.id,
          import_date: new Date().toISOString().slice(0, 10),
          supplier_id: supplier?.id || null,
          quantity_in: quantity,
          quantity_out: 0,
          unit_cost: unitCost,
          total_cost: totalCost,
          currency: company.default_currency || 'GEL',
          source_doc: sourceDoc,
          source: 'PURCHASE_DOCUMENT',
        })
        .select('id, product_id, import_date, quantity_in, quantity_out, unit_cost, total_cost, source_doc, source')
        .single()
      if (lotError) throw lotError

      const { error: productError } = await supabase
        .from('erp_products')
        .update({
          default_cost: unitCost,
          default_price: Number.isFinite(salePrice) ? salePrice : selectedPurchaseProduct.default_price,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedPurchaseProduct.id)
      if (productError) throw productError

      setStockLots((rows) => [lotRow as StockLot, ...rows])
      setProducts((rows) => rows.map((product) => (
        product.id === selectedPurchaseProduct.id
          ? { ...product, default_cost: unitCost, default_price: Number.isFinite(salePrice) ? salePrice : product.default_price }
          : product
      )))
      setPurchaseProductId('')
      setPurchaseSupplierId('')
      setPurchaseQuantity('1')
      setPurchaseUnitCost('')
      setPurchaseSalePrice('')
      setPurchaseDocNo('')
      setMessage(`შესყიდვა შეიქმნა და საწყობში შევიდა: ${sourceDoc}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შესყიდვის შენახვა ვერ მოხერხდა.')
    } finally {
      setSavingPurchase(false)
    }
  }

  async function savePayment() {
    if (!company || !selectedPaymentSale) return
    setSavingPayment(true)
    setError('')
    setMessage('')

    try {
      const amount = Number(paymentAmount)
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('გადახდის თანხა სწორად შეიყვანე.')
      const party = parties.find((item) => item.name === selectedPaymentSale.customer_name) || null

      const { error: paymentError } = await supabase.from('erp_payments').insert({
        company_id: company.id,
        sale_id: selectedPaymentSale.id,
        party_id: party?.id || null,
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: paymentMethod,
        amount,
        currency: company.default_currency || 'GEL',
        source: 'BALANCE_MIX',
      })
      if (paymentError) throw paymentError

      const nextStatus = amount >= Number(selectedPaymentSale.total || 0) ? 'paid' : 'partial'
      const { error: saleError } = await supabase
        .from('erp_sales')
        .update({ payment_status: nextStatus, status: nextStatus === 'paid' ? 'paid' : selectedPaymentSale.status })
        .eq('id', selectedPaymentSale.id)
      if (saleError) throw saleError

      setSales((rows) => rows.map((sale) => (
        sale.id === selectedPaymentSale.id
          ? { ...sale, payment_status: nextStatus, status: nextStatus === 'paid' ? 'paid' : sale.status }
          : sale
      )))
      setCounts((current) => ({ ...current, payments: current.payments + 1 }))
      setPaymentAmount('')
      setMessage('გადახდა გატარდა.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'გადახდის გატარება ვერ მოხერხდა.')
    } finally {
      setSavingPayment(false)
    }
  }

  function renderMain() {
    return (
      <div style={{ padding: '42px 58px', display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 95, rowGap: 34, maxWidth: 980 }}>
        <MenuGroup title="სერვისი">
          <MenuLink onClick={() => setActiveModule('stock')}>საწყისი ნაშთები</MenuLink>
          <MenuLink onClick={() => setActiveModule('parties')}>ცნობარების საწყისი შევსება</MenuLink>
          <MenuLink onClick={() => setActiveModule('stock')}>სასაქონლო ოპერაციების გადატარება</MenuLink>
          <MenuLink onClick={() => setActiveModule('cash')}>ჩემი ამონაწერები</MenuLink>
          <MenuLink onClick={() => setActiveModule('cash')}>დამატებითი დამუშავებები</MenuLink>
          <MenuLink onClick={() => setActiveModule('rs')}>დამატებითი ანგარიშგებები</MenuLink>
        </MenuGroup>

        <MenuGroup title="ცნობარები">
          <MenuLink onClick={() => setActiveModule('admin')}>კომპანია</MenuLink>
          <MenuLink onClick={() => setActiveModule('stock')}>შედეგელები</MenuLink>
          <MenuLink onClick={() => setActiveModule('parties')}>მომწოდებლები</MenuLink>
          <MenuLink onClick={() => setActiveModule('cash')}>თანამშრომლები</MenuLink>
          <MenuLink onClick={() => setActiveModule('stock')}>ნომენკლატურა</MenuLink>
        </MenuGroup>

        <MenuGroup title="ოპერაციები">
          <MenuLink onClick={() => setActiveModule('sales')}>დოკუმენტების ჟურნალი</MenuLink>
          <MenuLink onClick={() => setActiveModule('purchases')}>შესყიდვის დოკუმენტი</MenuLink>
          <MenuLink onClick={() => setActiveModule('sales')}>გაყიდვის დოკუმენტი</MenuLink>
          <MenuLink onClick={() => setActiveModule('cash')}>გადახდის გატარება</MenuLink>
          <MenuLink onClick={() => setActiveModule('rs')}>RS ზედნადები</MenuLink>
        </MenuGroup>

        <MenuGroup title="ანგარიშგებები">
          <MenuLink onClick={() => setActiveModule('reports')}>შემოსვლები და ხარჯები</MenuLink>
          <MenuLink onClick={() => setActiveModule('reports')}>ყველა ანგარიში</MenuLink>
          <MenuLink onClick={() => setActiveModule('reports')}>გაყიდვები და მოგება</MenuLink>
          <MenuLink onClick={() => setActiveModule('reports')}>კლიენტის დავალიანება</MenuLink>
          <MenuLink onClick={() => setActiveModule('rs')}>დღგ / RS სტატუსები</MenuLink>
        </MenuGroup>
      </div>
    )
  }

  function renderSales() {
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <section style={{ border: `1px solid ${colors.line}`, background: '#fff' }}>
          <div style={{ padding: '9px 12px', background: colors.header, borderBottom: `1px solid ${colors.line}`, fontWeight: 800 }}>
            გაყიდვის დოკუმენტი
          </div>
          <div style={{ padding: 12, display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 180px 160px', gap: 9, alignItems: 'end' }}>
              <Field label="კლიენტი">
                <select value={salePartyId} onChange={(event) => setSalePartyId(event.target.value)} style={fieldStyle()}>
                  <option value="">საცალო</option>
                  {parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
                </select>
              </Field>
              <Field label="ინვოისის N">
                <input value={saleInvoice} onChange={(event) => setSaleInvoice(event.target.value)} placeholder="ავტომატური" style={fieldStyle()} />
              </Field>
              <button type="button" onClick={saveSale} disabled={savingSale || !saleLines.length} style={{ ...buttonStyle('primary'), opacity: savingSale || !saleLines.length ? 0.55 : 1 }}>
                {savingSale ? 'ინახება...' : 'დოკუმენტის შენახვა'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 120px 130px auto', gap: 9, alignItems: 'end', paddingTop: 10, borderTop: `1px solid ${colors.line}` }}>
              <Field label="საქონელი">
              <select
                value={saleProductId}
                onChange={(event) => {
                  const nextId = event.target.value
                  const product = products.find((item) => item.id === nextId)
                  setSaleProductId(nextId)
                  setSalePrice(product ? String(Number(product.default_price || 0)) : '')
                }}
                style={fieldStyle()}
              >
                <option value="">აირჩიე</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
              </Field>
              <Field label="რაოდენობა">
                <input value={saleQuantity} onChange={(event) => setSaleQuantity(event.target.value)} inputMode="decimal" style={fieldStyle()} />
              </Field>
              <Field label="ფასი დღგ-ით">
                <input value={salePrice} onChange={(event) => setSalePrice(event.target.value)} inputMode="decimal" style={fieldStyle()} />
              </Field>
              <button type="button" onClick={addSaleLine} disabled={!saleProductId} style={{ ...buttonStyle(), opacity: !saleProductId ? 0.55 : 1 }}>
                ხაზის დამატება
              </button>
            </div>

            <RegisterTable columns={['N', 'საქონელი', 'რაოდ.', 'ერთ.', 'ფასი', 'დღგ', 'ჯამი', '']} empty={!saleLines.length}>
              {saleLines.map((line, index) => (
                <tr key={line.lineId} style={{ borderTop: `1px solid ${colors.line}` }}>
                  <td style={{ padding: '8px 10px' }}>{index + 1}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 800 }}>{line.product.name}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(line.quantity)}</td>
                  <td style={{ padding: '8px 10px' }}>{line.product.unit}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(line.unitPrice)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(line.vatAmount)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>{money(line.lineTotal)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                    <button type="button" onClick={() => removeSaleLine(line.lineId)} style={{ ...buttonStyle(), minHeight: 26, padding: '3px 8px' }}>წაშლა</button>
                  </td>
                </tr>
              ))}
            </RegisterTable>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(120px, 1fr))', gap: 8, color: colors.ink }}>
              {[
                ['საქონლის ღირებულება', saleDraftTotals.subtotal],
                ['დღგ', saleDraftTotals.vatAmount],
                ['ჯამი', saleDraftTotals.total],
                ['თვითღირებულება', saleDraftTotals.costTotal],
                ['მოგება', saleDraftTotals.profit],
              ].map(([label, value]) => (
                <div key={String(label)} style={{ border: `1px solid ${colors.line}`, background: colors.header, padding: 9 }}>
                  <div style={{ color: colors.muted, fontSize: 11, fontWeight: 700 }}>{label}</div>
                  <div style={{ marginTop: 4, fontSize: 16, fontWeight: 850, textAlign: 'right' }}>{money(Number(value))}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <RegisterTable columns={['თარიღი', 'დოკუმენტი', 'კლიენტი', 'ჯამი', 'დღგ', 'მოგება', 'გადახდა', 'სტატუსი']} empty={!sales.length}>
          {sales.map((sale) => (
            <tr key={sale.id} style={{ borderTop: `1px solid ${colors.line}` }}>
              <td style={{ padding: '8px 10px' }}>{sale.sale_date}</td>
              <td style={{ padding: '8px 10px', fontWeight: 800 }}>{sale.invoice_number || '-'}</td>
              <td style={{ padding: '8px 10px' }}>{sale.customer_name || 'საცალო'}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(sale.total)}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(sale.vat_amount)}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(sale.profit)}</td>
              <td style={{ padding: '8px 10px' }}>{sale.payment_status}</td>
              <td style={{ padding: '8px 10px' }}>{sale.status}</td>
            </tr>
          ))}
        </RegisterTable>
      </div>
    )
  }

  function renderPurchases() {
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <section style={{ border: `1px solid ${colors.line}`, background: '#fff' }}>
          <div style={{ padding: '9px 12px', background: colors.header, borderBottom: `1px solid ${colors.line}`, fontWeight: 800 }}>
            იმპორტის დოკუმენტი
          </div>
          <div style={{ padding: 12, display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 130px 100px 110px 120px 140px', gap: 9, alignItems: 'end' }}>
              <Field label="მომწოდებელი">
                <select value={importSupplierId} onChange={(event) => setImportSupplierId(event.target.value)} style={fieldStyle()}>
                  <option value="">უცნობი</option>
                  {parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
                </select>
              </Field>
              <Field label="ინვოისის N">
                <input value={importInvoiceNo} onChange={(event) => setImportInvoiceNo(event.target.value)} placeholder="ავტომატური" style={fieldStyle()} />
              </Field>
              <Field label="თარიღი">
                <input type="date" value={importInvoiceDate} onChange={(event) => setImportInvoiceDate(event.target.value)} style={fieldStyle()} />
              </Field>
              <Field label="ვალუტა">
                <select value={importCurrency} onChange={(event) => setImportCurrency(event.target.value as 'USD' | 'EUR')} style={fieldStyle()}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </Field>
              <Field label="კურსი">
                <input value={importRate} onChange={(event) => setImportRate(event.target.value)} inputMode="decimal" style={fieldStyle()} />
              </Field>
              <button type="button" onClick={loadNbgRate} disabled={loadingNbgRate} style={{ ...buttonStyle(), opacity: loadingNbgRate ? 0.55 : 1 }}>
                {loadingNbgRate ? 'იტვირთება...' : 'NBG კურსი'}
              </button>
              <Field label="საბაჟო GEL">
                <input value={importCustomsGel} onChange={(event) => setImportCustomsGel(event.target.value)} inputMode="decimal" style={fieldStyle()} />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 110px 140px 110px auto', gap: 9, alignItems: 'end' }}>
              <Field label="საქონელი">
                <select
                  value={importProductId}
                  onChange={(event) => {
                    const product = products.find((item) => item.id === event.target.value)
                    setImportProductId(event.target.value)
                    setImportForeignPrice(product && Number(importRate) > 0 ? String(roundMoney(Number(product.default_cost || 0) / Number(importRate))) : '')
                  }}
                  style={fieldStyle()}
                >
                  <option value="">აირჩიე</option>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
              </Field>
              <Field label="რაოდ.">
                <input value={importQuantity} onChange={(event) => setImportQuantity(event.target.value)} inputMode="decimal" style={fieldStyle()} />
              </Field>
              <Field label={`ფასი ${importCurrency}`}>
                <input value={importForeignPrice} onChange={(event) => setImportForeignPrice(event.target.value)} inputMode="decimal" style={fieldStyle()} />
              </Field>
              <Field label="Markup %">
                <input value={importMarkup} onChange={(event) => setImportMarkup(event.target.value)} inputMode="decimal" style={fieldStyle()} />
              </Field>
              <button type="button" onClick={addImportLine} disabled={!importProductId} style={{ ...buttonStyle(), opacity: !importProductId ? 0.55 : 1 }}>
                დამატება
              </button>
            </div>

            <RegisterTable columns={['საქონელი', 'რაოდ.', `ფასი ${importCurrency}`, 'ფასი GEL', 'საბაჟო წილი', 'თვითღირებულება', 'გასაყიდი', '']} empty={!calculatedImportLines.length}>
              {calculatedImportLines.map((line) => (
                <tr key={line.lineId} style={{ borderTop: `1px solid ${colors.line}` }}>
                  <td style={{ padding: '8px 10px', fontWeight: 800 }}>{line.product.name}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(line.quantity)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(line.foreignUnitPrice)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(line.gelLineTotal)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(line.customsShare)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900 }}>{money(line.unitCost)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(line.salePrice)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                    <button type="button" onClick={() => removeImportLine(line.lineId)} style={buttonStyle()}>წაშლა</button>
                  </td>
                </tr>
              ))}
            </RegisterTable>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(130px, 1fr)) auto', gap: 10, alignItems: 'stretch' }}>
              {[
                ['საქონელი GEL', importDraftTotals.goodsGelTotal],
                ['საბაჟო GEL', importDraftTotals.customsTotal],
                ['სულ თვითღირებულება', importDraftTotals.goodsGelTotal + importDraftTotals.customsTotal],
                ['კურსი', importDraftTotals.rate],
              ].map(([label, value]) => (
                <div key={String(label)} style={{ border: `1px solid ${colors.line}`, background: colors.header, padding: 10 }}>
                  <div style={{ color: colors.muted, fontSize: 12, fontWeight: 800 }}>{label}</div>
                  <div style={{ marginTop: 6, textAlign: 'right', fontWeight: 900 }}>{money(Number(value))}</div>
                </div>
              ))}
              <button
                type="button"
                onClick={saveImportDocument}
                disabled={savingImport || !calculatedImportLines.length}
                style={{ ...buttonStyle('primary'), minHeight: 54, opacity: savingImport || !calculatedImportLines.length ? 0.55 : 1 }}
              >
                {savingImport ? 'ტარდება...' : 'იმპორტის გატარება'}
              </button>
            </div>
          </div>
        </section>

        <section style={{ border: `1px solid ${colors.line}`, background: '#fff' }}>
          <div style={{ padding: '9px 12px', background: colors.header, borderBottom: `1px solid ${colors.line}`, fontWeight: 800 }}>
            შესყიდვის დოკუმენტი
          </div>
          <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '2fr 2fr 110px 140px 140px 150px auto', gap: 9, alignItems: 'end' }}>
            <Field label="საქონელი">
              <select
                value={purchaseProductId}
                onChange={(event) => {
                  const product = products.find((item) => item.id === event.target.value)
                  setPurchaseProductId(event.target.value)
                  setPurchaseUnitCost(product ? String(Number(product.default_cost || 0)) : '')
                  setPurchaseSalePrice(product ? String(Number(product.default_price || 0)) : '')
                }}
                style={fieldStyle()}
              >
                <option value="">აირჩიე</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </Field>
            <Field label="მომწოდებელი">
              <select value={purchaseSupplierId} onChange={(event) => setPurchaseSupplierId(event.target.value)} style={fieldStyle()}>
                <option value="">უცნობი</option>
                {parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
              </select>
            </Field>
            <Field label="რაოდ.">
              <input value={purchaseQuantity} onChange={(event) => setPurchaseQuantity(event.target.value)} inputMode="decimal" style={fieldStyle()} />
            </Field>
            <Field label="თვითღირებულება">
              <input value={purchaseUnitCost} onChange={(event) => setPurchaseUnitCost(event.target.value)} inputMode="decimal" style={fieldStyle()} />
            </Field>
            <Field label="გასაყიდი ფასი">
              <input value={purchaseSalePrice} onChange={(event) => setPurchaseSalePrice(event.target.value)} inputMode="decimal" style={fieldStyle()} />
            </Field>
            <Field label="დოკუმენტის N">
              <input value={purchaseDocNo} onChange={(event) => setPurchaseDocNo(event.target.value)} placeholder="ავტომატური" style={fieldStyle()} />
            </Field>
            <button type="button" onClick={savePurchase} disabled={savingPurchase || !purchaseProductId} style={{ ...buttonStyle('primary'), opacity: savingPurchase || !purchaseProductId ? 0.55 : 1 }}>
              {savingPurchase ? 'ინახება...' : 'შენახვა'}
            </button>
          </div>
        </section>

        <RegisterTable columns={['თარიღი', 'დოკუმენტი', 'საქონელი', 'შემოსავალი', 'გასავალი', 'თვითღირებულება', 'ჯამი', 'წყარო']} empty={!stockLots.length}>
          {stockLots.slice(0, 120).map((lot) => {
            const product = products.find((item) => item.id === lot.product_id)
            return (
              <tr key={lot.id} style={{ borderTop: `1px solid ${colors.line}` }}>
                <td style={{ padding: '8px 10px' }}>{lot.import_date || '-'}</td>
                <td style={{ padding: '8px 10px', fontWeight: 800 }}>{lot.source_doc || '-'}</td>
                <td style={{ padding: '8px 10px' }}>{product?.name || lot.product_id}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(lot.quantity_in)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(lot.quantity_out)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(lot.unit_cost)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(lot.total_cost)}</td>
                <td style={{ padding: '8px 10px' }}>{lot.source || '-'}</td>
              </tr>
            )
          })}
        </RegisterTable>
      </div>
    )
  }

  function renderCash() {
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <section style={{ border: `1px solid ${colors.line}`, background: '#fff' }}>
          <div style={{ padding: '9px 12px', background: colors.header, borderBottom: `1px solid ${colors.line}`, fontWeight: 800 }}>
            გადახდის გატარება
          </div>
          <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 9, alignItems: 'end' }}>
            <Field label="დოკუმენტი">
              <select
                value={paymentSaleId}
                onChange={(event) => {
                  const nextSale = sales.find((sale) => sale.id === event.target.value)
                  setPaymentSaleId(event.target.value)
                  setPaymentAmount(nextSale ? String(Number(nextSale.total || 0)) : '')
                }}
                style={fieldStyle()}
              >
                <option value="">აირჩიე</option>
                {sales.map((sale) => <option key={sale.id} value={sale.id}>{sale.invoice_number || sale.sale_date} - {money(sale.total)} GEL</option>)}
              </select>
            </Field>
            <Field label="მეთოდი">
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)} style={fieldStyle()}>
                <option value="cash">სალარო</option>
                <option value="bank_transfer">ბანკი</option>
                <option value="card">ბარათი</option>
                <option value="installment">განვადება</option>
              </select>
            </Field>
            <Field label="თანხა">
              <input value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} inputMode="decimal" style={fieldStyle()} />
            </Field>
            <button type="button" disabled={savingPayment || !paymentSaleId} onClick={savePayment} style={{ ...buttonStyle('primary'), opacity: savingPayment || !paymentSaleId ? 0.55 : 1 }}>
              გატარება
            </button>
          </div>
        </section>

        <RegisterTable columns={['დოკუმენტი', 'კლიენტი', 'ჯამი', 'გადახდის სტატუსი']} empty={!sales.length}>
          {sales.map((sale) => (
            <tr key={sale.id} style={{ borderTop: `1px solid ${colors.line}` }}>
              <td style={{ padding: '8px 10px', fontWeight: 800 }}>{sale.invoice_number || '-'}</td>
              <td style={{ padding: '8px 10px' }}>{sale.customer_name || 'საცალო'}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(sale.total)}</td>
              <td style={{ padding: '8px 10px' }}>{sale.payment_status}</td>
            </tr>
          ))}
        </RegisterTable>
      </div>
    )
  }

  function renderStock() {
    const visibleStockBalances = stockBalances
      .filter((row) => {
        const needle = query.trim().toLowerCase()
        if (!needle) return true
        return [row.product.code || '', row.product.name, row.product.category || ''].some((value) => value.toLowerCase().includes(needle))
      })
      .sort((a, b) => {
        const aHasBalance = Math.abs(a.balance) > 0 ? 1 : 0
        const bHasBalance = Math.abs(b.balance) > 0 ? 1 : 0
        if (aHasBalance !== bHasBalance) return bHasBalance - aHasBalance
        return a.product.name.localeCompare(b.product.name, 'ka')
      })

    return (
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ border: `1px solid ${colors.line}`, background: colors.header, padding: 10, color: colors.ink, fontSize: 13 }}>
          საქონელი: {products.length} · საწყობის მოძრაობა: {stockLots.length} · ნაშთიანი პოზიცია: {stockBalances.filter((row) => Math.abs(row.balance) > 0).length}
        </div>
        <RegisterTable columns={['კოდი', 'ნომენკლატურა', 'ჯგუფი', 'შემოსავალი', 'გასავალი', 'ნაშთი', 'თვითღირებულება', 'ფასი']} empty={!visibleStockBalances.length}>
          {visibleStockBalances.map((row) => (
            <tr key={row.product.id} style={{ borderTop: `1px solid ${colors.line}` }}>
              <td style={{ padding: '8px 10px' }}>{row.product.code || '-'}</td>
              <td style={{ padding: '8px 10px', fontWeight: 800 }}>{row.product.name}</td>
              <td style={{ padding: '8px 10px' }}>{row.product.category || '-'}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(row.quantityIn)}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(row.quantityOut)}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900, color: row.balance < 0 ? colors.danger : colors.ink }}>{money(row.balance)}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(row.product.default_cost)}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(row.product.default_price)}</td>
            </tr>
          ))}
        </RegisterTable>
      </div>
    )
  }

  function renderReports() {
    const salesTotal = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0)
    const vatTotal = sales.reduce((sum, sale) => sum + Number(sale.vat_amount || 0), 0)
    const profitTotal = sales.reduce((sum, sale) => sum + Number(sale.profit || 0), 0)
    const stockValue = stockBalances.reduce((sum, row) => sum + Math.max(row.balance, 0) * Number(row.product.default_cost || 0), 0)
    const debtTotal = sales.filter((sale) => sale.payment_status !== 'paid').reduce((sum, sale) => sum + Number(sale.total || 0), 0)

    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(130px, 1fr))', gap: 10 }}>
          {[
            ['გაყიდვები', salesTotal],
            ['დღგ', vatTotal],
            ['მოგება', profitTotal],
            ['საწყობის ღირებულება', stockValue],
            ['დავალიანება', debtTotal],
          ].map(([label, value]) => (
            <div key={String(label)} style={{ border: `1px solid ${colors.line}`, background: colors.header, padding: 12 }}>
              <div style={{ color: colors.muted, fontSize: 12, fontWeight: 700 }}>{label}</div>
              <div style={{ marginTop: 8, fontSize: 20, fontWeight: 900, textAlign: 'right' }}>{money(Number(value))}</div>
            </div>
          ))}
        </section>
        <RegisterTable columns={['დოკუმენტი', 'კლიენტი', 'ჯამი', 'დღგ', 'მოგება', 'გადახდა']} empty={!sales.length}>
          {sales.map((sale) => (
            <tr key={sale.id} style={{ borderTop: `1px solid ${colors.line}` }}>
              <td style={{ padding: '8px 10px', fontWeight: 800 }}>{sale.invoice_number || '-'}</td>
              <td style={{ padding: '8px 10px' }}>{sale.customer_name || 'საცალო'}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(sale.total)}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(sale.vat_amount)}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(sale.profit)}</td>
              <td style={{ padding: '8px 10px' }}>{sale.payment_status}</td>
            </tr>
          ))}
        </RegisterTable>
      </div>
    )
  }

  function renderParties() {
    return (
      <RegisterTable columns={['კოდი', 'დასახელება', 'ს/კ', 'ტელეფონი', 'ტიპი']} empty={!filteredParties.length}>
        {filteredParties.map((party) => (
          <tr key={party.id} style={{ borderTop: `1px solid ${colors.line}` }}>
            <td style={{ padding: '8px 10px' }}>{party.code || '-'}</td>
            <td style={{ padding: '8px 10px', fontWeight: 800 }}>{party.name}</td>
            <td style={{ padding: '8px 10px' }}>{party.tax_id || '-'}</td>
            <td style={{ padding: '8px 10px' }}>{party.phone || '-'}</td>
            <td style={{ padding: '8px 10px' }}>{party.party_type}</td>
          </tr>
        ))}
      </RegisterTable>
    )
  }

  function renderImport() {
    return (
      <RegisterTable columns={['ზედნადები', 'კონტრაგენტი', 'საქონლის ღირებულება', 'დღგ', 'ჯამი', 'სტატუსი']} empty={!waybillReview.length}>
        {waybillReview.map((row) => (
          <tr key={row.id} style={{ borderTop: `1px solid ${colors.line}` }}>
            <td style={{ padding: '8px 10px', fontWeight: 800 }}>{row.waybill_number}</td>
            <td style={{ padding: '8px 10px' }}>{row.party_name || '-'}</td>
            <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(row.amount_without_vat)}</td>
            <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(row.vat_amount)}</td>
            <td style={{ padding: '8px 10px', textAlign: 'right' }}>{money(row.total)}</td>
            <td style={{ padding: '8px 10px' }}>{row.import_status}</td>
          </tr>
        ))}
      </RegisterTable>
    )
  }

  function renderPlaceholder(title: string, body: string) {
    return (
      <section style={{ border: `1px solid ${colors.line}`, background: '#fff', maxWidth: 760 }}>
        <div style={{ padding: '9px 12px', background: colors.header, borderBottom: `1px solid ${colors.line}`, fontWeight: 800 }}>{title}</div>
        <p style={{ margin: 0, padding: 14, color: colors.muted, lineHeight: 1.6 }}>{body}</p>
      </section>
    )
  }

  function renderActiveModule() {
    if (activeModule === 'main') return renderMain()
    if (activeModule === 'sales') return renderSales()
    if (activeModule === 'stock') return renderStock()
    if (activeModule === 'cash') return renderCash()
    if (activeModule === 'purchases') return renderPurchases()
    if (activeModule === 'rs') return renderImport()
    if (activeModule === 'reports') return renderReports()
    return renderParties()
  }

  const title = modules.find((item) => item.key === activeModule)?.label || 'მთავარი'

  return (
    <main style={{ minHeight: '100vh', background: colors.canvas, color: colors.ink, fontFamily: 'Arial, sans-serif' }}>
      <header style={{ height: 48, background: colors.blue, color: '#fff', display: 'flex', alignItems: 'center', gap: 14, padding: '0 12px', borderBottom: `3px solid ${colors.blueDark}` }}>
        <strong style={{ fontSize: 26, letterSpacing: 0 }}>1C</strong>
        <Menu size={24} />
        <span style={{ fontSize: 18, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          [სოლო] 157893 - eighteeth / ბალანსი, ვერსია 1.3 / {company?.name || 'MEDIQALJORJIA'} / {profile?.full_name || 'Admin'}
        </span>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '295px minmax(0, 1fr)', minHeight: 'calc(100vh - 51px)' }}>
        <aside style={{ background: colors.blue, color: '#fff' }}>
          <nav>
            {modules.map((item) => {
              const active = item.key === activeModule
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveModule(item.key)}
                  style={{
                    width: '100%',
                    height: 72,
                    display: 'grid',
                    gridTemplateColumns: '76px 1fr',
                    alignItems: 'center',
                    border: 'none',
                    borderBottom: active ? `1px solid ${colors.blueDark}` : '1px solid rgba(255,255,255,0.04)',
                    background: active ? '#fff' : colors.blue,
                    color: active ? colors.ink : '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: 0,
                  }}
                >
                  <span style={{ display: 'grid', placeItems: 'center', color: active ? colors.blue : '#fff' }}>{item.icon}</span>
                  <span style={{ fontSize: 17, fontWeight: 800 }}>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        <section style={{ minWidth: 0, background: '#fff' }}>
          {activeModule !== 'main' ? (
            <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, borderBottom: `1px solid ${colors.line}`, alignItems: 'center' }}>
              <div>
                <h1 style={{ margin: 0, color: colors.ink, fontSize: 24, fontWeight: 500 }}>{title}</h1>
                <p style={{ margin: '4px 0 0', color: colors.muted, fontSize: 13 }}>
                  საქონელი: {counts.products} · კონტრაგენტები: {counts.parties} · გაყიდვები: {counts.sales} · გადახდები: {counts.payments}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 9, top: 10, color: colors.muted }} />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ძებნა" style={{ ...fieldStyle(), width: 220, paddingLeft: 29 }} />
                </div>
                <button type="button" onClick={load} style={buttonStyle()}>
                  <RefreshCw size={14} /> განახლება
                </button>
                <Link href="/admin" style={buttonStyle()}>
                  <Settings size={14} /> Admin
                </Link>
              </div>
            </div>
          ) : null}

          <div style={{ padding: activeModule === 'main' ? 0 : 14 }}>
            {loading ? (
              <div style={{ margin: 14, padding: 12, border: `1px solid ${colors.line}`, color: colors.muted }}>ERP იტვირთება...</div>
            ) : error ? (
              <div style={{ margin: 14, padding: 12, border: '1px solid rgba(164,55,55,0.35)', color: colors.danger, fontWeight: 800 }}>{error}</div>
            ) : message ? (
              <div style={{ margin: 14, padding: 12, border: '1px solid rgba(11,107,77,0.35)', color: colors.green, fontWeight: 800 }}>{message}</div>
            ) : null}

            {renderActiveModule()}
          </div>
        </section>
      </div>
    </main>
  )
}
