[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$BaseUrl = "http://localhost:3000",

    [Parameter(Mandatory = $true)]
    [string]$ClienteUuid,

    [Parameter(Mandatory = $true)]
    [string]$AdminToken,

    [Parameter(Mandatory = $false)]
    [string]$DatabaseUser = "postgres",

    [Parameter(Mandatory = $false)]
    [string]$DatabaseName = "net_imobiliaria",

    [Parameter(Mandatory = $false)]
    [switch]$SkipRevert
)

$ErrorActionPreference = 'Stop'

Write-Host "===================================" -ForegroundColor Cyan
Write-Host " TESTE AUTOMATIZADO - CLIENTES (UUID ONLY)" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    throw "psql não encontrado no PATH. Instale o cliente psql e tente novamente."
}

if (-not $env:PGPASSWORD) {
    Write-Warning "Variável de ambiente PGPASSWORD não está definida. Defina com: `$env:PGPASSWORD='Roberto@2007'"
}

function Invoke-Api {
    param(
        [Parameter(Mandatory = $true)] [ValidateSet('GET','POST','PUT','DELETE')]
        [string]$Method,
        [Parameter(Mandatory = $true)]
        [string]$Uri,
        [Parameter(Mandatory = $false)]
        [hashtable]$Body
    )

    $headers = @{
        "Authorization" = "Bearer $AdminToken"
    }

    $bodyJson = $null
    if ($Body) {
        $bodyJson = $Body | ConvertTo-Json -Depth 10 -Compress
        $headers["Content-Type"] = "application/json"
    }

    Write-Host ""
    Write-Host "[API] $Method $Uri" -ForegroundColor Yellow
    if ($Body) {
        Write-Host "   Corpo:" -ForegroundColor DarkGray
        Write-Host $bodyJson -ForegroundColor DarkGray
    }

    try {
        $response = Invoke-WebRequest -Method $Method -Uri $Uri -Headers $headers -Body $bodyJson -UseBasicParsing
        $content = $null
        if ($response.Content) {
            $content = $response.Content | ConvertFrom-Json
        }
        Write-Host "   Status OK ($($response.StatusCode))" -ForegroundColor Green
        return [PSCustomObject]@{
            StatusCode = $response.StatusCode
            Content    = $content
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__ 2>$null
        $message = $_.ErrorDetails.Message
        if (-not $message -and $_.Exception.Response -and $_.Exception.Response.ContentLength -gt 0) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $message = $reader.ReadToEnd()
        }
        if (-not $message) {
            $message = $_.Exception.Message
        }
        Write-Host "   Falha ($statusCode): $message" -ForegroundColor Red
        throw
    }
}

function Invoke-PSQL {
    param([string]$Command)
    $args = @("-U", $DatabaseUser, "-d", $DatabaseName, "-c", $Command)
    Write-Host ""
    Write-Host "[SQL] Executando: $Command" -ForegroundColor Yellow
    & psql @args
}

function Build-ClienteBody {
    param(
        [object]$Data,
        [string]$Nome,
        [string]$Telefone,
        [string]$Email
    )
    return @{
        nome        = $Nome
        cpf         = $Data.cpf
        telefone    = $Telefone
        email       = $Email
        estado_fk   = $Data.estado_fk
        cidade_fk   = $Data.cidade_fk
        endereco    = $Data.endereco
        bairro      = $Data.bairro
        numero      = $Data.numero
        complemento = $Data.complemento
        cep         = $Data.cep
    }
}

# 1. Snapshot inicial
$uriUuid = "$BaseUrl/api/admin/clientes/$ClienteUuid"
$snapshotResponse = Invoke-Api -Method GET -Uri $uriUuid
$snapshot = $snapshotResponse.Content
if (-not $snapshot) {
    throw "Cliente $ClienteUuid não encontrado."
}
$legacyId = $null
Write-Host "`n[SNAPSHOT] Capturado: $($snapshot.nome)" -ForegroundColor Cyan

# 2. GET com identificador inválido (UUID malformado)
Write-Host "`n[CHECK] Validando rejeição de identificador inválido..." -ForegroundColor Cyan
$invalidUri = "$BaseUrl/api/admin/clientes/123"
try {
    Invoke-Api -Method GET -Uri $invalidUri | Out-Null
    throw "GET por identificador inválido deveria falhar, mas retornou sucesso."
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__ 2>$null
    if ($statusCode -ne 400) {
        throw "GET por identificador inválido deveria retornar 400. Recebido: $statusCode"
    }
    Write-Host "   Rejeição confirmada (HTTP 400)." -ForegroundColor Green
}

# 3. PUT por UUID
$randomSuffix = Get-Random -Minimum 1000 -Maximum 9999
$testEmail = "cliente-uuid-$randomSuffix@teste.com"
$testTelefone = "8197$randomSuffix$randomSuffix"
$testNome = "$($snapshot.nome) - UUID"
$body = Build-ClienteBody -Data $snapshot -Nome $testNome -Telefone $testTelefone -Email $testEmail

Invoke-Api -Method PUT -Uri $uriUuid -Body $body | Out-Null

if (-not $SkipRevert) {
    Write-Host "`n[ROLLBACK] Revertendo alterações..." -ForegroundColor DarkYellow
    $originalBody = Build-ClienteBody -Data $snapshot -Nome $snapshot.nome -Telefone $snapshot.telefone -Email $snapshot.email
    Invoke-Api -Method PUT -Uri $uriUuid -Body $originalBody | Out-Null
}

# 4. Consulta rápida (opcional)
Invoke-PSQL -Command "SELECT uuid, nome FROM clientes WHERE uuid = '$ClienteUuid';"

Write-Host ""
Write-Host "[OK] Testes de clientes UUID-only concluídos." -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] Recomendações:" -ForegroundColor Cyan
Write-Host " - Executar testes de UI (listagem, edição, exclusão) garantindo navegação por UUID."
Write-Host " - Revisar auditoria para confirmar resourceId = UUID."

