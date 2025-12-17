[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$BaseUrl = 'http://localhost:3000',

    [Parameter(Mandatory = $true)]
    [string]$AdminToken,

[Parameter(Mandatory = $true)]
[int]$ImovelId,

[Parameter(Mandatory = $true)]
[string]$ProprietarioUuid,

    [Parameter(Mandatory = $false)]
    [string]$DatabaseUser = 'postgres',

    [Parameter(Mandatory = $false)]
    [string]$DatabaseName = 'net_imobiliaria',

    [Parameter(Mandatory = $false)]
    [switch]$SkipRevert
)

$ErrorActionPreference = 'Stop'

Write-Host '===================================' -ForegroundColor Cyan
Write-Host ' TESTE AUTOMATIZADO - IMOVEIS (UUID ONLY)' -ForegroundColor Cyan
Write-Host '===================================' -ForegroundColor Cyan

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    throw 'psql nao encontrado no PATH. Instale o cliente psql e tente novamente.'
}

if (-not $env:PGPASSWORD) {
    Write-Warning "Variavel de ambiente PGPASSWORD nao esta definida. Defina com: `$env:PGPASSWORD='Roberto@2007'"
}

function Invoke-Api {
    param(
        [Parameter(Mandatory = $true)][ValidateSet('GET','POST','PUT','DELETE')]
        [string]$Method,
        [Parameter(Mandatory = $true)]
        [string]$Uri,
        [Parameter(Mandatory = $false)]
        [hashtable]$Body
    )

    $headers = @{ Authorization = 'Bearer ' + $AdminToken }
    $bodyJson = $null

    if ($Body) {
        $bodyJson = $Body | ConvertTo-Json -Depth 10
        $headers['Content-Type'] = 'application/json'
    }

    Write-Host ''
    Write-Host ('--> {0} {1}' -f $Method, $Uri) -ForegroundColor Yellow
    if ($Body) {
        Write-Host '    Body:' -ForegroundColor DarkGray
        Write-Host $bodyJson -ForegroundColor DarkGray
    }

    $invokeParams = @{ Method = $Method; Uri = $Uri; Headers = $headers; UseBasicParsing = $true }
    if ($Body) { $invokeParams['Body'] = $bodyJson }

    try {
        $response = Invoke-WebRequest @invokeParams
        $content = $null
        if ($response.Content) {
            $content = $response.Content | ConvertFrom-Json
        }
        Write-Host ('    Status: {0}' -f $response.StatusCode) -ForegroundColor Green
        return [PSCustomObject]@{ StatusCode = $response.StatusCode; Content = $content }
    } catch {
        Write-Host ('    Falha: {0}' -f $_.Exception.Message) -ForegroundColor Red
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
            Write-Host ('    Detalhes: {0}' -f $_.ErrorDetails.Message) -ForegroundColor Red
        }
        throw
    }
}

function Invoke-PSQL {
    param([string]$Command)
    Write-Host ''
    Write-Host ('--> Executando psql: {0}' -f $Command) -ForegroundColor Yellow
    & psql -U $DatabaseUser -d $DatabaseName -c $Command
}

function Get-Imovel {
    param([string]$Identifier)
    $uri = $BaseUrl + '/api/admin/imoveis/' + $Identifier
    return Invoke-Api -Method GET -Uri $uri
}

function Put-Imovel {
    param(
        [string]$Identifier,
        [hashtable]$Body
    )
    $uri = $BaseUrl + '/api/admin/imoveis/' + $Identifier
    Invoke-Api -Method PUT -Uri $uri -Body $Body | Out-Null
}

$imovelSnapshotResult = Get-Imovel -Identifier $ImovelId
$imovelSnapshot = $imovelSnapshotResult.Content
if ($imovelSnapshot -and $imovelSnapshot.data) {
    $imovelSnapshot = $imovelSnapshot.data
}

if (-not $imovelSnapshot) {
    throw ('Imovel {0} nao encontrado.' -f $ImovelId)
}

$requiredFields = @('titulo','tipo_fk','finalidade_fk','status_fk')
foreach ($field in $requiredFields) {
    if (-not $imovelSnapshot.$field) {
        throw ('Campo obrigatorio ausente no snapshot: {0}' -f $field)
    }
}

Write-Host ''
Write-Host ('Snapshot carregado: Imovel {0} - proprietario_uuid={1}' -f $imovelSnapshot.id, $imovelSnapshot.proprietario_uuid) -ForegroundColor Cyan

$currentProps = [PSCustomObject]@{}
$currentProps | Add-Member NoteProperty titulo $imovelSnapshot.titulo
$currentProps | Add-Member NoteProperty descricao ($imovelSnapshot.descricao)
$currentProps | Add-Member NoteProperty tipo_fk $imovelSnapshot.tipo_fk
$currentProps | Add-Member NoteProperty finalidade_fk $imovelSnapshot.finalidade_fk
$statusOriginal = if ($imovelSnapshot.status_fk) { $imovelSnapshot.status_fk } else { $imovelSnapshot.status }
$currentProps | Add-Member NoteProperty status_fk $statusOriginal
$currentProps | Add-Member NoteProperty proprietario_uuid $imovelSnapshot.proprietario_uuid

$bodyWithUuid = @{
    titulo = $currentProps.titulo
    descricao = $currentProps.descricao
    tipo_fk = $currentProps.tipo_fk
    finalidade_fk = $currentProps.finalidade_fk
    status_fk = $currentProps.status_fk
    proprietario_uuid = $ProprietarioUuid
}

Put-Imovel -Identifier $ImovelId -Body $bodyWithUuid

$updatedResult = Get-Imovel -Identifier $ImovelId
$updated = $updatedResult.Content
if ($updated -and $updated.data) {
    $updated = $updated.data
}

Write-Host ''
Write-Host ('Atualizado: proprietario_uuid={0}' -f $updated.proprietario_uuid) -ForegroundColor Green

if ($updated.proprietario_uuid -ne $ProprietarioUuid) {
    throw 'proprietario_uuid nao corresponde ao valor esperado apos PUT.'
}

Invoke-PSQL -Command ('SELECT id, proprietario_uuid FROM imoveis WHERE id = ' + $ImovelId + ';')

if (-not $SkipRevert) {
    Write-Host ''
    Write-Host 'Revertendo para snapshot original...' -ForegroundColor DarkYellow
    $revertBody = @{
        titulo = $currentProps.titulo
        descricao = $currentProps.descricao
        tipo_fk = $currentProps.tipo_fk
        finalidade_fk = $currentProps.finalidade_fk
        status_fk = $currentProps.status_fk
        proprietario_uuid = $currentProps.proprietario_uuid
    }
    Put-Imovel -Identifier $ImovelId -Body $revertBody
    Invoke-PSQL -Command ('SELECT id, proprietario_uuid FROM imoveis WHERE id = ' + $ImovelId + ';')
}

Write-Host ''
Write-Host '[OK] Teste UUID-only de imoveis concluido.' -ForegroundColor Green
Write-Host ''
Write-Host '[INFO] Proximos passos manuais:' -ForegroundColor Cyan
Write-Host (' - Conferir auditoria para o imovel {0} (mudanca de proprietario_uuid).' -f $ImovelId)
Write-Host ' - Repetir teste com outros proprietarios conforme necessario.'

