import json
import logging
import socket
from pathlib import Path
from typing import Any

from tpi_redes.core.base import BaseServer
from tpi_redes.core.protocol import ProtocolHandler

logger = logging.getLogger("tpi-redes")


class TCPServer(BaseServer):
    def start(self):
        """Start listening for TCP connections."""
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
                        # App-Level Packet Log - REMOVED for Strict Mode
                        # client_ip, client_port = addr
                        # local_ip, local_port = conn.getsockname()

                        self.handle_client(conn, addr)
            except KeyboardInterrupt:
                logger.info("Server stopping...")

    def stop(self):
        pass

    def handle_client(self, conn: Any, addr: Any):
        """Handle a single client connection."""
        try:
            while True:
                # 1. Receive Header
                header_data = self._recv_exact(conn, ProtocolHandler.HEADER_SIZE)
                if not header_data:
                    break

                header = ProtocolHandler.unpack_header(header_data)

                # 2. Receive Metadata
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

                        # App-Level Packet Log - REMOVED for Strict Mode


                        # Emit progress (optional: throttle this if too frequent)
                        # For now only start/end to keep it simple, or every 1MB?
                        # Let's emit every chunk for local smoothing,
                        # UI handles throttling
                        # Actually, emitting every 4KB is too much for stdout -> IPC
                        # Let's emit every ~100KB or 10%
                        if (
                            received_bytes % (1024 * 100) < 4096
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

                # Save hash file for verification
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
