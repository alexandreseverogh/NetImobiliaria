import { AUTH_CONFIG } from '@/lib/config/auth'

// Interface para opções de requisição
interface RequestOptions extends RequestInit {
  skipAuth?: boolean
  retryCount?: number
}

// Classe para gerenciar requisições HTTP com autenticação
class ApiClient {
  private baseURL: string
  private maxRetries: number = 3

  constructor(baseURL: string = '') {
    this.baseURL = baseURL
  }

  // Função principal para fazer requisições
  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth = false, retryCount = 0, ...fetchOptions } = options
    
    try {
      // Adicionar headers padrão
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      }

      // Fazer a requisição
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...fetchOptions,
        headers,
        credentials: 'include', // Incluir cookies
      })

      // Se a resposta for 401 e não for uma tentativa de renovação, tentar renovar o token
      if (response.status === 401 && !skipAuth && retryCount < this.maxRetries) {
        const refreshResult = await this.refreshToken()
        
        if (refreshResult.success) {
          // Tentar novamente com o novo token
          return this.request(endpoint, { ...options, retryCount: retryCount + 1 })
        } else {
          // Se não conseguir renovar, redirecionar para login
          this.redirectToLogin()
          throw new Error('Token expirado e não foi possível renovar')
        }
      }

      // Se a resposta não for ok, lançar erro
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      // Retornar dados da resposta
      return response.json()
    } catch (error) {
      console.error('Erro na requisição:', error)
      throw error
    }
  }

  // Renovar token de acesso
  private async refreshToken(): Promise<{ success: boolean }> {
    try {
      const response = await fetch('/api/admin/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        return { success: true }
      }
      
      return { success: false }
    } catch (error) {
      console.error('Erro ao renovar token:', error)
      return { success: false }
    }
  }

  // Redirecionar para login
  private redirectToLogin(): void {
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login'
    }
  }

  // Métodos HTTP
  async get<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async put<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async patch<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async delete<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

// Instância padrão do cliente API
export const apiClient = new ApiClient()

// Funções utilitárias para uso direto
export const api = {
  get: <T = any>(endpoint: string, options?: RequestOptions) => apiClient.get<T>(endpoint, options),
  post: <T = any>(endpoint: string, data?: any, options?: RequestOptions) => apiClient.post<T>(endpoint, data, options),
  put: <T = any>(endpoint: string, data?: any, options?: RequestOptions) => apiClient.put<T>(endpoint, data, options),
  patch: <T = any>(endpoint: string, data?: any, options?: RequestOptions) => apiClient.patch<T>(endpoint, data, options),
  delete: <T = any>(endpoint: string, options?: RequestOptions) => apiClient.delete<T>(endpoint, options),
}

export default apiClient






