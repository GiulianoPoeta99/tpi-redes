import json
import logging
import socket
import time
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
        header = ProtocolHandler.pack_header(b"F", filename, file_size, file_hash)

        # 3. Connect and Send
        logger.info(f"Connecting to {ip}:{port}...")

        start_connect = time.time()
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.connect((ip, port))
            rtt = (time.time() - start_connect) * 1000  # RTT in ms

            # Send Header
            s.sendall(header)

            # Send Metadata
            s.sendall(filename.encode("utf-8"))
            s.sendall(file_hash.encode("utf-8"))

            # Send Content (Emit Start Event)
            logger.info("Sending content...")
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

            chunk_size = 4096
            total_bytes = file_size
            bytes_sent = 0
            # Simulate a visual window of 20KB (5 chunks)
            window_size = 5 * chunk_size

            start_transfer = time.time()
            last_stats_time = start_transfer

            with open(file_path, "rb") as f:
                while chunk := f.read(chunk_size):
                    s.sendall(chunk)
                    bytes_sent += len(chunk)

                    current_time = time.time()

                    # Emit Stats every 0.1 seconds (faster for local UI)
                    if current_time - last_stats_time >= 0.1:
                        elapsed = current_time - start_transfer
                        throughput = (
                            (bytes_sent / elapsed) / (1024 * 1024) if elapsed > 0 else 0
                        )  # MB/s

                        stats_event = {
                            "type": "STATS",
                            "rtt": round(rtt, 2),
                            "throughput": round(throughput, 2),
                            "progress": round((bytes_sent / total_bytes) * 100, 1),
                        }
                        print(json.dumps(stats_event), flush=True)
                        last_stats_time = current_time

                    # Simulate Window Update for Visualization
                    # We pretend the window covers the most recently sent bytes
                    window_end = bytes_sent
                    window_start = max(0, window_end - window_size)

                    event = {
                        "type": "WINDOW_UPDATE",
                        "base": window_start,
                        "next_seq": window_end,
                        "window_size": window_size,
                        "total": total_bytes,
                    }
                    # Print JSON to stdout for Electron to parse
                    print(json.dumps(event), flush=True)

            logger.info("File sent successfully.")
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
