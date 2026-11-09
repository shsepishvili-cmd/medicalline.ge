import type { ReactNode } from 'react'
import { ClinicPortalProvider } from './_components/ClinicPortalProvider'
import './portal.css'

export default function ClinicLayout({ children }: { children: ReactNode }) {
  return <ClinicPortalProvider>{children}</ClinicPortalProvider>
}

