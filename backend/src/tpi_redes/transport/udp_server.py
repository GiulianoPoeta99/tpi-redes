import logging
import socket
from dataclasses import dataclass
from pathlib import Path

from tpi_redes.core.base import BaseServer
from tpi_redes.core.protocol import Header, ProtocolHandler
from tpi_redes.observability.packet_logger import PacketLogger

logger = logging.getLogger("tpi-redes")


@dataclass
class UDPSession:
    """Tracks the state of a file transfer session over UDP.

    Since UDP is stateless, this class maintains context for packets
    arriving from a specific (IP, Port) tuple.
    """

    state: str
    """Current state: 'WAITING_HEADER', 'WAITING_METADATA', or 'RECEIVING_CONTENT'."""

    header: Header | None = None
    filename: str | None = None
    file_hash: str | None = None
    received_bytes: int = 0
    file_path: Path | None = None


class UDPServer(BaseServer):
    """UDP implementation of the file transfer server.

    Manages multiple concurrent uploads using a state machine per client address.
    Not reliable (no ACKs/Retries implemented in this basic version),
    but follows the project's header/metadata/content protocol structure.
    """

    def __init__(self, host: str, port: int, save_dir: str):
        super().__init__(host, port, save_dir)
        self.sessions: dict[tuple[str, int], UDPSession] = {}
        self.sock: socket.socket | None = None

    def start(self):
        """Start listening for UDP packets.

        Binds to the socket and enters a loop receiving datagrams up to 65535 bytes.

        Returns:
            None: No return value.
        """
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.sock.bind((self.host, self.port))
            logger.info(f"UDP Server listening on {self.host}:{self.port}")

            try:
                while True:
                    data, addr = self.sock.recvfrom(65535)

                    local_ip, local_port = self.sock.getsockname()
                    PacketLogger.emit_packet(
                        addr[0],
                        addr[1],
                        local_ip,
                        local_port,
                        "UDP",
                        f"UDP Datagram Len={len(data)}",
                        size=len(data),
                    )

                    self.process_datagram(data, addr)
            except KeyboardInterrupt:
                logger.info("Server stopping...")
        except Exception as e:
            logger.error(f"UDP Server error: {e}")
        finally:
            if self.sock:
                self.sock.close()

    def stop(self):
        """Close the UDP socket."""
        pass

    def process_datagram(self, data: bytes, addr: tuple[str, int]):
        """Process a single incoming UDP datagram.

        Route the packet to the correct session based on the sender's address.
        If no session exists, attempts to interpret the packet as a new Header.

        Args:
            data: The raw bytes received.
            addr: The sender's (IP, Port) tuple.

        Returns:
            None: No return value.
        """
        session = self.sessions.get(addr)

        if not session:
            if len(data) == ProtocolHandler.HEADER_SIZE:
                try:
                    header = ProtocolHandler.unpack_header(data)
                    self.sessions[addr] = UDPSession(
                        state="WAITING_METADATA", header=header
                    )
                    logger.info(
                        f"[{addr}] New UDP session. Expecting {header.file_size} bytes."
                    )
                except ValueError:
                    logger.warning(f"[{addr}] Invalid header received.")
            else:
                logger.debug(f"[{addr}] Unexpected packet (No session). Dropping.")
            return

        try:
            if session.state == "WAITING_METADATA":
                if not session.header:
                    logger.error(
                        f"[{addr}] Session missing header in WAITING_METADATA state."
                    )
                    del self.sessions[addr]
                    return

                expected_len = session.header.name_len + session.header.hash_len
                if len(data) == expected_len:
                    name_bytes = data[: session.header.name_len]
                    hash_bytes = data[session.header.name_len :]

                    session.filename = name_bytes.decode("utf-8")
                    session.file_hash = hash_bytes.decode("utf-8")

                    save_path = Path(self.save_dir) / session.filename
                    save_path.parent.mkdir(parents=True, exist_ok=True)
                    session.file_path = save_path

                    with open(save_path, "wb") as _:
                        pass

                    session.state = "RECEIVING_CONTENT"
                    logger.info(f"[{addr}] Metadata received: {session.filename}")
                else:
                    logger.warning(f"[{addr}] Invalid metadata length. Resetting.")
                    del self.sessions[addr]

            elif session.state == "RECEIVING_CONTENT":
                if not session.file_path:
                    logger.error(f"[{addr}] No file path for session.")
                    del self.sessions[addr]
                    return

                with open(session.file_path, "ab") as f:
                    f.write(data)
                    session.received_bytes += len(data)

                logger.debug(
                    f"[{addr}] Chunk {len(data)} bytes. Total: {session.received_bytes}"
                )

                if (
                    session.header
                    and session.received_bytes >= session.header.file_size
                ):
                    if session.file_hash and session.file_path:
                        hash_path = Path(f"{session.file_path}.sha256")
                        with open(hash_path, "w") as f:
                            f.write(session.file_hash)

                    logger.info(f"[{addr}] Transfer complete: {session.filename}")
                    del self.sessions[addr]

        except Exception as e:
            logger.error(f"[{addr}] Error processing datagram: {e}")
            if addr in self.sessions:
                del self.sessions[addr]
