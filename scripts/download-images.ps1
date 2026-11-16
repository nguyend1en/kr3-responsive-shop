# =============================================================
#  Загрузка фотографий товаров с Unsplash (лицензия Unsplash:
#  бесплатное использование, указание автора желательно).
#  Запуск из корня репозитория:
#    powershell -ExecutionPolicy Bypass -File scripts/download-images.ps1
#  Для каждой фотографии создаются 4 файла:
#    <имя>-480.webp, <имя>-480.jpg, <имя>-960.webp, <имя>-960.jpg
#  (кадр 3:2, обрезка по центру).
# =============================================================

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# имя файла => ID фотографии на unsplash.com/photos/<ID>
$photos = [ordered]@{
  'headphones' = 'l9Z8SE377OU'   # наушники
  'speaker'    = 'XCH03_cdWTA'   # умная колонка
  'powerbank'  = 'mI0yALu4BJA'   # портативный аккумулятор
  'lamp'       = 'SbGLQAtv8Gk'   # настольная лампа
  'blanket'    = '694K2AhsFLA'   # вязаный плед
  'bottle'     = 'dGIEMeN2MV8'   # термобутылка
  'backpack'   = '3wcfuygszjU'   # рюкзак
  'keyboard'   = '8-rk1cT-1xo'   # беспроводная клавиатура
  'hero'       = 'FnR2U1lXsBQ'   # фото для главного экрана
  'cat-electronics' = 'SBv6vq-92eE'   # категория «Электроника»
  'cat-home'        = 'iAftdIcgpFc'   # категория «Дом»
  'cat-accessories' = 'JQ-WgCJk5ow'   # категория «Аксессуары»
}

$root = Split-Path -Parent $PSScriptRoot
$out  = Join-Path $root 'images/products'
New-Item -ItemType Directory -Force -Path $out | Out-Null

Add-Type -AssemblyName System.Net.Http
$handler = New-Object System.Net.Http.HttpClientHandler
$handler.AllowAutoRedirect = $false
$client = New-Object System.Net.Http.HttpClient($handler)
$client.DefaultRequestHeaders.UserAgent.ParseAdd('Mozilla/5.0 kr3-responsive-shop')

foreach ($name in $photos.Keys) {
  $id = $photos[$name]
  # уже загруженные фото пропускаем (скрипт можно запускать повторно)
  if (Test-Path (Join-Path $out "$name-960.jpg")) { Write-Host "-- $name уже есть"; continue }
  Write-Host "-> $name ($id)"
  # 1) страница скачивания отвечает перенаправлением на адрес картинки
  $resp = $client.GetAsync("https://unsplash.com/photos/$id/download").Result
  $location = $resp.Headers.Location
  if (-not $location) { Write-Warning "  не удалось получить адрес фото $id (код $([int]$resp.StatusCode))"; continue }
  # 2) берём адрес без параметров и добавляем свои: ширина, высота, формат
  $base = $location.GetLeftPart([System.UriPartial]::Path)
  foreach ($w in 480, 960) {
    $h = [int]($w * 2 / 3)
    foreach ($fmt in 'webp', 'jpg') {
      $url  = "$($base)?w=$w&h=$h&fit=crop&crop=center&fm=$fmt&q=75"
      $file = Join-Path $out "$name-$w.$fmt"
      Invoke-WebRequest -Uri $url -OutFile $file -UseBasicParsing
      Write-Host "   $name-$w.$fmt"
    }
  }
}
Write-Host "Готово: файлы в images/products"
