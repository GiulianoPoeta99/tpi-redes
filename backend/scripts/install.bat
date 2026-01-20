@echo off
REM Install dependencies for Windows

echo Installing Python dependencies...
uv sync

if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to install dependencies
    exit /b 1
)

echo Dependencies installed successfully!
