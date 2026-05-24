param(
  [string]$BaseUrl = "http://127.0.0.1:39476",
  [switch]$SkipDocker
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Push-Location $root
try {
  Push-Location "backend"
  try {
    go test ./...
  }
  finally {
    Pop-Location
  }

  Push-Location "web"
  try {
    npm test -- --run
    npm run build
  }
  finally {
    Pop-Location
  }

  if (-not $SkipDocker) {
    docker compose build
  }

  $health = Invoke-RestMethod "$BaseUrl/healthz"
  $ready = Invoke-RestMethod "$BaseUrl/readyz"
  $state = Invoke-RestMethod "$BaseUrl/api/v1/public/state"
  $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $from = $now - 600000
  $history = Invoke-RestMethod "$BaseUrl/api/v1/public/history?from=$from&to=$now&limit=25"

  [PSCustomObject]@{
    BaseUrl = $BaseUrl
    HealthReady = $health.ready
    ReadyzReady = $ready.ready
    Packets = $state.stats.packets
    Nodes = $state.stats.activeNodes
    Routes = $state.stats.activeRoutes
    HistoryEvents = $history.window.count
    GitSha = $health.gitSha
    BuildTime = $health.buildTime
  } | Format-List
}
finally {
  Pop-Location
}
