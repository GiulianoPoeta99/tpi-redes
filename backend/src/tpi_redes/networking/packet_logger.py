import json
import logging
import time

logger = logging.getLogger("tpi-redes")


class PacketLogger:
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
    ):
        """Emit a JSON packet event compatible with the Frontend Sniffer View."""
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
        }
        # Print valid JSON to stdout for Electron to capture
        print(json.dumps(packet_data), flush=True)

        # Optional: Log to stderr for debug/CLI visibility
        # logger.debug(f"PktLog: {protocol} {src}->{dst} : {info}")

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
    ):
        """Helper to format IP:Port and call log_packet."""
        src = f"{src_ip}:{src_port}"
        dst = f"{dst_ip}:{dst_port}"
        PacketLogger.log_packet(
            src, dst, protocol, info, length=size, flags=flags, seq=seq, ack=ack
        )
