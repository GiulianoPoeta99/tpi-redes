@echo off
REM Run the CLI with arguments

set PYTHONPATH=src
uv run python -m tpi_redes.cli.main %*
