import logging
import socket
from pathlib import Path

from tpi_redes.transfer.integrity import IntegrityVerifier

from .protocol import ProtocolHandler

logger = logging.getLogger("tpi-redes")

class TCPClient:
    def send_file(self, file_path: Path, ip: str, port: int):
        """Send a file to a remote TCP server."""
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        # 1. Calculate Hash & Prepare Metadata
        logger.info(f"Calculating hash for {file_path}...")
        verifier = IntegrityVerifier(file_path)
        file_hash = verifier.calculate_hash()

        file_size = file_path.stat().st_size
        filename = file_path.name

        # 2. Pack Header
        header = ProtocolHandler.pack_header(b'F', filename, file_size, file_hash)

        # 3. Connect and Send
        logger.info(f"Connecting to {ip}:{port}...")
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.connect((ip, port))

            # Send Header
            s.sendall(header)

            # Send Metadata
            s.sendall(filename.encode("utf-8"))
            s.sendall(file_hash.encode("utf-8"))

            # Send Content
            logger.info("Sending content...")
            with open(file_path, "rb") as f:
                # Send in chunks using sendfile for efficiency if available,
                # but manual loop allows for progress tracking later.
                while chunk := f.read(4096):
                    s.sendall(chunk)

            logger.info("File sent successfully.")
