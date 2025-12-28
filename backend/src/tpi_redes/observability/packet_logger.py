import json
import logging
import time
from typing import Any, ClassVar

logger = logging.getLogger("tpi-redes")


class PacketLogger:
    """Handles buffering and flushing of packet capture events to stdout.

    This static utility buffers events to reduce I/O calls (print/flush)
    which can be expensive in high-throughput scenarios. Buffer is flushed
    when it reaches size limit or time interval.

    Attributes:
        BUFFER_SIZE_LIMIT (int): Maximum number of events before forced flush.
        FLUSH_INTERVAL (float): Maximum time in seconds to hold events.
    """

    _buffer: ClassVar[list[dict[str, Any]]] = []
    _last_flush_time = 0.0
    BUFFER_SIZE_LIMIT = 100
    FLUSH_INTERVAL = 0.05

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
        """Buffer a packet capture event.

        Args:
            src: Source address (IP:Port).
            dst: Destination address (IP:Port).
            protocol: Protocol name (TCP/UDP).
            info: Summary string of the packet.
            length: Packet length in bytes.
            flags: TCP flags string (if applicable).
            seq: Sequence number.
            ack: Acknowledgment number.
            window: Window size.
        """
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
        """Buffer a general progress event (e.g. file transfer update).

        Args:
            data: Dictionary containing event data.
        """
        PacketLogger._buffer.append(data)
        PacketLogger._check_flush()

    @staticmethod
    def _check_flush():
        """Check if buffer conditions are met and trigger flush."""
        now = time.time()
        if (
            len(PacketLogger._buffer) >= PacketLogger.BUFFER_SIZE_LIMIT
            or (now - PacketLogger._last_flush_time) >= PacketLogger.FLUSH_INTERVAL
        ):
            PacketLogger.flush()

    @staticmethod
    def flush():
        """Flush all buffered events to stdout as a JSON array."""
        if not PacketLogger._buffer:
            return

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
        """Helper to format IP:Port strings and call log_packet.

        Args:
            src_ip: Source IP address.
            src_port: Source port.
            dst_ip: Destination IP.
            dst_port: Destination port.
            protocol: Protocol name.
            info: Packet summary info.
            size: Size in bytes.
            flags: TCP flags.
            seq: Sequence number.
            ack: Acknowledgment number.
            window: Window size.
        """
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
