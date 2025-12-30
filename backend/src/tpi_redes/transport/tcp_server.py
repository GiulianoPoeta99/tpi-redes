import json
import logging
import socket
from pathlib import Path
from typing import Any

from tpi_redes.config import CHUNK_SIZE, PROGRESS_REPORT_INTERVAL_BYTES
from tpi_redes.core.base import BaseServer
from tpi_redes.core.protocol import ProtocolHandler

logger = logging.getLogger("tpi-redes")


class TCPServer(BaseServer):
    """TCP implementation of the file transfer server.

    Handles TCP connections, complying with the custom `ProtocolHandler`.
    Emits JSON events to stdout for IPC interaction with the frontend.
    """

    def start(self):
        """Start listening for TCP connections.

        This method blocks the calling thread until a `KeyboardInterrupt` occurs.
        It accepts connections and processes them sequentially via `handle_client`.

        Returns:
            None: No return value.
        """
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
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
        """Placeholder for stop logic (handled via process termination)."""
        pass

    def handle_client(self, conn: Any, addr: Any):
        """Handle a single client connection session.

        Receives files sequentially over the established socket connection.
        Follows the protocol: Header -> Metadata -> Content.

        Args:
            conn: The accepted socket object.
            addr: The client address tuple (IP, Port).

        Returns:
            None: No return value.
        """
        try:
            while True:
                header_data = self._recv_exact(conn, ProtocolHandler.HEADER_SIZE)
                if not header_data:
                    break

                header = ProtocolHandler.unpack_header(header_data)

                filename_bytes = self._recv_exact(conn, header.name_len)
                filename = filename_bytes.decode("utf-8")

                hash_bytes = self._recv_exact(conn, header.hash_len)
                file_hash = hash_bytes.decode("utf-8")
                logger.debug(f"Expected Hash: {file_hash}")

                logger.info(f"Receiving '{filename}' ({header.file_size} bytes)...")
                print(
                    json.dumps(
                        {
                            "type": "TRANSFER_UPDATE",
                            "status": "start",
                            "filename": filename,
                            "total": header.file_size,
                        }
                    ),
                    flush=True,
                )

                save_path = Path(self.save_dir) / filename
                save_path.parent.mkdir(parents=True, exist_ok=True)

                received_bytes = 0
                with open(save_path, "wb") as f:
                    while received_bytes < header.file_size:
                        chunk_size = min(
                            CHUNK_SIZE, header.file_size - received_bytes
                        )
                        chunk = self._recv_exact(conn, chunk_size)
                        if not chunk:
                            break
                        f.write(chunk)
                        received_bytes += len(chunk)

                        if (
                            received_bytes % PROGRESS_REPORT_INTERVAL_BYTES < CHUNK_SIZE
                            or received_bytes == header.file_size
                        ):
                            print(
                                json.dumps(
                                    {
                                        "type": "TRANSFER_UPDATE",
                                        "status": "progress",
                                        "filename": filename,
                                        "current": received_bytes,
                                        "total": header.file_size,
                                    }
                                ),
                                flush=True,
                            )

                hash_path = Path(f"{save_path}.sha256")
                with open(hash_path, "w") as f:
                    f.write(file_hash)

                logger.info(f"File '{filename}' received successfully.")
                print(
                    json.dumps(
                        {
                            "type": "TRANSFER_UPDATE",
                            "status": "complete",
                            "filename": filename,
                        }
                    ),
                    flush=True,
                )

        except Exception as e:
            logger.error(f"Error handling client {addr}: {e}")

    def _recv_exact(self, conn: Any, n: int) -> bytes:
        """Receive exactly n bytes from the socket.

        Args:
            conn: The socket object.
            n: Number of bytes to receive.

        Returns:
            bytes: The received data, or empty bytes if EOF is reached.
        """
        data = b""
        while len(data) < n:
            packet = conn.recv(n - len(data))
            if not packet:
                return b""
            data += packet
        return data
