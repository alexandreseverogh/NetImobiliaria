$env:PGPASSWORD = 'postgres'
$query = Get-Content "query-lead-145.sql" -Raw
$output = psql -h localhost -p 15432 -U postgres -d net_imobiliaria -c $query 2>&1
$output | Out-File -Encoding UTF8 "resultado-lead-145.txt"
Write-Host "Resultado salvo em: resultado-lead-145.txt"
Get-Content "resultado-lead-145.txt"
