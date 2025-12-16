import logging
import socket
import time
from pathlib import Path

from tpi_redes.transfer.integrity import IntegrityVerifier

from .protocol import ProtocolHandler

logger = logging.getLogger("tpi-redes")


class TCPClient:
    def send_files(
        self,
        files: list[Path],
        ip: str,
        port: int,
        delay: float = 0.0,
        chunk_size: int = 4096,
    ):
        """Send multiple files to a remote TCP server over a single connection."""

        # Filter existing files
        valid_files = [f for f in files if f.exists()]
        if not valid_files:
            raise FileNotFoundError("No valid files to send")

        logger.info(f"Connecting to {ip}:{port}...")

        from tpi_redes.networking.packet_logger import PacketLogger

        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.connect((ip, port))
            local_ip, local_port = s.getsockname()

            # Log Handshake (Simulated)
            PacketLogger.emit_packet(
                src_ip=local_ip,
                src_port=local_port,
                dst_ip=ip,
                dst_port=port,

                protocol="TCP",
                flags="S",
                size=0,
                seq=0,
                ack=0,
                window=65535,
                info="Connection Request [SYN] Seq=0 Win=65535",
            )

            for file_path in valid_files:
                # 1. Calculate Hash & Prepare Metadata
                logger.info(f"Calculating hash for {file_path}...")
                verifier = IntegrityVerifier(file_path)
                file_hash = verifier.calculate_hash()

                file_size = file_path.stat().st_size
                filename = file_path.name

                # 2. Pack Header
                header = ProtocolHandler.pack_header(
                    b"F", filename, file_size, file_hash
                )
                metadata = filename.encode("utf-8") + file_hash.encode("utf-8")

                # 3. Send Header & Metadata
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

                # Setup Sequence Number for this file transfer
                current_seq = 1 + len(header) + len(metadata)

                with open(file_path, "rb") as f:
                    while chunk := f.read(chunk_size):
                        s.sendall(chunk)

                        if delay > 0:
                            time.sleep(delay)

                        chunk_len = len(chunk)
                        bytes_sent += chunk_len

                        # Log Packet
                        PacketLogger.log_packet(
                            local_ip,
                            ip,
                            "TCP",
                            f"{local_port}->{port} [PSH, ACK] Seq={current_seq} Ack=1 Win=65535 Len={chunk_len}",
                            length=chunk_len,
                            flags="PA",
                            seq=current_seq,
                            ack=1,
                            window=65535,
                        )
                        current_seq += chunk_len

                        # Emit progress (Buffered by PacketLogger)
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
