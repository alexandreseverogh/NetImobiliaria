# Matar processo na porta 3000 - Versao Simples

Write-Host ""
Write-Host "Procurando processo na porta 3000..."

$process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($process) {
    Write-Host "Processo encontrado: PID $process"
    Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "OK - Porta 3000 liberada!"
} else {
    Write-Host "OK - Porta 3000 ja esta livre!"
}

Write-Host ""



