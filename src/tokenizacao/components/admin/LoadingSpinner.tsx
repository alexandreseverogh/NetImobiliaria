'use client'


interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function LoadingSpinner({ 
  message = 'Carregando...', 
  size = 'md',
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  return (
    <div className={`min-h-screen bg-gray-100 flex items-center justify-center ${className}`}>
      <div className="text-center">
        <div 
          className={`animate-spin rounded-full border-b-2 border-blue-600 mx-auto ${sizeClasses[size]}`}
          role="status"
          aria-label="Carregando"
        >
          <span className="sr-only">{message}</span>
        </div>
        <p className={`mt-2 text-gray-600 ${textSizeClasses[size]}`}>
          {message}
        </p>
      </div>
    </div>
  )
}

