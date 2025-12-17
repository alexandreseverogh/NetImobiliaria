import { useEffect } from 'react'

export function usePageFocus(callback: () => void) {
  useEffect(() => {
    const handleFocus = () => {
      callback()
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        callback()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [callback])
}
