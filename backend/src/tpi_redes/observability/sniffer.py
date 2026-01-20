import json
import logging
import os
import sys
import time
from typing import Any

from scapy.layers.inet import IP, TCP, UDP
from scapy.sendrecv import AsyncSniffer

from tpi_redes.platform_compat import is_admin, setup_process_death_signal

logger = logging.getLogger("tpi-redes")


class PacketSniffer:
    """Captures and analyzes network packets using Scapy.

    Can run in two modes:
    1. Background thread (via `start`): Captures packets alongside application.
    2. Stdout mode (via `start_stdout_mode`): Dedicated process outputting JSON.

    Requires root privileges (sudo) to capture packets on Linux interfaces.
    """

    def __init__(self, interface: str | None, port: int):
        """Initialize sniffer configuration.

        Args:
            interface: Bind interface (e.g., 'eth0'). None for default.
            port: Port to filter logic for (captures 'tcp port X or udp port X').
        """
        self.interface = interface
        self.port = port
        self.sniffer: Any = None
        self.packets: list[str] = []

    def start(self):
        """Start the background sniffer loop.

        Checks for root privileges first. If missing, logs a warning and returns
        a JSON error event to stdout (for frontend).
        """
        if not is_admin():
            logger.warning("Sniffer requires admin privileges. Packet capture disabled.")
            print(
                json.dumps(
                    {
                        "type": "SNIFFER_ERROR",
                        "code": "PERMISSION_DENIED",
                        "message": "Administrator privileges required for packet capture.",
                    }
                ),
                flush=True,
            )
            return

        filter_str = f"tcp port {self.port} or udp port {self.port}"
        iface_name = self.interface or "default"
        logger.info(f"Starting Sniffer on {iface_name} with filter '{filter_str}'...")

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
        """Start sniffer in blocking mode, outputting JSON events to stdout.

        Used when running as a separate child process purely for sniffing.
        Enforces root privileges; exits with code 1 if missing.

        Robustness features:
        - Uses `prctl(PR_SET_PDEATHSIG)` (Linux only) to auto-terminate if parent dies.
        - Exits gracefully on `BrokenPipeError` (stdout closed).
        - Keeps running until `KeyboardInterrupt` or termination signal.
        """
        # Platform-specific: Ensure this process dies if the parent dies (Linux only).
        setup_process_death_signal()

        if not is_admin():
            print(
                json.dumps(
                    {
                        "type": "SNIFFER_ERROR",
                        "code": "PERMISSION_DENIED",
                        "message": "Root privileges required.",
                    }
                ),
                flush=True,
            )
            sys.exit(1)

        filter_str = f"tcp port {self.port} or udp port {self.port}"

        try:
            from scapy.all import AsyncSniffer as ScapyAsyncSniffer

            assert ScapyAsyncSniffer
        except ImportError:
            sys.exit(1)

        self.sniffer = AsyncSniffer(
            iface=self.interface,
            filter=filter_str,
            prn=self._process_packet,
            store=False,
        )
        self.sniffer.start()
        print("SNIFFER_READY", flush=True)

        try:
            self.sniffer.join()
        except KeyboardInterrupt:
            self.sniffer.stop()

    def stop(self):
        """Stop packet capturing."""
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
        """Return a list of string summaries of captured packets.

        Returns:
            list[str]: Summary lines.
        """
        return self.packets

    def _process_packet(self, pkt: Any):
        """Callback for each captured packet.

        Extracts IP, TCP, and UDP headers, parses flags/seq/ack,
        and outputs a JSON event `PACKET_CAPTURE`.

        Args:
            pkt: Scapy packet object.
        """
        try:
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

                try:
                    print(json.dumps(packet_data), flush=True)
                except BrokenPipeError:
                    sys.exit(0)

        except BrokenPipeError:
            sys.exit(0)
        except Exception as e:
            logger.error(f"Error processing packet: {e}")
