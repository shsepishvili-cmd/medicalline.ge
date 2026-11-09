import { redirect } from 'next/navigation'

export default async function AdminOfferAlias({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/admin/clinic-offers?offer=${encodeURIComponent(id)}`)
}
