import logging
import random
import socket
import threading

from tpi_redes.observability.packet_logger import PacketLogger

logger = logging.getLogger("tpi-redes")


class ProxyServer:
    def __init__(
        self, listen_port: int, target_ip: str, target_port: int, corruption_rate: float
    ):
        self.listen_port = listen_port
        self.target_ip = target_ip
        self.target_port = target_port
        self.corruption_rate = corruption_rate
        self.running = False

    def start(self):
        self.running = True
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server_socket:
            server_socket.bind(("0.0.0.0", self.listen_port))
            server_socket.listen(5)
            logger.info(
                f"MITM Proxy listening on port {self.listen_port}, "
                f"targeting {self.target_ip}:{self.target_port}"
            )
            logger.info(f"Corruption Rate: {self.corruption_rate * 100}%")

            while self.running:
                try:
                    client_socket, addr = server_socket.accept()
                    logger.info(f"Accepted connection from {addr}")
                    threading.Thread(
                        target=self.handle_client, args=(client_socket,)
                    ).start()
                except Exception as e:
                    if self.running:
                        logger.error(f"Error accepting connection: {e}")

    def handle_client(self, client_socket: socket.socket):
        try:
            # Connect to the real server
            target_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            target_socket.connect((self.target_ip, self.target_port))

            # Start threads to forward data in both directions
            client_to_target = threading.Thread(
                target=self.forward, args=(client_socket, target_socket, True)
            )
            target_to_client = threading.Thread(
                target=self.forward, args=(target_socket, client_socket, False)
            )

            client_to_target.start()
            target_to_client.start()

            client_to_target.join()
            target_to_client.join()

        except Exception as e:
            logger.error(f"Proxy connection error: {e}")
        finally:
            client_socket.close()

    def forward(self, source: socket.socket, destination: socket.socket, corrupt: bool):
        try:
            while self.running:
                data = source.recv(4096)
                if not data:
                    break

                if corrupt and self.corruption_rate > 0:
                    original_data = data
                    data = self.corrupt_data(data)
                    info_tag = " [CORRUPTED]" if data != original_data else ""
                else:
                    info_tag = ""

                destination.sendall(data)

                # App-Level Log
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
        if random.random() < self.corruption_rate:
            # Flip a random bit in a random byte
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
