'use client';

import { useState } from 'react';
import { ArrowDownTrayIcon, DocumentTextIcon, TableCellsIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportReportsProps {
  logs: any[];
  stats: any;
}

export default function ExportReports({ logs, stats }: ExportReportsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      console.log('🔍 DEBUG EXPORT - Iniciando exportação:', exportFormat);
      console.log('🔍 DEBUG EXPORT - Logs disponíveis:', logs.length);
      console.log('🔍 DEBUG EXPORT - Stats:', stats);
      
      const filteredLogs = logs.filter(log => {
        if (!dateRange.start && !dateRange.end) return true;
        
        const logDate = new Date(log.created_at);
        const startDate = dateRange.start ? new Date(dateRange.start) : new Date(0);
        const endDate = dateRange.end ? new Date(dateRange.end + 'T23:59:59') : new Date();
        
        return logDate >= startDate && logDate <= endDate;
      });

      console.log('🔍 DEBUG EXPORT - Logs filtrados:', filteredLogs.length);

      switch (exportFormat) {
        case 'csv':
          console.log('🔍 DEBUG EXPORT - Exportando CSV');
          exportToCSV(filteredLogs);
          break;
        case 'json':
          console.log('🔍 DEBUG EXPORT - Exportando JSON');
          exportToJSON(filteredLogs);
          break;
        case 'pdf':
          console.log('🔍 DEBUG EXPORT - Exportando PDF');
          await exportToPDF(filteredLogs);
          console.log('🔍 DEBUG EXPORT - PDF exportado com sucesso');
          break;
      }
    } catch (error) {
      console.error('❌ Erro ao exportar:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : 'N/A';
      console.error('❌ Stack trace:', errorStack);
      alert(`Erro ao exportar relatório: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = (data: any[]) => {
    const headers = [
      'ID',
      'Usuário',
      'Ação',
      'IP',
      'User Agent',
      '2FA Usado',
      'Método 2FA',
      'Sucesso',
      'Motivo da Falha',
      'Session ID',
      'Data/Hora'
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(log => [
        log.id,
        `"${log.username}"`,
        `"${log.action}"`,
        `"${log.ip_address}"`,
        `"${log.user_agent || ''}"`,
        log.two_fa_used ? 'Sim' : 'Não',
        `"${log.two_fa_method || ''}"`,
        log.success ? 'Sim' : 'Não',
        `"${log.failure_reason || ''}"`,
        `"${log.session_id || ''}"`,
        `"${new Date(log.created_at).toLocaleString('pt-BR')}"`
      ].join(','))
    ].join('\n');

    downloadFile(csvContent, 'logs-login.csv', 'text/csv');
  };

  const exportToJSON = (data: any[]) => {
    const jsonData = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalRecords: data.length,
        dateRange: {
          start: dateRange.start || 'N/A',
          end: dateRange.end || 'N/A'
        },
        stats: stats
      },
      logs: data
    };

    downloadFile(JSON.stringify(jsonData, null, 2), 'logs-login.json', 'application/json');
  };

  const exportToPDF = async (data: any[]) => {
    try {
      console.log('🔍 DEBUG PDF - Iniciando geração de PDF');
      console.log('🔍 DEBUG PDF - Dados recebidos:', data.length);
      console.log('🔍 DEBUG PDF - Stats recebidos:', stats);
      
      // Verificar se jsPDF está disponível
      if (typeof window === 'undefined') {
        throw new Error('jsPDF não está disponível no servidor');
      }
      
      const doc = new jsPDF();
      console.log('🔍 DEBUG PDF - jsPDF inicializado');
      
      // Configurações do PDF
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPosition = 20;
      
      // Cabeçalho com Logo e Informações da Empresa
      try {
        // Tentar carregar o logo
        const logoUrl = '/logo.png';
        const logoResponse = await fetch(logoUrl);
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(logoBlob);
          });
          
          // Adicionar logo centralizado
          const logoWidth = 50;
          const logoHeight = 15;
          doc.addImage(logoBase64 as string, 'PNG', pageWidth / 2 - logoWidth / 2, yPosition, logoWidth, logoHeight);
          yPosition += logoHeight + 10;
        }
      } catch (error) {
        console.log('Logo não encontrado, continuando sem logo');
      }
      
      // Nome da Empresa
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('NET IMOBILIÁRIA', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
      
      // Título do Relatório
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('RELATÓRIO DE LOGS DE LOGIN/LOGOUT', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
      
      // Linha separadora
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
      
      // Data de exportação
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Data de Exportação: ${new Date().toLocaleString('pt-BR')}`, margin, yPosition);
      yPosition += 10;
      
      // Estatísticas
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('ESTATÍSTICAS GERAIS', margin, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const statsText = [
        `• Total de Logs: ${stats?.total_logs || 0}`,
        `• Logins: ${stats?.total_logins || 0}`,
        `• Logouts: ${stats?.total_logouts || 0}`,
        `• Falhas: ${stats?.total_failures || 0}`,
        `• 2FA Usado: ${stats?.total_2fa_used || 0}`,
        `• Usuários Ativos: ${stats?.unique_users_in_logs || 0} de ${stats?.total_users_registered || 0} cadastrados`
      ];
      
      statsText.forEach(text => {
        doc.text(text, margin, yPosition);
        yPosition += 5;
      });
      
      yPosition += 10;
      
      // Tabela de dados
      if (data.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('DADOS DETALHADOS', margin, yPosition);
        yPosition += 10;
        
        // Preparar dados para a tabela
        const tableData = data.map(log => [
          log.username || 'N/A',
          log.action || 'N/A',
          log.ip_address || 'N/A',
          log.two_fa_used ? 'Sim' : 'Não',
          log.success ? 'Sucesso' : 'Falha',
          new Date(log.created_at).toLocaleString('pt-BR')
        ]);
        
        // Cabeçalhos da tabela
        const headers = ['Usuário', 'Ação', 'IP', '2FA', 'Status', 'Data/Hora'];
        
        // Gerar tabela
        autoTable(doc, {
          head: [headers],
          body: tableData,
          startY: yPosition,
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 8,
            cellPadding: 3,
          },
          headStyles: {
            fillColor: [66, 139, 202],
            textColor: 255,
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          },
          didDrawPage: (data: any) => {
            // Adicionar rodapé com informações da empresa
            const pageCount = doc.getNumberOfPages();
            const footerY = doc.internal.pageSize.getHeight() - 20;
            
            // Linha separadora do rodapé
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
            
            // Informações da empresa
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text('NET IMOBILIÁRIA - Sistema de Gestão Imobiliária', margin, footerY);
            doc.text(`Página ${data.pageNumber} de ${pageCount}`, pageWidth - margin, footerY, { align: 'right' });
            
            // Data de geração
            doc.setFontSize(6);
            doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, footerY + 5);
          }
        });
      } else {
        doc.setFontSize(10);
        doc.text('Nenhum dado encontrado para o período selecionado.', margin, yPosition);
      }
      
      // Salvar o PDF
      const filename = `logs-login-${new Date().toISOString().split('T')[0]}.pdf`;
      console.log('🔍 DEBUG PDF - Salvando arquivo:', filename);
      doc.save(filename);
      console.log('🔍 DEBUG PDF - Arquivo salvo com sucesso');
      
    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : 'N/A';
      console.error('❌ Stack trace PDF:', errorStack);
      throw new Error(`Erro ao gerar arquivo PDF: ${errorMessage}`);
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv':
        return <TableCellsIcon className="h-5 w-5" />;
      case 'json':
        return <DocumentTextIcon className="h-5 w-5" />;
      case 'pdf':
        return <ChartBarIcon className="h-5 w-5" />;
      default:
        return <DocumentTextIcon className="h-5 w-5" />;
    }
  };

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'csv':
        return 'Planilha Excel/Google Sheets';
      case 'json':
        return 'Dados estruturados para APIs';
      case 'pdf':
        return 'Relatório formatado para impressão';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Exportar Relatórios
          </h3>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {isOpen ? 'Ocultar' : 'Mostrar'} Opções
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 space-y-4">
          {/* Seleção de formato */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Formato de Exportação
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['csv', 'json', 'pdf'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => setExportFormat(format)}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    exportFormat === format
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center">
                    {getFormatIcon(format)}
                    <div className="ml-2">
                      <div className="font-medium text-sm uppercase">{format}</div>
                      <div className="text-xs text-gray-500">{getFormatDescription(format)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Filtro de data */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período (opcional)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Data Inicial</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Data Final</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Informações do relatório */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Informações do Relatório</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>• Total de registros: {logs.length}</p>
              <p>• Período: {dateRange.start || 'Início'} até {dateRange.end || 'Agora'}</p>
              <p>• Formato: {exportFormat.toUpperCase()}</p>
              <p>• Inclui: Usuário, Ação, IP, 2FA, Status, Data/Hora</p>
            </div>
          </div>

          {/* Botão de exportação */}
          <div className="flex justify-end">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin -ml-1 mr-2 h-4 w-4 text-white">
                    <div className="rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  </div>
                  Exportando...
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Exportar Relatório
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
