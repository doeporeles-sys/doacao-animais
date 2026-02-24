# Inicia o servidor e abre o site "Doe por Eles" no navegador
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $dir

$python = "${env:LOCALAPPDATA}\Programs\Python\Python312\python.exe"
if (-not (Test-Path $python)) {
    $python = "python"
}

Write-Host "Iniciando servidor em http://localhost:8080 ..."
Start-Process "http://localhost:8080"
& $python -m http.server 8080
