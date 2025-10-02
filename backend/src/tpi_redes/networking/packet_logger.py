import json
import time
import logging

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
