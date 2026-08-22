'use client'

import type { ReactNode } from 'react'
import { TenantThemeProvider } from '../enterprise/TenantThemeContext'
import { StudentProvider } from '../state/StudentContext'
import { AppLayout } from './AppLayout'

export function HubProviders({ children }: { children: ReactNode }) {
  return (
    <TenantThemeProvider>
      <StudentProvider>
        <AppLayout>{children}</AppLayout>
      </StudentProvider>
    </TenantThemeProvider>
  )
}
