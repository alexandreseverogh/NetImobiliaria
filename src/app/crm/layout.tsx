'use client'

import React from 'react'
import CRMLayoutContent from './CRMLayoutContent'
import { AuthProvider } from '@/hooks/useAuth'

export default function CRMLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <CRMLayoutContent>{children}</CRMLayoutContent>
    </AuthProvider>
  )
}
