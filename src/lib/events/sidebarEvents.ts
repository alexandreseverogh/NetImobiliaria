'use client'

// Sistema de eventos para notificar mudanças na sidebar
class SidebarEventManager {
  private listeners: Set<() => void> = new Set()

  subscribe(callback: () => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  notify() {
    this.listeners.forEach(callback => callback())
  }
}

export const sidebarEventManager = new SidebarEventManager()
