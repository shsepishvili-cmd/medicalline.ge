'use client'

import Script from 'next/script'
import { useMemo, useState } from 'react'
import { Landmark } from 'lucide-react'

declare global {
  interface Window {
    BOG?: {
      Calculator?: {
        open: (config: {
          amount: number
          bnpl?: boolean | null
          onClose?: () => void
          onRequest?: (
            selected: { amount: number; month: number; discount_code?: string },
            successCb: (orderId: string) => void,
            closeCb: () => void,
          ) => false | void
          onComplete?: ({ redirectUrl }: { redirectUrl: string }) => false | void
        }) => void
        close?: () => void
      }
    }
  }
}

type BogInstallmentCalculatorProps = {
  amount: number | null
  productName: string
}

const clientId = process.env.NEXT_PUBLIC_BOG_INSTALLMENT_CLIENT_ID?.trim() || ''

export default function BogInstallmentCalculator({ amount, productName }: BogInstallmentCalculatorProps) {
  const [scriptReady, setScriptReady] = useState(false)
  const [message, setMessage] = useState('')

  const scriptUrl = useMemo(() => {
    if (!clientId) return ''
    return `https://webstatic.bog.ge/bog-sdk/bog-sdk.js?version=2&client_id=${encodeURIComponent(clientId)}`
  }, [])

  const canOpen = Boolean(amount && amount > 0 && clientId && scriptReady)

  function openCalculator() {
    setMessage('')

    if (!amount || amount <= 0) {
      setMessage('განვადების კალკულატორისთვის შეთავაზებაში ფასი უნდა იყოს მითითებული.')
      return
    }

    if (!clientId) {
      setMessage('BOG client_id ჯერ არ არის დამატებული.')
      return
    }

    if (!window.BOG?.Calculator?.open) {
      setMessage('BOG კალკულატორი ჯერ იტვირთება. სცადე რამდენიმე წამში.')
      return
    }

    window.BOG.Calculator.open({
      amount,
      bnpl: null,
      onRequest: (selected) => {
        const selectedText = `${productName}: ${selected.month} თვე, თვიური ₾${Number(selected.amount).toLocaleString('ka-GE')}`
        setMessage(`არჩეული პირობა: ${selectedText}`)
        return false
      },
      onComplete: () => false,
    })
  }

  return (
    <div className="mt-6 rounded-lg border border-[#d8e6ef] bg-[#f7fbff] p-4">
      {scriptUrl && (
        <Script
          src={scriptUrl}
          strategy="afterInteractive"
          onLoad={() => setScriptReady(true)}
          onError={() => setMessage('BOG SDK ვერ ჩაიტვირთა.')}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-slate-950">საქართველოს ბანკის განვადება</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            ნახე საორიენტაციო თვიური გადასახადი და პირობები BOG კალკულატორში.
          </p>
        </div>
        <button
          type="button"
          onClick={openCalculator}
          disabled={!amount || amount <= 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#f15a24] px-4 py-3 text-xs font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Landmark size={16} /> კალკულატორი
        </button>
      </div>

      {!canOpen && clientId && amount && amount > 0 && (
        <p className="mt-3 text-xs font-semibold text-slate-500">კალკულატორი იტვირთება...</p>
      )}
      {message && (
        <p className="mt-3 rounded-md bg-white px-3 py-2 text-xs font-semibold text-slate-600">
          {message}
        </p>
      )}
    </div>
  )
}
