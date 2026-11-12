import type { ReactNode } from 'react'
import '../mobile-adapt.css'

// Every admin page sits inside .ml-admin so one stylesheet can make the many
// admin modules (mostly inline-styled) usable on a phone.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="ml-admin ml-mobile">{children}</div>
}
