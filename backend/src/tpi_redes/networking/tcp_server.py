import logging
import socket
from pathlib import Path
from typing import Any

from .base import BaseServer
from .protocol import ProtocolHandler

logger = logging.getLogger("tpi-redes")


class TCPServer(BaseServer):
    def start(self):
        """Start listening for TCP connections."""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind((self.host, self.port))
            s.listen()
            logger.info(f"TCP Server listening on {self.host}:{self.port}")

            try:
                while True:
                    conn, addr = s.accept()
                    with conn:
                        logger.info(f"Connected by {addr}")
                        self.handle_client(conn, addr)
            except KeyboardInterrupt:
                logger.info("Server stopping...")

    def stop(self):
        pass

    def handle_client(self, conn: Any, addr: Any):
        """Handle a single client connection."""
        try:
            # 1. Receive Header
            header_data = self._recv_exact(conn, ProtocolHandler.HEADER_SIZE)
            if not header_data:
                return

            header = ProtocolHandler.unpack_header(header_data)

            # 2. Receive Metadata
            filename_bytes = self._recv_exact(conn, header.name_len)
            filename = filename_bytes.decode("utf-8")

            hash_bytes = self._recv_exact(conn, header.hash_len)
            file_hash = hash_bytes.decode("utf-8")
            logger.debug(f"Expected Hash: {file_hash}")

            logger.info(f"Receiving '{filename}' ({header.file_size} bytes)...")

            # 3. Receive Content & Save
            save_path = Path(self.save_dir) / filename
            save_path.parent.mkdir(parents=True, exist_ok=True)

            received_bytes = 0
            with open(save_path, "wb") as f:
                while received_bytes < header.file_size:
                    chunk_size = min(4096, header.file_size - received_bytes)
                    chunk = self._recv_exact(conn, chunk_size)
                    if not chunk:
                        break
                    f.write(chunk)
                    received_bytes += len(chunk)

            logger.info(f"File '{filename}' received successfully.")

            # TODO: Verify Hash

        except Exception as e:
            logger.error(f"Error handling client {addr}: {e}")

    def _recv_exact(self, conn: Any, n: int) -> bytes:
        """Helper to receive exactly n bytes."""
        data = b""
        while len(data) < n:
            packet = conn.recv(n - len(data))
            if not packet:
                return b""
            data += packet
        return data
