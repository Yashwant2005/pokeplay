param(
  [string]$DbPath = "data/db"
)

if (-not (Test-Path $DbPath)) {
  Write-Error "Path not found: $DbPath"
  exit 1
}

$files = Get-ChildItem -Path $DbPath -Filter *.json -File -Recurse
if ($files.Count -eq 0) {
  Write-Output "No JSON files found in $DbPath"
  exit 0
}

$ok = 0
$fail = 0

foreach ($file in $files) {
  try {
    $raw = Get-Content -Raw -Path $file.FullName
    $obj = $raw | ConvertFrom-Json
    $pretty = $obj | ConvertTo-Json -Depth 100
    Set-Content -Path $file.FullName -Value $pretty
    $ok++
  } catch {
    Write-Warning ("Failed to format: {0} -> {1}" -f $file.FullName, $_.Exception.Message)
    $fail++
  }
}

Write-Output ("Formatted {0} file(s). Failed: {1}" -f $ok, $fail)
