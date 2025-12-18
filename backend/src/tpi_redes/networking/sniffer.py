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
        """Start the background sniffer (requires root)."""
        import os
        import json
        import sys

        if os.geteuid() != 0:
            logger.warning("Sniffer requires root privileges. Packet capture disabled.")
            print(
                json.dumps({
                    "type": "SNIFFER_ERROR",
                    "code": "PERMISSION_DENIED",
                    "message": "Root privileges required for packet capture."
                }),
                flush=True
            )
            return

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

    def start_stdout_mode(self):
        """Start sniffer in stdout mode (for piped execution)."""
        import os
        import json
        import sys
        import time


        # 1. Enforce Root
        if os.geteuid() != 0:
            print(
                json.dumps({
                    "type": "SNIFFER_ERROR",
                    "code": "PERMISSION_DENIED",
                    "message": "Root privileges required."
                }),
                flush=True
            )
            # Exit immediately to signal parent
            sys.exit(1)

        filter_str = f"tcp port {self.port} or udp port {self.port}"
        
        try:
            from scapy.all import AsyncSniffer, get_if_list, conf
        except ImportError:
            sys.exit(1)


        self.sniffer = AsyncSniffer(
            iface=self.interface,
            filter=filter_str,
            prn=self._process_packet,
            store=False,
        )
        self.sniffer.start()

        # Signal readiness
        print(json.dumps({"type": "SNIFFER_READY"}), flush=True)
        
        # Keep process alive
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stop()

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
            import sys
            

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
