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


def _get_broadcast_addresses() -> list[str]:
    """Get broadcast addresses for all active network interfaces.

    On Windows with multiple network adapters, sending to 255.255.255.255
    may not work reliably. This function calculates the specific broadcast
    address for each network interface using psutil.

    Returns:
        List of broadcast IP addresses (strings), including 255.255.255.255 as fallback.
    """
    broadcast_addrs = {BROADCAST_IP}  # Always include fallback

    try:
        import psutil

        # Get all network interfaces
        interfaces = psutil.net_if_addrs()

        for interface_name, addrs in interfaces.items():
            for addr in addrs:
                # Only process IPv4 addresses
                if addr.family == socket.AF_INET:
                    # Extract broadcast address if available
                    if addr.broadcast:
                        broadcast_addrs.add(addr.broadcast)
                        logger.debug(
                            f"Found broadcast {addr.broadcast} for interface {interface_name}"
                        )
    except ImportError:
        logger.warning(
            "psutil not available, using fallback broadcast address only"
        )
    except Exception as e:
        logger.warning(
            f"Error getting broadcast addresses from psutil: {e}, using fallback only"
        )

    result = list(broadcast_addrs)
    logger.info(f"Using broadcast addresses: {result}")
    return result


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

        Sends UDP broadcast packets to all network interfaces and waits for responses.
        On Windows, this sends to specific broadcast addresses for each interface,
        not just 255.255.255.255, to work around issues with multiple network adapters.

        Args:
            timeout: Seconds to wait for responses.

        Returns:
            list[dict]: List of unique discovered peers with keys: hostname, ip, port.
        """
        discovered_peers: list[dict[str, Any]] = []

        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            s.settimeout(timeout)
            # Bind to 0.0.0.0 for better Windows compatibility
            s.bind(("0.0.0.0", 0))
            bound_addr = s.getsockname()
            logger.info(f"Scanner socket bound to {bound_addr}")

            message = json.dumps({"type": "PING", "hostname": self.hostname}).encode(
                "utf-8"
            )

            # Get all broadcast addresses (important for Windows with multiple adapters)
            broadcast_addresses = _get_broadcast_addresses()

            try:
                # Send to all broadcast addresses
                for broadcast_addr in broadcast_addresses:
                    try:
                        s.sendto(message, (broadcast_addr, DISCOVERY_PORT))
                        logger.info(
                            f"Sent Discovery PING to {broadcast_addr}:{DISCOVERY_PORT} from {bound_addr}"
                        )
                    except Exception as e:
                        logger.warning(
                            f"Failed to send to {broadcast_addr}:{DISCOVERY_PORT}: {e}"
                        )

                start_time = time.time()
                while time.time() - start_time < timeout:
                    try:
                        data, addr = s.recvfrom(DISCOVERY_BUFFER_SIZE)
                        logger.info(
                            f"Received UDP packet from {addr}, size: {len(data)} bytes"
                        )
                        try:
                            response: dict[str, Any] = json.loads(data.decode("utf-8"))
                            logger.info(f"Parsed response: {response}")
                        except json.JSONDecodeError as e:
                            logger.warning(
                                f"Failed to parse response as JSON: {e}, raw data: {data[:100]}"
                            )
                            continue

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
                        else:
                            logger.warning(
                                f"Received non-PONG response type: {response.get('type')}"
                            )
                    except socket.timeout:
                        logger.debug("Socket timeout in recvfrom")
                        break
                    except TimeoutError:
                        logger.debug("TimeoutError in recvfrom")
                        break
                    except Exception as e:
                        logger.warning(
                            f"Error receiving discovery response: {type(e).__name__}: {e}"
                        )
                        continue

            except Exception as e:
                logger.error(f"Discovery scan error: {e}", exc_info=True)

        logger.info(f"Scan completed, found {len(discovered_peers)} peers")
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

                # Use 0.0.0.0 instead of "" for better Windows compatibility
                s.bind(("0.0.0.0", DISCOVERY_PORT))
                bound_addr = s.getsockname()
                logger.info(
                    f"Discovery Service listening on UDP {DISCOVERY_PORT}, bound to {bound_addr}"
                )

                while self.running:
                    try:
                        data, addr = s.recvfrom(DISCOVERY_BUFFER_SIZE)
                        logger.info(
                            f"Received UDP packet from {addr}, size: {len(data)} bytes"
                        )
                        try:
                            message = json.loads(data.decode("utf-8"))
                            logger.info(f"Parsed message: {message}")
                        except json.JSONDecodeError as e:
                            logger.warning(
                                f"Failed to parse message as JSON: {e}, raw data: {data[:100]}"
                            )
                            continue

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
                            response_json = json.dumps(response).encode("utf-8")
                            s.sendto(response_json, addr)
                            logger.info(
                                f"Sent PONG to {addr[0]}:{addr[1]}, response: {response}"
                            )
                        else:
                            logger.warning(
                                f"Received non-PING message type: {message.get('type')}"
                            )

                    except Exception as e:
                        if self.running:
                            logger.error(f"Discovery listen error: {e}", exc_info=True)

        threading.Thread(target=_listen_loop, daemon=True).start()

    def stop(self):
        """Stop the listening thread."""
        self.running = False
