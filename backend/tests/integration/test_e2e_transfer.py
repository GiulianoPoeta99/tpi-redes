import hashlib
import socket
import threading
import time

from tpi_redes.transport.tcp_client import TCPClient
from tpi_redes.transport.tcp_server import TCPServer


def get_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        return s.getsockname()[1]

class TestEndToEndTransfer:
    def test_tcp_file_transfer(self, tmp_path):
        """Test end-to-end TCP file transfer.

        Verifies that a file is sent, received, and integrity-checked (hash).

        Args:
            tmp_path: Pytest fixture for temporary directory.

        Returns:
            None: No return value.
        """
        server_port = get_free_port()
        receive_dir = tmp_path / "received"
        receive_dir.mkdir()

        send_file = tmp_path / "test_file.bin"
        original_data = b"Hello World" * 1000
        send_file.write_bytes(original_data)

        send_file.write_bytes(original_data)

        server = TCPServer(host="127.0.0.1", port=server_port, save_dir=str(receive_dir))

        server_thread = threading.Thread(target=server.start, daemon=True)
        server_thread.start()

        server_thread = threading.Thread(target=server.start, daemon=True)
        server_thread.start()

        time.sleep(0.5)

        try:
            client = TCPClient()
            client.send_files([send_file], "127.0.0.1", server_port)

            client.send_files([send_file], "127.0.0.1", server_port)

            time.sleep(0.5)

            received_file = receive_dir / "test_file.bin"
            assert received_file.exists()
            assert received_file.read_bytes() == original_data

            assert received_file.exists()
            assert received_file.read_bytes() == original_data

            hash_file = receive_dir / "test_file.bin.sha256"
            assert hash_file.exists()
            expected_hash = hashlib.sha256(original_data).hexdigest()
            assert hash_file.read_text() == expected_hash

        finally:
            server.stop()
