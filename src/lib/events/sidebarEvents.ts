'use client'

// Sistema de eventos para notificar mudanças na sidebar
class SidebarEventManager {
  private listeners: Set<(data?: any) => void> = new Set()

  subscribe(callback: (data?: any) => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  notify(data?: any) {
    this.listeners.forEach(callback => callback(data))
  }
}

export const sidebarEventManager = new SidebarEventManager()
