# Script PowerShell para configurar inicio automatico do servico de feed
# Cria uma tarefa agendada no Windows para iniciar o servico ao ligar o computador

Write-Host "[*] Configurando inicio automatico do servico de feed..." -ForegroundColor Cyan

# Obter o diretorio atual do script e navegar para o diretorio do projeto
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = Split-Path -Parent $scriptPath
$startScriptPath = Join-Path $projectPath "scripts\iniciar-servico-feed.ps1"
$nodePath = (Get-Command node).Source

Write-Host "[*] Diretorio do projeto: $projectPath" -ForegroundColor Gray
Write-Host "[*] Script de inicio: $startScriptPath" -ForegroundColor Gray

# Verificar se o script existe
if (-not (Test-Path $startScriptPath)) {
    Write-Host "[ERRO] Script nao encontrado: $startScriptPath" -ForegroundColor Red
    exit 1
}

# Nome da tarefa
$taskName = "NetImobiliaria_FeedService"

# Verificar se a tarefa ja existe
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "[!] Tarefa ja existe. Removendo..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Criar acao (executar PowerShell com o script)
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -File `"$startScriptPath`"" `
    -WorkingDirectory $projectPath

# Criar trigger (ao iniciar o sistema)
$trigger = New-ScheduledTaskTrigger -AtStartup

# Criar configurações
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

# Criar principal (executar como usuário atual)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest

# Registrar tarefa
try {
    $result = Register-ScheduledTask -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description "Inicia automaticamente o servico de feed de noticias da Net Imobiliaria" `
        -ErrorAction Stop
    
    Write-Host "[OK] Tarefa agendada criada com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "[*] Detalhes da tarefa:" -ForegroundColor Cyan
    Write-Host "   Nome: $taskName" -ForegroundColor Gray
    Write-Host "   Trigger: Ao iniciar o Windows" -ForegroundColor Gray
    Write-Host "   Script: $startScriptPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[*] A tarefa iniciara automaticamente na proxima vez que voce ligar o computador." -ForegroundColor Cyan
    Write-Host "[*] Para iniciar agora manualmente:" -ForegroundColor Cyan
    Write-Host "   Start-ScheduledTask -TaskName `"$taskName`"" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[*] Para remover a tarefa:" -ForegroundColor Cyan
    Write-Host "   Unregister-ScheduledTask -TaskName `"$taskName`" -Confirm:`$false" -ForegroundColor Gray
    
} catch {
    Write-Host "[ERRO] Erro ao criar tarefa: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "[*] Este script precisa ser executado como Administrador!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "[*] Para executar como Administrador:" -ForegroundColor Cyan
    Write-Host "   1. Feche este terminal" -ForegroundColor Gray
    Write-Host "   2. Clique com botao direito no PowerShell" -ForegroundColor Gray
    Write-Host "   3. Selecione 'Executar como Administrador'" -ForegroundColor Gray
    Write-Host "   4. Execute: npm run feed:configurar-auto" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[*] Ou execute diretamente:" -ForegroundColor Cyan
    Write-Host "   PowerShell -ExecutionPolicy Bypass -File `"$startScriptPath`"" -ForegroundColor Gray
    exit 1
}

