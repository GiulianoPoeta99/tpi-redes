import logging
from typing import Any

from scapy.layers.inet import IP, TCP, UDP  # type: ignore
from scapy.sendrecv import AsyncSniffer  # type: ignore

logger = logging.getLogger("tpi-redes")


class PacketSniffer:
    def __init__(self, interface: str, port: int):
        self.interface = interface
        self.port = port
        self.sniffer: Any = None
        self.packets: list[str] = []

    def start(self):
        """Start the background sniffer."""
        filter_str = f"tcp port {self.port} or udp port {self.port}"
        logger.info(
            f"Starting Sniffer on {self.interface} with filter '{filter_str}'..."
        )

        self.sniffer = AsyncSniffer(
            iface=self.interface,
            filter=filter_str,
            prn=self._process_packet,
            store=False,
        )
        self.sniffer.start()

    def stop(self):
        """Stop the sniffer."""
        if self.sniffer:
            self.sniffer.stop()
            logger.info("Sniffer stopped.")

    def get_packets(self) -> list[str]:
        """Return the list of captured packet summaries."""
        return self.packets

    def _process_packet(self, pkt: Any):
        """Callback for each captured packet."""
        try:
            import json
            import time

            # Legacy summary for internal storage
            summary = pkt.summary()
            self.packets.append(summary)

            if pkt.haslayer(IP):
                src = pkt[IP].src
                dst = pkt[IP].dst
                length = pkt[IP].len

                protocol = "IP"
                info = ""
                flags = ""
                seq = 0
                ack = 0

                if pkt.haslayer(TCP):
                    protocol = "TCP"
                    flags = str(pkt[TCP].flags)
                    seq = pkt[TCP].seq
                    ack = pkt[TCP].ack
                    info = f"{src} -> {dst} [{flags}] Seq={seq} Ack={ack}"
                elif pkt.haslayer(UDP):
                    protocol = "UDP"
                    info = f"{src} -> {dst} Len={pkt[UDP].len}"

                # Log for Raw View
                if info:
                    logger.info(f"SNIFFER: {info}")

                # JSON for Table View
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

                print(json.dumps(packet_data), flush=True)

        except Exception as e:
            logger.error(f"Error processing packet: {e}")
