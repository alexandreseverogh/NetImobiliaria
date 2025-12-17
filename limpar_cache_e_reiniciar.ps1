# Limpar cache do Next.js e reiniciar

Write-Host ""
Write-Host "Limpando cache do Next.js..."
Write-Host ""

# Parar processos Node
Stop-Process -Name node -Force -ErrorAction SilentlyContinue

# Aguardar
Start-Sleep -Seconds 2

# Limpar cache
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Cache limpo! Agora execute: npm run dev"
Write-Host ""



