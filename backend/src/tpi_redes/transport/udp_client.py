import json
import logging
import socket
import time
from pathlib import Path

from tpi_redes.config import UDP_PAYLOAD_SIZE
from tpi_redes.core.protocol import ProtocolHandler
from tpi_redes.transfer.integrity import IntegrityVerifier

logger = logging.getLogger("tpi-redes")


class UDPClient:
    """Client for sending files to a UDP server (Best Effort).

    Uses a stateless "fire-and-forget" approach to send file datagrams.
    No retransmission or reliability guarantees are implemented at this layer,
    relying on the local network reliability.
    """

    def send_files(
        self,
        files: list[Path],
        ip: str,
        port: int,
        delay: float = 0.0,
        chunk_size: int = UDP_PAYLOAD_SIZE,
    ):
        """Send multiple files to a remote UDP server.

        Files are sent sequentially using specific datagrams for:
        Header -> Metadata -> Content Chunks.

        Args:
            files: List of file paths to transmit.
            ip: Destination IP address.
            port: Destination port number.
            delay: Optional delay (seconds) between packets for flow control.
            chunk_size: Size of data payload per packet (default: UDP_PAYLOAD_SIZE).

        Raises:
            FileNotFoundError: If no valid existing files are provided.

        Returns:
            None: No return value.
        """
        valid_files = [f for f in files if f.exists()]
        if not valid_files:
            raise FileNotFoundError("No valid files to send")

        from tpi_redes.observability.packet_logger import PacketLogger

        logger.info(f"Sending {len(valid_files)} files to {ip}:{port} via UDP...")

        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            addr = (ip, port)
            local_ip, local_port = s.getsockname()

            for file_path in valid_files:
                logger.info(f"Calculating hash for {file_path}...")
                verifier = IntegrityVerifier(file_path)
                file_hash = verifier.calculate_hash()

                file_size = file_path.stat().st_size
                filename = file_path.name

                header = ProtocolHandler.pack_header(
                    b"F", filename, file_size, file_hash
                )

                logger.info(f"Processing {filename}...")

                s.sendto(header, addr)
                PacketLogger.emit_packet(
                    src_ip=local_ip,
                    src_port=local_port,
                    dst_ip=ip,
                    dst_port=port,
                    protocol="UDP",
                    flags="",
                    size=len(header),
                    info=f"Header: {filename} ({file_size} bytes)",
                )
                time.sleep(0.001)

                metadata = filename.encode("utf-8") + file_hash.encode("utf-8")
                s.sendto(metadata, addr)
                PacketLogger.emit_packet(
                    src_ip=local_ip,
                    src_port=local_port,
                    dst_ip=ip,
                    dst_port=port,
                    protocol="UDP",
                    flags="",
                    size=len(metadata),
                    info="Metadata: Filename and Hash",
                )
                time.sleep(0.001)

                print(
                    json.dumps(
                        {
                            "type": "TRANSFER_UPDATE",
                            "status": "start",
                            "filename": filename,
                            "total": file_size,
                        }
                    ),
                    flush=True,
                )

                sent_bytes = 0
                start_transfer = time.time()
                last_stats_time = start_transfer

                with open(file_path, "rb") as f:
                    while chunk := f.read(chunk_size):
                        s.sendto(chunk, addr)
                        sent_bytes += len(chunk)

                        if delay > 0:
                            time.sleep(delay)

                        PacketLogger.emit_packet(
                            src_ip=local_ip,
                            src_port=local_port,
                            dst_ip=ip,
                            dst_port=port,
                            protocol="UDP",
                            flags="",
                            size=len(chunk),
                            info=f"Chunk ({len(chunk)}B) - {sent_bytes}/{file_size}",
                        )

                        current_time = time.time()
                        if current_time - last_stats_time >= 0.1:
                            print(
                                json.dumps(
                                    {
                                        "type": "TRANSFER_UPDATE",
                                        "status": "progress",
                                        "filename": filename,
                                        "current": sent_bytes,
                                        "total": file_size,
                                    }
                                ),
                                flush=True,
                            )
                            last_stats_time = current_time

                logger.info(f"UDP Transfer finished for {filename}.")
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
