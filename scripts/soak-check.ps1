param(
  [string]$BaseUrl = "https://carto.canadaverse.org",
  [int]$DurationMinutes = 60,
  [int]$IntervalSeconds = 60,
  [int]$MaxBadSamples = 3,
  [string]$OutFile = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($OutFile)) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $OutFile = Join-Path (Get-Location) "mc-cartolive-soak-$stamp.ndjson"
}

$deadline = (Get-Date).AddMinutes($DurationMinutes)
$badSamples = 0
$sample = 0
$lastPackets = $null

while ((Get-Date) -lt $deadline) {
  $sample += 1
  $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $from = $now - 600000
  $ok = $true
  $errorText = ""

  try {
    $health = Invoke-RestMethod "$BaseUrl/healthz"
    $ready = Invoke-RestMethod "$BaseUrl/readyz"
    $state = Invoke-RestMethod "$BaseUrl/api/v1/public/state"
    $history = Invoke-RestMethod "$BaseUrl/api/v1/public/history?from=$from&to=$now&limit=25"

    if (-not $ready.ready) { $ok = $false }
    if ($health.packetIngestState -ne "fresh") { $ok = $false }
    if ($health.publicCacheState -ne "fresh") { $ok = $false }
    if ($health.liveConfidenceState -eq "degraded") { $ok = $false }
    if ($null -ne $lastPackets -and $state.stats.packets -lt $lastPackets) { $ok = $false }
    $lastPackets = $state.stats.packets

    $record = [PSCustomObject]@{
      at = (Get-Date).ToUniversalTime().ToString("o")
      sample = $sample
      ok = $ok
      version = $health.version
      gitSha = $health.gitSha
      packets = $state.stats.packets
      nodes = $state.stats.activeNodes
      routes = $state.stats.activeRoutes
      packetIngestState = $health.packetIngestState
      mqttLastMessageAgeMs = $health.mqttLastMessageAgeMs
      publicCacheState = $health.publicCacheState
      cacheAgeMs = $health.cacheAgeMs
      mapMotionState = $health.mapMotionState
      liveConfidenceState = $health.liveConfidenceState
      historyEvents = $history.window.count
    }
  }
  catch {
    $ok = $false
    $errorText = $_.Exception.Message
    $record = [PSCustomObject]@{
      at = (Get-Date).ToUniversalTime().ToString("o")
      sample = $sample
      ok = $false
      error = $errorText
    }
  }

  $record | ConvertTo-Json -Compress | Add-Content -Encoding utf8 $OutFile
  if ($ok) {
    $badSamples = 0
  } else {
    $badSamples += 1
    if ($badSamples -ge $MaxBadSamples) {
      throw "Soak failed after $badSamples consecutive bad samples. Last error: $errorText. Output: $OutFile"
    }
  }

  Write-Host ("sample {0}: ok={1} packets={2} ingest={3} cache={4} motion={5} confidence={6}" -f $sample, $ok, $record.packets, $record.packetIngestState, $record.publicCacheState, $record.mapMotionState, $record.liveConfidenceState)
  Start-Sleep -Seconds $IntervalSeconds
}

Write-Host "soak check complete: $OutFile"
