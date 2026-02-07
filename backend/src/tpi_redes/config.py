"""Centralized configuration constants for the application."""

import os
from pathlib import Path

DEFAULT_HOST = os.getenv("TPI_REDES_HOST", "127.0.0.1")
DEFAULT_SERVER_PORT = int(os.getenv("TPI_REDES_PORT", "8080"))
DEFAULT_PROXY_PORT = int(os.getenv("TPI_REDES_PROXY_PORT", "8081"))

_DEFAULT_DATA_DIR = Path(
    os.getenv("TPI_REDES_HOME", str(Path.home() / ".tpi-redes"))
)
DEFAULT_SAVE_DIR = os.getenv(
    "TPI_REDES_SAVE_DIR", str(_DEFAULT_DATA_DIR / "received_files")
)

CHUNK_SIZE = 4096
DISCOVERY_BUFFER_SIZE = 1024
UDP_PAYLOAD_SIZE = 4096
MAX_UDP_PACKET_SIZE = 65535

PROGRESS_REPORT_INTERVAL_BYTES = 1024 * 100
