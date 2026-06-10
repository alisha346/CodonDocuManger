# auto_version.ps1 — CodonDocuManger automatic version bumper
# ─────────────────────────────────────────────────────────────
# Watches the edge_extension folder for file saves and
# automatically bumps the patch version in manifest.json.
#
# Usage:
#   .\auto_version.ps1                 # watches edge_extension (patch bumps)
#   .\auto_version.ps1 --enhance       # bumps as enhancement on each change
#
# Press Ctrl+C to stop the watcher.

param(
    [switch]$Enhance,
    [switch]$Major
)

$WatchPath = Join-Path $PSScriptRoot "edge_extension"
$BumperScript = Join-Path $PSScriptRoot "bump_version.py"

$BumpFlag = "--fix"
if ($Enhance) { $BumpFlag = "--enhance" }
if ($Major)   { $BumpFlag = "--major"   }

Write-Host ""
Write-Host "  🔍  Auto-version watcher started" -ForegroundColor Cyan
Write-Host "  📁  Watching: $WatchPath" -ForegroundColor Gray
Write-Host "  🏷️   Bump type: $BumpFlag" -ForegroundColor Gray
Write-Host "  ──────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

# Set up FileSystemWatcher
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $WatchPath
$watcher.Filter = "*.*"
$watcher.IncludeSubdirectories = $false
$watcher.EnableRaisingEvents = $true

# Debounce: track last bump time to avoid double-fires
$script:LastBump = [datetime]::MinValue
$DebounceSeconds = 2

$action = {
    $path = $Event.SourceEventArgs.FullPath
    $name = $Event.SourceEventArgs.Name
    $changeType = $Event.SourceEventArgs.ChangeType

    # Skip manifest.json itself to avoid infinite loop
    if ($name -eq "manifest.json") { return }

    $now = [datetime]::Now
    if (($now - $script:LastBump).TotalSeconds -lt $DebounceSeconds) { return }
    $script:LastBump = $now

    Write-Host "  📝  $changeType : $name" -ForegroundColor Yellow
    Write-Host "  🔢  Bumping version..." -ForegroundColor Cyan

    $result = & python $BumperScript $using:BumpFlag 2>&1
    Write-Host ($result | Out-String) -ForegroundColor Green
    Write-Host ""
}

# Register events
Register-ObjectEvent $watcher "Changed" -Action $action | Out-Null
Register-ObjectEvent $watcher "Created" -Action $action | Out-Null

try {
    while ($true) { Start-Sleep -Seconds 1 }
}
finally {
    $watcher.EnableRaisingEvents = $false
    $watcher.Dispose()
    Write-Host "`n  🛑  Watcher stopped." -ForegroundColor Red
}
