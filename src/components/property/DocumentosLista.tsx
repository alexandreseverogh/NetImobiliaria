import { 
  DocumentTextIcon,
  ArrowDownTrayIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface DocumentosListaProps {
  documentos: any[]
  loading: boolean
  imovelId?: string
}

export default function DocumentosLista({ 
  documentos, 
  loading,
  imovelId 
}: DocumentosListaProps) {

  // Função para visualizar documento usando popup
  const handleViewDocument = (documentoId: string) => {
    try {
      console.log('🔍 DocumentosLista - Visualizando documento:', documentoId)
      
      // Encontrar o documento pelo ID
      const documento = documentos.find(doc => doc.id.toString() === documentoId.toString())
      
      if (documento && documento.url) {
        console.log('🔍 DocumentosLista - Abrindo documento em popup')
        
        // Criar popup em tela cheia sem controles do browser
        const popup = window.open(
          '', 
          'documentViewer', 
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
      } else {
        console.error('❌ DocumentosLista - Documento ou URL não disponível')
        alert('Erro: Documento não disponível para visualização')
      }
    } catch (error) {
      console.error('❌ DocumentosLista - Erro ao abrir documento:', error)
      alert('Erro ao abrir documento')
    }
  }

  
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Carregando documentos...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Documentos */}
      {documentos.length > 0 && (
        <div className="space-y-3">
          {documentos.map((documento) => (
            <div 
              key={documento.id} 
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {documento.nome_arquivo}
                  </p>
                  <p className="text-sm text-gray-500">
                    {documento.tipo_documento}
                  </p>
                  <p className="text-xs text-gray-400">
                    Enviado em {new Date(documento.data_upload).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {Math.round(documento.tamanho_bytes / 1024)} KB
                  </p>
                  <p className="text-xs text-gray-500">
                    {documento.tipo_mime}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleViewDocument(documento.id)}
                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors group-hover:bg-white rounded-lg"
                    title="Visualizar documento"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => {
                      if (documento.url) {
                        const link = document.createElement('a')
                        link.href = documento.url
                        link.download = documento.nome_arquivo
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors group-hover:bg-white rounded-lg"
                    title="Baixar documento"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Nenhum documento disponível */}
      {documentos.length === 0 && (
        <div className="text-center py-12">
          <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Nenhum documento disponível</p>
          <p className="text-gray-400 text-sm mt-2">
            Este imóvel ainda não possui documentos cadastrados
          </p>
        </div>
      )}

    </div>
  )
}
