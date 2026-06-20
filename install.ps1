# PDF & Chips — Windows Installer
# Run as: powershell -ExecutionPolicy Bypass -File install.ps1

$AppName    = "PDF & Chips"
$BinName    = "pdf-chips"
$Repo       = "saaandbite/pdfchips"
$PkgJson    = Join-Path $PSScriptRoot "package.json"
$Version    = (Get-Content $PkgJson -Raw | ConvertFrom-Json).version

Write-Host ""
Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   PDF & Chips — Windows Installer    ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Version : $Version" -ForegroundColor Gray
Write-Host ""

# ── Check for winget ──────────────────────────────────────────────────────────
$HasWinget = $null -ne (Get-Command winget -ErrorAction SilentlyContinue)

# ── Install dependencies via winget ───────────────────────────────────────────
Write-Host "[*] Checking PDF tool dependencies..." -ForegroundColor Blue

$deps = @(
    @{ Id = "ArtifexSoftware.GhostScript"; Name = "Ghostscript" },
    @{ Id = "qpdf.qpdf";                   Name = "QPDF" },
    @{ Id = "UB-Mannheim.TesseractOCR";    Name = "Tesseract OCR" }
)

if ($HasWinget) {
    foreach ($dep in $deps) {
        $installed = winget list --id $dep.Id 2>&1 | Select-String $dep.Id
        if ($installed) {
            Write-Host "[✓] $($dep.Name) already installed." -ForegroundColor Green
        } else {
            Write-Host "[*] Installing $($dep.Name)..." -ForegroundColor Blue
            winget install --id $dep.Id -e --silent --accept-source-agreements --accept-package-agreements 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[✓] $($dep.Name) installed." -ForegroundColor Green
            } else {
                Write-Host "[!] Could not auto-install $($dep.Name)." -ForegroundColor Yellow
                Write-Host "    Install manually: winget install $($dep.Id)" -ForegroundColor Yellow
            }
        }
    }
    # Poppler (pdfinfo / pdftoppm) — via Chocolatey since winget lacks it
    $popplerPath = "C:\Program Files\poppler\bin\pdfinfo.exe"
    if (Test-Path $popplerPath) {
        Write-Host "[✓] Poppler already found." -ForegroundColor Green
    } else {
        $HasChoco = $null -ne (Get-Command choco -ErrorAction SilentlyContinue)
        if ($HasChoco) {
            Write-Host "[*] Installing Poppler via Chocolatey..." -ForegroundColor Blue
            choco install poppler -y 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[✓] Poppler installed." -ForegroundColor Green
            } else {
                Write-Host "[!] Could not auto-install Poppler." -ForegroundColor Yellow
            }
        } else {
            Write-Host "[!] Poppler not found. Install manually: https://github.com/oschwartz10612/poppler-windows/releases" -ForegroundColor Yellow
            Write-Host "    Extract and add to PATH so 'pdfinfo' and 'pdftoppm' are available." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "[!] winget not available. Please install dependencies manually:" -ForegroundColor Yellow
    Write-Host "    - Ghostscript : https://www.ghostscript.com/releases/gsdnld.html" -ForegroundColor Yellow
    Write-Host "    - QPDF        : https://github.com/qpdf/qpdf/releases" -ForegroundColor Yellow
    Write-Host "    - Poppler     : https://github.com/oschwartz10612/poppler-windows/releases" -ForegroundColor Yellow
    Write-Host "    - Tesseract   : https://github.com/UB-Mannheim/tesseract/wiki" -ForegroundColor Yellow
}

Write-Host ""

# ── Try pre-built release first ───────────────────────────────────────────────
$ExeName = "PDF.and.Chips_${Version}_x64-setup.exe"
$DownloadUrl = "https://github.com/$Repo/releases/download/v$Version/$ExeName"
$TmpPath = Join-Path $env:TEMP $ExeName

Write-Host "[*] Checking for pre-built release v${Version}..." -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri $DownloadUrl -Method Head -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "[*] Downloading $ExeName..." -ForegroundColor Blue
        Invoke-WebRequest -Uri $DownloadUrl -OutFile $TmpPath -UseBasicParsing
        Write-Host "[✓] Download complete." -ForegroundColor Green

        Write-Host ""
        Write-Host "[*] Launching installer wizard..." -ForegroundColor Blue
        Start-Process -FilePath $TmpPath -Wait
        Write-Host "[✓] Installation complete." -ForegroundColor Green
        Write-Host ""
        Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║   ✓ PDF & Chips installed successfully!              ║" -ForegroundColor Green
        Write-Host "║                                                      ║" -ForegroundColor Green
        Write-Host "║   • Launch from Start Menu: search 'PDF & Chips'    ║" -ForegroundColor Green
        Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
        Write-Host ""
        exit 0
    }
} catch {
    Write-Host "[!] No pre-built release found for v$Version. Building from source..." -ForegroundColor Yellow
}

# ── Build from source ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[*] Building PDF & Chips from source..." -ForegroundColor Blue
Write-Host "    This may take several minutes on first run (Rust compilation)."
Write-Host ""

# Check Rust
if (-not (Get-Command rustup -ErrorAction SilentlyContinue)) {
    Write-Host "[*] Installing Rust via rustup..." -ForegroundColor Blue
    $rustupUrl = "https://win.rustup.rs/x86_64"
    $rustupExe = Join-Path $env:TEMP "rustup-init.exe"
    Invoke-WebRequest -Uri $rustupUrl -OutFile $rustupExe -UseBasicParsing
    Start-Process -FilePath $rustupExe -ArgumentList "-y" -Wait
    $env:PATH += ";$env:USERPROFILE\.cargo\bin"
    Write-Host "[✓] Rust installed." -ForegroundColor Green
} else {
    Write-Host "[✓] Rust already installed: $(rustc --version)" -ForegroundColor Green
}

# Check Node
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[!] Node.js not found. Install from https://nodejs.org/ and re-run this script." -ForegroundColor Red
    exit 1
}

# Add MSVC target for Windows builds
rustup target add x86_64-pc-windows-msvc 2>&1 | Out-Null

Set-Location $PSScriptRoot

Write-Host "[*] Installing npm dependencies..." -ForegroundColor Blue
npm install

Write-Host "[*] Building release bundle (nsis)..." -ForegroundColor Blue
npx tauri build --bundles nsis

$BundleDir = Join-Path $PSScriptRoot "src-tauri\target\release\bundle\nsis"
$Installer  = Get-ChildItem -Path $BundleDir -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($Installer) {
    Write-Host "[✓] Build complete: $($Installer.FullName)" -ForegroundColor Green
    Write-Host ""
    Write-Host "[*] Launching installer..." -ForegroundColor Blue
    Start-Process -FilePath $Installer.FullName -Wait
} else {
    Write-Host "[✗] Build failed — no installer found in $BundleDir" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✓ PDF & Chips installed successfully!              ║" -ForegroundColor Green
Write-Host "║                                                      ║" -ForegroundColor Green
Write-Host "║   • Launch from Start Menu: search 'PDF & Chips'    ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
