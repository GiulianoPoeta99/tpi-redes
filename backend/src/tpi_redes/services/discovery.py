import contextlib
import json
import logging
import socket
import threading
import time
from typing import Any

from tpi_redes.config import DEFAULT_SERVER_PORT, DISCOVERY_BUFFER_SIZE

logger = logging.getLogger("tpi-redes")

DISCOVERY_PORT = 37020
BROADCAST_IP = "255.255.255.255"


class DiscoveryService:
    """Service for discovering peer nodes on the local network via UDP Broadcast.

    Implements a simple PING/PONG protocol:
    - `scan()`: Broadcasts PING and collects PONG responses.
    - `listen()`: Listens for PINGs and replies with PONG containing self info.
    """

    def __init__(self, hostname: str | None = None):
        """Initialize discovery service.

        Args:
            hostname: Custom hostname to announce. Defaults to system hostname.
        """
        self.hostname = hostname or socket.gethostname()
        self.running = False

    def scan(self, timeout: int = 2) -> list[dict[str, Any]]:
        """Scan for peers on the local network.

        Sends a UDP broadcast packet and waits for responses during the timeout period.

        Args:
            timeout: Seconds to wait for responses.

        Returns:
            list[dict]: List of unique discovered peers with keys: hostname, ip, port.
        """
        discovered_peers: list[dict[str, Any]] = []

        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            s.settimeout(timeout)
            # Bind to a port to receive responses (required on Windows, works on Linux too)
            s.bind(("", 0))

            message = json.dumps({"type": "PING", "hostname": self.hostname}).encode(
                "utf-8"
            )
            try:
                s.sendto(message, (BROADCAST_IP, DISCOVERY_PORT))
                logger.info("Sent Discovery PING...")

                start_time = time.time()
                while time.time() - start_time < timeout:
                    try:
                        data, addr = s.recvfrom(DISCOVERY_BUFFER_SIZE)
                        response: dict[str, Any] = json.loads(data.decode("utf-8"))

                        if response.get("type") == "PONG":
                            peer: dict[str, Any] = {
                                "hostname": response.get("hostname"),
                                "ip": addr[0],
                                "port": response.get("port", DEFAULT_SERVER_PORT),
                            }
                            if not any(
                                (p["ip"] == peer["ip"] and p["port"] == peer["port"])
                                for p in discovered_peers
                            ):
                                discovered_peers.append(peer)
                                hostname = peer.get("hostname", "Unknown")
                                logger.info(
                                    f"Discovered peer: {hostname} ({peer['ip']})"
                                )
                    except TimeoutError:
                        break
                    except Exception:
                        continue

            except Exception as e:
                logger.error(f"Discovery scan error: {e}")

        return discovered_peers

    def listen(self, port: int):
        """Start a background thread listening for PING broadcasts.

        Responds with PONG packets containing this node's hostname and service port.
        Uses SO_REUSEPORT (if available) to coexist with other listeners.

        Args:
            port: The TCP service port to announce in PONG responses.
        """
        self.running = True

        def _listen_loop():
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                with contextlib.suppress(AttributeError):
                    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)

                s.bind(("", DISCOVERY_PORT))
                logger.info(f"Discovery Service listening on UDP {DISCOVERY_PORT}")

                while self.running:
                    try:
                        data, addr = s.recvfrom(DISCOVERY_BUFFER_SIZE)
                        message = json.loads(data.decode("utf-8"))

                        if message.get("type") == "PING":
                            logger.info(
                                f"Received PING from {message.get('hostname')} "
                                f"({addr[0]})"
                            )

                            response = {
                                "type": "PONG",
                                "hostname": self.hostname,
                                "port": port,
                            }
                            s.sendto(json.dumps(response).encode("utf-8"), addr)

                    except Exception as e:
                        if self.running:
                            logger.error(f"Discovery listen error: {e}")

        threading.Thread(target=_listen_loop, daemon=True).start()

    def stop(self):
        """Stop the listening thread."""
        self.running = False
