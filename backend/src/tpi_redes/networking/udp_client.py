from typing import List

from tpi_redes.transfer.integrity import IntegrityVerifier

from .protocol import ProtocolHandler

logger = logging.getLogger("tpi-redes")


class UDPClient:
    def send_files(self, files: List[Path], ip: str, port: int, delay: float = 0.0):
        """Send multiple files to a remote UDP server (Best Effort)."""
        
        valid_files = [f for f in files if f.exists()]
        if not valid_files:
            raise FileNotFoundError("No valid files to send")

        from tpi_redes.networking.packet_logger import PacketLogger
        
        logger.info(f"Sending {len(valid_files)} files to {ip}:{port} via UDP...")

        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            addr = (ip, port)
            local_ip, local_port = s.getsockname()
            
            for file_path in valid_files:
                # 1. Calculate Hash & Prepare Metadata
                logger.info(f"Calculating hash for {file_path}...")
                verifier = IntegrityVerifier(file_path)
                file_hash = verifier.calculate_hash()

                file_size = file_path.stat().st_size
                filename = file_path.name

                # 2. Pack Header
                header = ProtocolHandler.pack_header(b"F", filename, file_size, file_hash)

                # 3. Send Datagrams
                logger.info(f"Processing {filename}...")
                
                # Send Header
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
                time.sleep(0.001)  # Small delay to help receiver process

                # Send Metadata
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

                # Send Content in Chunks
                sent_bytes = 0
                start_transfer = time.time()
                last_stats_time = start_transfer
                last_reported_bytes = 0
                chunk_size = 4096

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

                        # Progress Emission (throttled)
                        current_time = time.time()
                        if current_time - last_stats_time >= 0.1:
                            # Not sending throughput stats for UDP in loop to avoid noise, 
                            # or just minimal updates. Keeping minimal.
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

