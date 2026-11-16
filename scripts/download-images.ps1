# =============================================================
#  Загрузка фотографий товаров с Unsplash (лицензия Unsplash).
#  Самый простой запуск: двойной щелчок по scripts/download-images.bat
#  или из корня репозитория:
#    powershell -ExecutionPolicy Bypass -File scripts/download-images.ps1
#  Для каждой фотографии создаются 4 файла в images/products:
#    <имя>-480.webp, <имя>-480.jpg, <имя>-960.webp, <имя>-960.jpg
#  (кадр 3:2, обрезка по центру).
# =============================================================

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# имя файла => адрес фото на images.unsplash.com и ID страницы фото (запасной путь)
$photos = [ordered]@{
  'headphones'      = @('photo-1596628319258-c6f3f387a1ed', 'l9Z8SE377OU')
  'speaker'         = @('photo-1703935932245-0fc22c9e52d7', 'XCH03_cdWTA')
  'powerbank'       = @('photo-1587133454235-762b65c9f5c0', 'mI0yALu4BJA')
  'lamp'            = @('photo-1678819483347-3faeb1e426c0', 'SbGLQAtv8Gk')
  'blanket'         = @('photo-1731399211410-e3ffe1560310', '694K2AhsFLA')
  'bottle'          = @('photo-1544003484-3cd181d17917',    'dGIEMeN2MV8')
  'backpack'        = @('photo-1599868082389-59b00bb8760d', '3wcfuygszjU')
  'keyboard'        = @('photo-1718803448073-90ebd0d982e0', '8-rk1cT-1xo')
  'hero'            = @('photo-1556196148-1fb724238998',    'FnR2U1lXsBQ')
  'cat-electronics' = @('photo-1560131930-485758fc17b7',    'SBv6vq-92eE')
  'cat-home'        = @('photo-1505693416388-ac5ce068fe85', 'iAftdIcgpFc')
  'cat-accessories' = @('photo-1614926781997-9ca2e6d2785a', 'JQ-WgCJk5ow')
}

$root = Split-Path -Parent $PSScriptRoot
$out  = Join-Path $root 'images/products'
New-Item -ItemType Directory -Force -Path $out | Out-Null

# запасной путь: страница скачивания Unsplash перенаправляет на адрес фото
function Get-BaseFromPage($id) {
  Add-Type -AssemblyName System.Net.Http
  $handler = New-Object System.Net.Http.HttpClientHandler
  $handler.AllowAutoRedirect = $false
  $client = New-Object System.Net.Http.HttpClient($handler)
  $resp = $client.GetAsync("https://unsplash.com/photos/$id/download").Result
  if ($resp.Headers.Location) { return $resp.Headers.Location.GetLeftPart([System.UriPartial]::Path) }
  return $null
}

$ok = 0; $failed = @()
foreach ($name in $photos.Keys) {
  $base = 'https://images.unsplash.com/' + $photos[$name][0]
  $id   = $photos[$name][1]
  Write-Host "-> $name"
  foreach ($w in 480, 960) {
    $h = [int]($w * 2 / 3)
    foreach ($fmt in 'webp', 'jpg') {
      $file = Join-Path $out "$name-$w.$fmt"
      if (Test-Path $file) { continue }
      $query = "?w=$w&h=$h&fit=crop&crop=center&fm=$fmt&q=75"
      try {
        Invoke-WebRequest -Uri ($base + $query) -OutFile $file -UseBasicParsing
      } catch {
        try {
          $alt = Get-BaseFromPage $id
          if (-not $alt) { throw "нет адреса" }
          $base = $alt
          Invoke-WebRequest -Uri ($base + $query) -OutFile $file -UseBasicParsing
        } catch {
          $failed += "$name-$w.$fmt (https://unsplash.com/photos/$id)"
          continue
        }
      }
      $ok++
    }
  }
}
Write-Host ""
Write-Host "Загружено файлов: $ok"
if ($failed.Count -gt 0) {
  Write-Warning "Не удалось загрузить:"
  $failed | ForEach-Object { Write-Host "   $_" }
} else {
  Write-Host "Готово: все фото в images/products"
}
