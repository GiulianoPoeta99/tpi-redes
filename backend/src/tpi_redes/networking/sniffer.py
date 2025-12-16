import logging
from typing import Any

from scapy.layers.inet import IP, TCP, UDP  # type: ignore
from scapy.sendrecv import AsyncSniffer  # type: ignore

logger = logging.getLogger("tpi-redes")


class PacketSniffer:
    def __init__(self, interface: str | None, port: int):
        self.interface = interface
        self.port = port
        self.sniffer: Any = None
        self.packets: list[str] = []

    def start(self):
        """Start the background sniffer."""
        import os

        if os.geteuid() != 0:
            logger.info("Sniffer running without root (App-Level Fallback active).")

        filter_str = f"tcp port {self.port} or udp port {self.port}"
        logger.info(
            f"Starting Sniffer on {self.interface or 'default'} with filter '{filter_str}'..."  # noqa: E501
        )

        self.sniffer = AsyncSniffer(
            iface=self.interface,
            filter=filter_str,
            prn=self._process_packet,
            store=False,
        )
        try:
            self.sniffer.start()
            logger.info("Sniffer started successfully.")
        except Exception as e:
            logger.error(f"Failed to start sniffer: {e}")

    def stop(self):
        """Stop the sniffer."""
        if self.sniffer:
            try:
                self.sniffer.stop()
                logger.info("Sniffer stopped.")
            except Exception as e:
                if "Unsupported" in str(e):
                    logger.debug(f"Ignored expected sniffer shutdown error: {e}")
                else:
                    logger.warning(f"Error stopping sniffer: {e}")

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
                window = 0

                if pkt.haslayer(TCP):
                    protocol = "TCP"
                    flags = str(pkt[TCP].flags)
                    seq = pkt[TCP].seq
                    ack = pkt[TCP].ack
                    window = pkt[TCP].window
                    info = f"{src} -> {dst} [{flags}] Seq={seq} Ack={ack} Win={window}"
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
                    "window": window,
                }

                print(json.dumps(packet_data), flush=True)

        except Exception as e:
            logger.error(f"Error processing packet: {e}")
