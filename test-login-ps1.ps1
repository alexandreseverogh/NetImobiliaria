# Teste da API de login usando PowerShell
Write-Host "🔍 TESTANDO API DE LOGIN..." -ForegroundColor Yellow

try {
    $body = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/admin/auth/login" `
                                  -Method POST `
                                  -Body $body `
                                  -ContentType "application/json"

    Write-Host "✅ LOGIN FUNCIONOU!" -ForegroundColor Green
    Write-Host "Resposta: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ LOGIN FALHOU!" -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
}

Write-Host "`n✅ Teste concluído!" -ForegroundColor Yellow
Read-Host "Pressione Enter para continuar"

