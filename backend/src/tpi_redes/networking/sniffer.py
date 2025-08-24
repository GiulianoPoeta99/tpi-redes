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
            summary = pkt.summary()
            self.packets.append(summary)

            # Detailed logging for debugging
            if pkt.haslayer(IP):
                src = pkt[IP].src
                dst = pkt[IP].dst
                proto = (
                    "TCP"
                    if pkt.haslayer(TCP)
                    else "UDP"
                    if pkt.haslayer(UDP)
                    else "IP"
                )

                info = f"[{proto}] {src} -> {dst}"
                if pkt.haslayer(TCP):
                    flags = pkt[TCP].flags
                    info += f" Flags=[{flags}] Seq={pkt[TCP].seq} Ack={pkt[TCP].ack}"

                logger.info(f"SNIFFER: {info}")

        except Exception as e:
            logger.error(f"Error processing packet: {e}")
