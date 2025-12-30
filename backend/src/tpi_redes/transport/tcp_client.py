import logging
import socket
import time
from pathlib import Path

from tpi_redes.config import CHUNK_SIZE
from tpi_redes.core.protocol import ProtocolHandler
from tpi_redes.transfer.integrity import IntegrityVerifier

logger = logging.getLogger("tpi-redes")


class TCPClient:
    """Client for sending files to a TCP server.

    Establishes a connection to a specific IP and port, and sequentially
    transmits the provided files adhering to the custom binary protocol.
    """

    def send_files(
        self,
        files: list[Path],
        ip: str,
        port: int,
        delay: float = 0.0,
        chunk_size: int = CHUNK_SIZE,
    ):
        """Send multiple files to a remote TCP server.

        Established a single TCP connection and reuses it for all files in the list.
        Calculates SHA-256 for integrity verification before sending.

        Args:
            files: List of file paths to transmit.
            ip: Destination IP address.
            port: Destination port number.
            delay: Optional delay in seconds between sending chunks (for testing).
            chunk_size: Size of data chunks to read/send (default: CHUNK_SIZE).

        Raises:
            FileNotFoundError: If no valid existing files are provided.
            ConnectionError: If the connection to the server fails.

        Returns:
            None: No return value.
        """
        valid_files = [f for f in files if f.exists()]
        if not valid_files:
            raise FileNotFoundError("No valid files to send")

        logger.info(f"Connecting to {ip}:{port}...")

        from tpi_redes.observability.packet_logger import PacketLogger

        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.connect((ip, port))
            _local_ip, _local_port = s.getsockname()

            for file_path in valid_files:
                logger.info(f"Calculating hash for {file_path}...")
                verifier = IntegrityVerifier(file_path)
                file_hash = verifier.calculate_hash()

                file_size = file_path.stat().st_size
                filename = file_path.name

                header = ProtocolHandler.pack_header(
                    b"F", filename, file_size, file_hash
                )
                metadata = filename.encode("utf-8") + file_hash.encode("utf-8")

                s.sendall(header)
                s.sendall(metadata)
                logger.info(f"Sending content for '{filename}'...")
                PacketLogger.log_progress(
                    {
                        "type": "TRANSFER_UPDATE",
                        "status": "start",
                        "filename": filename,
                        "total": file_size,
                    }
                )

                total_bytes = file_size
                bytes_sent = 0

                current_seq = 1 + len(header) + len(metadata)

                with open(file_path, "rb") as f:
                    while chunk := f.read(chunk_size):
                        s.sendall(chunk)

                        if delay > 0:
                            time.sleep(delay)

                        chunk_len = len(chunk)
                        bytes_sent += chunk_len

                        current_seq += chunk_len

                        if chunk_len > 0:
                            PacketLogger.log_progress(
                                {
                                    "type": "TRANSFER_UPDATE",
                                    "status": "progress",
                                    "filename": filename,
                                    "current": bytes_sent,
                                    "total": total_bytes,
                                }
                            )

                logger.info(f"File '{filename}' sent successfully.")
                PacketLogger.log_progress(
                    {
                        "type": "TRANSFER_UPDATE",
                        "status": "complete",
                        "filename": filename,
                    }
                )
                PacketLogger.flush()
