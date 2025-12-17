import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'
import SafeImage from '@/components/common/SafeImage'

interface DocumentModalProps {
  isOpen: boolean
  onClose: () => void
  documento: {
    nome_arquivo: string
    tipo_mime: string
    url: string
    tamanho_bytes: number
  } | null
}

export default function DocumentModal({ isOpen, onClose, documento }: DocumentModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Prevenir scroll do body quando modal está aberto
      document.body.style.overflow = 'hidden'
    } else {
      // Restaurar scroll do body quando modal está fechado
      document.body.style.overflow = 'unset'
    }

    // Cleanup function para restaurar scroll quando componente é desmontado
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen || !documento) return null

  const isPDF = documento.tipo_mime === 'application/pdf'
  const isImage = documento.tipo_mime.startsWith('image/')
  const isText = documento.tipo_mime.startsWith('text/')

  const renderContent = () => {
    if (isPDF) {
      return (
        <div 
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div style={{
            textAlign: 'center',
            color: 'white',
            maxWidth: '600px',
            padding: '40px'
          }}>
            <div style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '50%',
              width: '80px',
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#3b82f6' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14,2 14,8 20,8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10,9 9,9 8,9"></polyline>
              </svg>
            </div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#1f2937'
            }}>
              {documento.nome_arquivo}
            </h3>
            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              marginBottom: '8px'
            }}>
              {documento.tipo_mime} • {Math.round(documento.tamanho_bytes / 1024)} KB
            </p>
            <p style={{
              fontSize: '14px',
              color: '#9ca3af',
              marginBottom: '32px'
            }}>
              Clique no botão abaixo para abrir o PDF em uma nova janela em tela cheia
            </p>
            <button
              onClick={() => {
                // Fechar o modal atual primeiro
                onClose()
                
                // Criar popup em tela cheia sem controles do browser
                const popup = window.open(
                  '', 
                  'pdfViewer', 
                  'fullscreen=yes,scrollbars=yes,resizable=yes,width=screen.width,height=screen.height,left=0,top=0,toolbar=no,menubar=no,location=no,status=no'
                )
                
                if (popup) {
                  // Escrever HTML completo para o popup
                  popup.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>${documento.nome_arquivo}</title>
                      <style>
                        body { 
                          margin: 0; 
                          padding: 0; 
                          overflow: hidden;
                          background: black;
                        }
                        .header {
                          position: fixed;
                          top: 0;
                          left: 0;
                          right: 0;
                          background: rgba(0,0,0,0.8);
                          color: white;
                          padding: 10px 20px;
                          z-index: 1000;
                          display: flex;
                          justify-content: space-between;
                          align-items: center;
                        }
                        .close-btn {
                          background: #dc2626;
                          color: white;
                          border: none;
                          padding: 8px 16px;
                          border-radius: 4px;
                          cursor: pointer;
                          font-size: 14px;
                        }
                        .close-btn:hover {
                          background: #b91c1c;
                        }
                        iframe {
                          width: 100vw;
                          height: 100vh;
                          border: none;
                          margin-top: 60px;
                        }
                      </style>
                    </head>
                    <body>
                      <div class="header">
                        <span style="font-weight: 600;">${documento.nome_arquivo}</span>
                        <button class="close-btn" onclick="window.close()">✕ Fechar</button>
                      </div>
                      <iframe src="${documento.url}#toolbar=0&navpanes=0&scrollbar=1&statusbar=0&messages=0&view=FitH"></iframe>
                    </body>
                    </html>
                  `)
                  popup.document.close()
                } else {
                  alert('Popup bloqueado! Permita popups para este site.')
                }
              }}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb'
              }}
            >
              📄 Abrir PDF em Nova Janela
            </button>
          </div>
        </div>
      )
    } else if (isImage) {
      return (
        <div 
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f3f4f6'
          }}
        >
          <div className="relative w-full h-full">
            <SafeImage
              src={documento.url}
              alt={documento.nome_arquivo}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        </div>
      )
    } else if (isText) {
      return (
        <div 
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#f3f4f6'
          }}
        >
          <iframe
            src={documento.url}
            title={documento.nome_arquivo}
            style={{ 
              width: '100%', 
              height: '100%',
              border: 'none',
              display: 'block',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
          />
        </div>
      )
    } else {
      // Para outros tipos de arquivo, mostrar informações e opção de download
      return (
        <div 
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            backgroundColor: '#f3f4f6'
          }}
        >
          <div className="bg-blue-100 rounded-full p-4 mb-4">
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {documento.nome_arquivo}
          </h3>
          <p className="text-gray-500 mb-4">
            Tipo: {documento.tipo_mime}
          </p>
          <p className="text-gray-400 text-sm mb-6">
            Tamanho: {Math.round(documento.tamanho_bytes / 1024)} KB
          </p>
          <p className="text-gray-500 mb-6">
            Este tipo de arquivo não pode ser visualizado diretamente.
          </p>
          <button
            onClick={() => {
              const link = document.createElement('a')
              link.href = documento.url
              link.download = documento.nome_arquivo
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Baixar Arquivo
          </button>
        </div>
      )
    }
  }

  const modalContent = (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        backgroundColor: 'black',
        margin: 0,
        padding: 0,
        overflow: 'hidden'
      }}
    >
      {/* Botão de fechar flutuante */}
      <button
        onClick={onClose}
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          zIndex: 1000000,
          padding: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'white'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'
        }}
        title="Fechar visualização"
      >
        <XMarkIcon className="h-6 w-6" style={{ color: '#4b5563' }} />
      </button>

      {/* Informações do documento flutuantes */}
      <div 
        style={{
          position: 'fixed',
          top: '16px',
          left: '16px',
          zIndex: 1000000,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          borderRadius: '8px',
          padding: '12px',
          maxWidth: '400px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
      >
        <h2 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '4px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {documento.nome_arquivo}
        </h2>
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          marginBottom: '8px'
        }}>
          {documento.tipo_mime} • {Math.round(documento.tamanho_bytes / 1024)} KB
        </div>
        <button
          onClick={() => {
            const link = document.createElement('a')
            link.href = documento.url
            link.download = documento.nome_arquivo
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          }}
          style={{
            padding: '4px 12px',
            fontSize: '12px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1d4ed8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#2563eb'
          }}
        >
          Baixar
        </button>
      </div>

      {/* Conteúdo em tela cheia */}
      <div 
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
      >
        {renderContent()}
      </div>
    </div>
  )

  // Renderizar diretamente no document.body usando createPortal
  return createPortal(modalContent, document.body)
}
