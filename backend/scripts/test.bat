@echo off
REM Run all tests

echo Running tests...
uv run pytest

if %ERRORLEVEL% NEQ 0 (
    echo Tests failed!
    exit /b 1
)

echo All tests passed!
