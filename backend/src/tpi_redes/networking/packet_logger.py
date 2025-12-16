import json
import logging
import time
from typing import Any, ClassVar

logger = logging.getLogger("tpi-redes")


class PacketLogger:
    _buffer: ClassVar[list[dict[str, Any]]] = []
    _last_flush_time = 0.0
    BUFFER_SIZE_LIMIT = 100  # Max events before forced flush
    FLUSH_INTERVAL = 0.05  # 50ms

    @staticmethod
    def log_packet(
        src: str,
        dst: str,
        protocol: str,
        info: str,
        length: int = 0,
        flags: str = "",
        seq: int = 0,
        ack: int = 0,
        window: int = 0,
    ):
        """Buffer a packet event and potentially flush."""
        packet_data = {
            "type": "PACKET_CAPTURE",
            "timestamp": time.time(),
            "src": src,
            "dst": dst,
            "protocol": protocol,
            "length": length,
            "info": info,
            "flags": flags,
            "seq": seq,
            "ack": ack,
            "window": window,
        }
        PacketLogger._buffer.append(packet_data)
        PacketLogger._check_flush()

    @staticmethod
    def log_progress(data: dict[str, Any]):
        """Buffer a progress event."""
        PacketLogger._buffer.append(data)
        PacketLogger._check_flush()

    @staticmethod
    def _check_flush():
        now = time.time()
        if (
            len(PacketLogger._buffer) >= PacketLogger.BUFFER_SIZE_LIMIT
            or (now - PacketLogger._last_flush_time) >= PacketLogger.FLUSH_INTERVAL
        ):
            PacketLogger.flush()

    @staticmethod
    def flush():
        if not PacketLogger._buffer:
            return

        # Print JSON Array of events to stdout
        try:
            print(json.dumps(PacketLogger._buffer), flush=True)
            PacketLogger._buffer.clear()
            PacketLogger._last_flush_time = time.time()
        except Exception as e:
            logger.error(f"Failed to flush packet log: {e}")

    @staticmethod
    def emit_packet(
        src_ip: str,
        src_port: int,
        dst_ip: str,
        dst_port: int,
        protocol: str,
        info: str,
        size: int = 0,
        flags: str = "",
        seq: int = 0,
        ack: int = 0,
        window: int = 0,
    ):
        """Helper to format IP:Port and call log_packet."""
        src = f"{src_ip}:{src_port}"
        dst = f"{dst_ip}:{dst_port}"
        PacketLogger.log_packet(
            src,
            dst,
            protocol,
            info,
            length=size,
            flags=flags,
            seq=seq,
            ack=ack,
            window=window,
        )
