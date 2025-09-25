import logging
import socket
from dataclasses import dataclass
from pathlib import Path

from .base import BaseServer
from .protocol import Header, ProtocolHandler

logger = logging.getLogger("tpi-redes")


@dataclass
class UDPSession:
    state: str  # "WAITING_HEADER", "WAITING_METADATA", "RECEIVING_CONTENT"
    header: Header | None = None
    filename: str | None = None
    file_hash: str | None = None
    received_bytes: int = 0
    file_path: Path | None = None


class UDPServer(BaseServer):
    def __init__(self, host: str, port: int, save_dir: str):
        super().__init__(host, port, save_dir)
        self.sessions: dict[tuple[str, int], UDPSession] = {}
        self.sock: socket.socket | None = None # Initialize sock attribute

    def start(self):
        """Start listening for UDP packets."""
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.sock.bind((self.host, self.port))
            logger.info(f"UDP Server listening on {self.host}:{self.port}")

            try:
                while True:
                    data, addr = self.sock.recvfrom(65535)  # Max UDP size
                    self.process_datagram(data, addr)
            except KeyboardInterrupt:
                logger.info("Server stopping...")

    def stop(self):
        pass

    def process_datagram(self, data: bytes, addr: tuple[str, int]):
        """Process a single UDP datagram based on session state."""
        session = self.sessions.get(addr)

        # New session logic
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

        # Existing session logic
        try:
            if session.state == "WAITING_METADATA":
                # Expecting Name + Hash
                expected_len = session.header.name_len + session.header.hash_len  # type: ignore
                if len(data) == expected_len:
                    name_bytes = data[: session.header.name_len]  # type: ignore
                    hash_bytes = data[session.header.name_len :]  # type: ignore

                    session.filename = name_bytes.decode("utf-8")
                    session.file_hash = hash_bytes.decode("utf-8")

                    # Prepare file
                    save_path = Path(self.save_dir) / session.filename
                    save_path.parent.mkdir(parents=True, exist_ok=True)
                    session.file_path = save_path

                    # Clear file if exists
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

                # Append data to file
                with open(session.file_path, "ab") as f:
                    f.write(data)
                    session.received_bytes += len(data)

                logger.debug(
                    f"[{addr}] Chunk {len(data)} bytes. Total: {session.received_bytes}"
                )

                if session.received_bytes >= session.header.file_size:  # type: ignore
                    logger.info(f"[{addr}] Transfer complete: {session.filename}")
                    del self.sessions[addr]

        except Exception as e:
            logger.error(f"[{addr}] Error processing datagram: {e}")
            if addr in self.sessions:
                del self.sessions[addr]
