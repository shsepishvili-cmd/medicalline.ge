import { ClinicShell, ClinicPageHeader } from '../../_components/ClinicShell'
import { OfferDetails } from '../../_components/OfferViews'
export default async function ClinicOfferPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ClinicShell><ClinicPageHeader eyebrow="კომერციული შეთავაზება" title="შეთავაზების დეტალები" /><OfferDetails offerId={id} /></ClinicShell> }

