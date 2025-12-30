import logging
import random
import socket
import threading

from tpi_redes.config import CHUNK_SIZE, MAX_UDP_PACKET_SIZE
from tpi_redes.observability.packet_logger import PacketLogger

logger = logging.getLogger("tpi-redes")


class ProxyServer:
    """Man-In-The-Middle (MITM) Proxy Server.

    Intercepts TCP/UDP connections, forwards traffic between client and target server,
    and optionally corrupts data streams to simulate network interference.
    Logs intercepted packets for observability.
    """

    def __init__(
        self,
        listen_port: int,
        target_ip: str,
        target_port: int,
        corruption_rate: float,
        interface: str | None = None,
        protocol: str = "tcp",
    ):
        """Initialize the proxy configuration.

        Args:
            listen_port: Local port to accept victim connections.
            target_ip: Real server IP to forward traffic to.
            target_port: Real server port.
            corruption_rate: Probability (0.0 to 1.0) of corrupting a packet chunk.
            interface: Network interface to bind/sniff on.
            protocol: Protocol to proxy ('tcp' or 'udp').
        """
        self.listen_port = listen_port
        self.target_ip = target_ip
        self.target_port = target_port
        self.corruption_rate = corruption_rate
        self.interface = interface
        self.protocol = protocol.lower()
        self.running = False

        self.udp_sessions: dict[tuple[str, int], socket.socket] = {}
        self.udp_sessions_lock = threading.Lock()

    def start(self):
        """Start the proxy server loops."""
        if self.protocol == "tcp":
            self.start_tcp()
        elif self.protocol == "udp":
            self.start_udp()
        else:
            logger.error(f"Unsupported protocol: {self.protocol}")

    def start_tcp(self):
        """Start TCP Proxy Listener."""
        self.running = True
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server_socket:
            server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            server_socket.bind(("0.0.0.0", self.listen_port))
            server_socket.listen(5)
            logger.info(
                f"MITM TCP Proxy listening on port {self.listen_port}, "
                f"targeting {self.target_ip}:{self.target_port}"
            )
            if self.interface:
                logger.info(f"Interface: {self.interface}")
            logger.info(f"Corruption Rate: {self.corruption_rate * 100}%")

            while self.running:
                try:
                    client_socket, addr = server_socket.accept()
                    logger.info(f"Accepted TCP connection from {addr}")
                    threading.Thread(
                        target=self.handle_client_tcp, args=(client_socket,)
                    ).start()
                except Exception as e:
                    if self.running:
                        logger.error(f"Error accepting connection: {e}")

    def start_udp(self):
        """Start UDP Proxy Listener."""
        self.running = True
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as server_socket:
            server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            server_socket.bind(("0.0.0.0", self.listen_port))
            logger.info(
                f"MITM UDP Proxy listening on port {self.listen_port}, "
                f"targeting {self.target_ip}:{self.target_port}"
            )
            if self.interface:
                logger.info(f"Interface: {self.interface}")
            logger.info(f"Corruption Rate: {self.corruption_rate * 100}%")

            while self.running:
                try:
                    data, addr = server_socket.recvfrom(MAX_UDP_PACKET_SIZE)
                    self.handle_client_udp(server_socket, data, addr)
                except Exception as e:
                    if self.running:
                        logger.error(f"Error receiving UDP: {e}")

    def handle_client_tcp(self, client_socket: socket.socket):
        """Bridge two TCP sockets."""
        try:
            target_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            target_socket.connect((self.target_ip, self.target_port))

            client_to_target = threading.Thread(
                target=self.forward_tcp, args=(client_socket, target_socket, True)
            )
            target_to_client = threading.Thread(
                target=self.forward_tcp, args=(target_socket, client_socket, False)
            )

            client_to_target.start()
            target_to_client.start()

            client_to_target.join()
            target_to_client.join()

        except Exception as e:
            logger.error(f"Proxy connection error: {e}")
        finally:
            client_socket.close()

    def handle_client_udp(
        self, server_socket: socket.socket, data: bytes, addr: tuple[str, int]
    ):
        """Handle incoming UDP packet from client."""
        client_key = addr

        with self.udp_sessions_lock:
            target_socket = self.udp_sessions.get(client_key)
            if not target_socket:
                try:
                    target_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                    # Bind to ephemeral
                    target_socket.connect((self.target_ip, self.target_port))
                    self.udp_sessions[client_key] = target_socket

                    # Start listener for replies
                    threading.Thread(
                        target=self.forward_udp_reply,
                        args=(server_socket, target_socket, addr),
                        daemon=True,
                    ).start()
                    logger.info(f"New UDP session for {addr}")
                except Exception as e:
                    logger.error(f"Failed to create target UDP socket: {e}")
                    return

        # Forward Client -> Target
        try:
            # Corrupt?
            if self.corruption_rate > 0:
                original = data
                data = self.corrupt_data(data)
                info_tag = " [CORRUPTED]" if data != original else ""
            else:
                info_tag = ""

            target_socket.send(data)

            from contextlib import suppress

            with suppress(Exception):
                PacketLogger.emit_packet(
                    addr[0],
                    addr[1],
                    self.target_ip,
                    self.target_port,
                    "UDP",
                    f"MITM Forward{info_tag} Len={len(data)}",
                    size=len(data),
                    flags="",
                    seq=0,
                    ack=0,
                )
        except Exception as e:
            logger.error(f"UDP Send Error: {e}")

    def forward_udp_reply(
        self,
        server_socket: socket.socket,
        target_socket: socket.socket,
        client_addr: tuple[str, int],
    ):
        """Listen for replies from target and forward back to client."""
        try:
            while self.running:
                data = target_socket.recv(MAX_UDP_PACKET_SIZE)
                if not data:
                    break

                # Forward Target -> Client (symmetric corruption)
                if self.corruption_rate > 0:
                    original = data
                    data = self.corrupt_data(data)
                    info_tag = " [CORRUPTED_REPLY]" if data != original else ""
                else:
                    info_tag = ""

                server_socket.sendto(data, client_addr)

                from contextlib import suppress

                with suppress(Exception):
                    PacketLogger.emit_packet(
                        self.target_ip,
                        self.target_port,
                        client_addr[0],
                        client_addr[1],
                        "UDP",
                        f"MITM Reply{info_tag} Len={len(data)}",
                        size=len(data),
                        flags="",
                        seq=0,
                        ack=0,
                    )
        except Exception:
            # Socket closed or error
            pass
        finally:
            with self.udp_sessions_lock:
                if self.udp_sessions.get(client_addr) == target_socket:
                    del self.udp_sessions[client_addr]
            target_socket.close()

    def forward_tcp(
        self, source: socket.socket, destination: socket.socket, corrupt: bool
    ):
        """Forward data from source to destination socket."""
        try:
            while self.running:
                data = source.recv(CHUNK_SIZE)
                if not data:
                    break

                if corrupt and self.corruption_rate > 0:
                    original_data = data
                    data = self.corrupt_data(data)
                    info_tag = " [CORRUPTED]" if data != original_data else ""
                else:
                    info_tag = ""

                destination.sendall(data)

                try:
                    src_ip, src_port = source.getpeername()
                    dst_ip, dst_port = destination.getpeername()
                    PacketLogger.emit_packet(
                        src_ip,
                        src_port,
                        dst_ip,
                        dst_port,
                        "TCP",
                        f"MITM Forward{info_tag} Len={len(data)}",
                        size=len(data),
                        flags="PA",
                        seq=0,
                        ack=0,
                    )
                except Exception:
                    pass
        except Exception:
            pass
        finally:
            source.close()
            destination.close()

    def corrupt_data(self, data: bytes) -> bytes:
        """Randomly flip a single bit in a random byte of the data payload."""
        if random.random() < self.corruption_rate:
            mutable_data = bytearray(data)
            idx = random.randint(0, len(mutable_data) - 1)
            bit_idx = random.randint(0, 7)
            original_byte = mutable_data[idx]
            mutable_data[idx] ^= 1 << bit_idx

            logger.warning(
                f"MITM: Corrupted byte at index {idx} "
                f"(0x{original_byte:02x} -> 0x{mutable_data[idx]:02x})"
            )
            return bytes(mutable_data)
        return data
