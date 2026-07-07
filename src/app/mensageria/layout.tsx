'use client'

import React from 'react'
import MensageriaLayoutContent from './MensageriaLayoutContent'
import { AuthProvider } from '@/hooks/useAuth'

export default function MensageriaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <MensageriaLayoutContent>{children}</MensageriaLayoutContent>
    </AuthProvider>
  )
}
