import { NextResponse } from 'next/server';

/**
 * Endpoint de Autenticação Mockado do Google Ads.
 * 
 * PENDÊNCIA: A integração real com OAuth2 do Google Ads deverá ser 
 * implementada aqui. O fluxo correto exige redirecionamento para o
 * Google Consent Screen e recepção do código de autorização para trocar
 * por um refresh_token.
 * 
 * Por enquanto, retornaremos sucesso com base em variáveis de ambiente mockadas
 * para que o desenvolvimento do Wizard e a validação do adapter prossigam.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // Simula o callback do OAuth
  if (action === 'callback') {
    return NextResponse.json({
      success: true,
      message: 'Autenticação Google Ads simulada com sucesso.',
      mock_credentials: {
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || 'mock_dev_token',
        customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID || 'mock_customer_id',
        refresh_token: 'mock_refresh_token',
      }
    });
  }

  // Retorna a URL de autorização simulada
  return NextResponse.json({
    authUrl: '/api/marketing/google-auth?action=callback'
  });
}
