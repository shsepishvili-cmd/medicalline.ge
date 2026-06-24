'use client'

import { useState } from 'react'
import { CreditCard } from 'lucide-react'

type CredoInstallmentButtonProps = {
  token: string
  amount: number | null
}

export default function CredoInstallmentButton({ token, amount }: CredoInstallmentButtonProps) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function startCredo() {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(`/api/offers/${encodeURIComponent(token)}/credo`, {
        method: 'POST',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok || !payload.redirectUrl) {
        throw new Error(payload?.error || 'Credo განვადების მოთხოვნა ვერ შეიქმნა.')
      }
      window.location.href = payload.redirectUrl
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Credo განვადების შეცდომა')
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-[#e6d7bf] bg-[#fffaf2] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-slate-950">Credo განვადება</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            გადადი Credo-ს ონლაინ განვადების განაცხადზე ამ შეთავაზების თანხით.
          </p>
        </div>
        <button
          type="button"
          onClick={startCredo}
          disabled={busy || !amount || amount <= 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8a5a16] px-4 py-3 text-xs font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <CreditCard size={16} /> {busy ? 'მზადდება...' : 'Credo განაცხადი'}
        </button>
      </div>
      {message && (
        <p className="mt-3 rounded-md bg-white px-3 py-2 text-xs font-semibold text-slate-600">
          {message}
        </p>
      )}
    </div>
  )
}
