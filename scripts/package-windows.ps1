# Windows packaging script for File Transfer Application
# Run this script in PowerShell with execution policy set to allow scripts

param(
    [string]$Version = "1.0.0",
    [string]$SigningCertificate = "",
    [string]$CertificatePassword = ""
)

Write-Host "🚀 Packaging File Transfer Application v$Version for Windows..." -ForegroundColor Green

# Create build directory
$BuildDir = "dist"
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null

# Update version
Write-Host "📝 Updating version numbers..." -ForegroundColor Yellow
just prepare-release $Version

# Clean and setup
Write-Host "🧹 Cleaning and setting up..." -ForegroundColor Yellow
just clean-all
just setup-all

# Run tests
Write-Host "🧪 Running tests..." -ForegroundColor Yellow
just test-all

# Build backend
Write-Host "🔨 Building backend..." -ForegroundColor Yellow
Set-Location backend
cargo build --release
Set-Location ..

# Copy CLI binary
Copy-Item "backend\target\release\file-transfer-cli.exe" "$BuildDir\file-transfer-cli.exe"

# Build Tauri application
Write-Host "🖥️ Building desktop application..." -ForegroundColor Yellow
Set-Location frontend
cargo tauri build
Set-Location ..

# Copy Windows artifacts
Write-Host "📋 Copying Windows artifacts..." -ForegroundColor Yellow

# MSI installer
if (Test-Path "frontend\src-tauri\target\release\bundle\msi\*.msi") {
    Copy-Item "frontend\src-tauri\target\release\bundle\msi\*.msi" $BuildDir
}

# NSIS installer
if (Test-Path "frontend\src-tauri\target\release\bundle\nsis\*.exe") {
    Copy-Item "frontend\src-tauri\target\release\bundle\nsis\*.exe" $BuildDir
}

# Code signing (if certificate provided)
if ($SigningCertificate -and (Test-Path $SigningCertificate)) {
    Write-Host "🔐 Code signing executables..." -ForegroundColor Yellow
    
    $SignTool = "${env:ProgramFiles(x86)}\Windows Kits\10\bin\10.0.22000.0\x64\signtool.exe"
    if (-not (Test-Path $SignTool)) {
        $SignTool = "${env:ProgramFiles}\Windows Kits\10\bin\10.0.22000.0\x64\signtool.exe"
    }
    
    if (Test-Path $SignTool) {
        # Sign CLI executable
        & $SignTool sign /f $SigningCertificate /p $CertificatePassword /t "http://timestamp.digicert.com" "$BuildDir\file-transfer-cli.exe"
        
        # Sign installers
        Get-ChildItem $BuildDir -Filter "*.msi" | ForEach-Object {
            & $SignTool sign /f $SigningCertificate /p $CertificatePassword /t "http://timestamp.digicert.com" $_.FullName
        }
        
        Get-ChildItem $BuildDir -Filter "*.exe" | Where-Object { $_.Name -ne "file-transfer-cli.exe" } | ForEach-Object {
            & $SignTool sign /f $SigningCertificate /p $CertificatePassword /t "http://timestamp.digicert.com" $_.FullName
        }
    } else {
        Write-Warning "SignTool not found. Skipping code signing."
    }
}

# Create checksums
Write-Host "🔐 Creating checksums..." -ForegroundColor Yellow
Get-ChildItem $BuildDir -File | ForEach-Object {
    $hash = Get-FileHash $_.FullName -Algorithm SHA256
    "$($hash.Hash.ToLower())  $($_.Name)" | Out-File -FilePath "$($_.FullName).sha256" -Encoding ASCII
}

# Create Chocolatey package
Write-Host "🍫 Creating Chocolatey package..." -ForegroundColor Yellow
$ChocolateyDir = "chocolatey"
New-Item -ItemType Directory -Force -Path $ChocolateyDir | Out-Null

# Create nuspec file
$NuspecContent = @"
<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://schemas.microsoft.com/packaging/2015/06/nuspec.xsd">
  <metadata>
    <id>file-transfer-app</id>
    <version>$Version</version>
    <title>File Transfer App</title>
    <authors>File Transfer Team</authors>
    <owners>File Transfer Team</owners>
    <description>Socket-based file transfer application supporting TCP and UDP protocols with integrity verification and real-time progress monitoring.</description>
    <projectUrl>https://github.com/your-org/file-transfer-app</projectUrl>
    <licenseUrl>https://github.com/your-org/file-transfer-app/blob/main/LICENSE</licenseUrl>
    <requireLicenseAcceptance>false</requireLicenseAcceptance>
    <tags>file-transfer networking tcp udp socket</tags>
    <summary>Cross-platform file transfer application</summary>
    <releaseNotes>See https://github.com/your-org/file-transfer-app/releases</releaseNotes>
  </metadata>
  <files>
    <file src="..\$BuildDir\*.msi" target="tools\" />
    <file src="chocolateyinstall.ps1" target="tools\" />
  </files>
</package>
"@

$NuspecContent | Out-File -FilePath "$ChocolateyDir\file-transfer-app.nuspec" -Encoding UTF8

# Create Chocolatey install script
$InstallScript = @"
`$ErrorActionPreference = 'Stop'
`$packageName = 'file-transfer-app'
`$toolsDir = Split-Path `$MyInvocation.MyCommand.Definition
`$fileLocation = Get-ChildItem `$toolsDir -Filter "*.msi" | Select-Object -First 1

`$packageArgs = @{
  packageName   = `$packageName
  fileType      = 'MSI'
  file          = `$fileLocation.FullName
  silentArgs    = '/quiet /norestart'
  validExitCodes= @(0, 3010, 1641)
}

Install-ChocolateyInstallPackage @packageArgs
"@

$InstallScript | Out-File -FilePath "$ChocolateyDir\chocolateyinstall.ps1" -Encoding UTF8

# Pack Chocolatey package
if (Get-Command choco -ErrorAction SilentlyContinue) {
    Set-Location $ChocolateyDir
    choco pack
    Move-Item "*.nupkg" "..\$BuildDir\"
    Set-Location ..
}

# Create release archive
Write-Host "📦 Creating release archive..." -ForegroundColor Yellow
Compress-Archive -Path "$BuildDir\*" -DestinationPath "file-transfer-app-windows-v$Version.zip" -Force

Write-Host "✅ Windows packaging complete!" -ForegroundColor Green
Write-Host "📁 Artifacts available in: $BuildDir\" -ForegroundColor Cyan
Write-Host "📦 Release archive: file-transfer-app-windows-v$Version.zip" -ForegroundColor Cyan

# List created files
Write-Host "`n📋 Created files:" -ForegroundColor Yellow
Get-ChildItem $BuildDir | Format-Table Name, Length, LastWriteTime