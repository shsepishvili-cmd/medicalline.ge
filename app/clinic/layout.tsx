import type { ReactNode } from 'react'
import { ClinicPortalProvider } from './_components/ClinicPortalProvider'
import './portal.css'
import '../mobile-adapt.css'

export default function ClinicLayout({ children }: { children: ReactNode }) {
  return <ClinicPortalProvider><div className="ml-clinic ml-mobile">{children}</div></ClinicPortalProvider>
}
