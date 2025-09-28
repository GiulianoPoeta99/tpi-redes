import logging
import socket
import time
from pathlib import Path

from tpi_redes.transfer.integrity import IntegrityVerifier

from .protocol import ProtocolHandler

logger = logging.getLogger("tpi-redes")


class UDPClient:
    def send_file(self, file_path: Path, ip: str, port: int):
        """Send a file to a remote UDP server (Best Effort)."""
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        # 1. Calculate Hash & Prepare Metadata
        logger.info(f"Calculating hash for {file_path}...")
        verifier = IntegrityVerifier(file_path)
        file_hash = verifier.calculate_hash()

        file_size = file_path.stat().st_size
        filename = file_path.name

        # 2. Pack Header
        header = ProtocolHandler.pack_header(b"F", filename, file_size, file_hash)

        from tpi_redes.networking.packet_logger import PacketLogger

        # 3. Send Datagrams
        logger.info(f"Sending {filename} to {ip}:{port} via UDP...")
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            addr = (ip, port)
            local_ip, local_port = s.getsockname()

            # Send Header
            s.sendto(header, addr)
            PacketLogger.log_packet(local_ip, ip, "UDP", f"{local_ip} -> {ip} Len={len(header)}", len(header))
            time.sleep(0.001)  # Small delay to help receiver process

            # Send Metadata
            metadata = filename.encode("utf-8") + file_hash.encode("utf-8")
            s.sendto(metadata, addr)
            PacketLogger.log_packet(local_ip, ip, "UDP", f"{local_ip} -> {ip} Len={len(metadata)}", len(metadata))
            time.sleep(0.001)

            # Send Content in Chunks
            chunk_size = 1024  # Safe payload size for MTU 1500
            sent_bytes = 0

            with open(file_path, "rb") as f:
                while chunk := f.read(chunk_size):
                    s.sendto(chunk, addr)
                    chunk_len = len(chunk)
                    sent_bytes += chunk_len
                    PacketLogger.log_packet(local_ip, ip, "UDP", f"{local_ip} -> {ip} Len={chunk_len}", chunk_len)

                    # Simple flow control: sleep every N packets?
                    # For now just a tiny sleep per packet is safer for localhost/LAN
                    time.sleep(0.0005)

            logger.info(f"UDP Transfer finished. Sent {sent_bytes} bytes.")
