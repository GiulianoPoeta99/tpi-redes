from tpi_redes.core.protocol import ProtocolHandler
from tpi_redes.transport.tcp_client import TCPClient


class TestTCPClient:
    def test_send_files(self, tmp_path):
        """Test sending multiple files via TCP.

        Verifies packetization (header, metadata, content) and concatenation.

        Args:
            tmp_path: Pytest fixture for source files.

        Returns:
            None: No return value.
        """
        file1 = tmp_path / "file1.txt"
        content1 = b"Content 1"
        file1.write_bytes(content1)

        file2 = tmp_path / "file2.txt"
        content2 = b"Content 2"
        file2.write_bytes(content2)

        sent_data = b""

        class MockSocket:
            def connect(self, addr: tuple[str, int]):
                pass

            def sendall(self, data: bytes):
                nonlocal sent_data
                sent_data += data

            def close(self):
                pass

            def getsockname(self):
                return ("127.0.0.1", 12345)

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc_val, exc_tb):
                pass

        import socket

        original_socket = socket.socket

        def mock_socket_ctor(*_args, **_kwargs):
            return MockSocket()

        socket.socket = mock_socket_ctor

        try:
            client = TCPClient()
            client.send_files([file1, file2], "127.0.0.1", 8080)

            offset = 0

            # --- File 1 ---
            header1_data = sent_data[offset : offset + 16]
            header1 = ProtocolHandler.unpack_header(header1_data)
            assert header1.op_code == b"F"
            assert header1.file_size == len(content1)
            offset += 16

            fname1 = sent_data[offset : offset + header1.name_len]
            assert fname1.decode() == "file1.txt"
            offset += header1.name_len

            offset += header1.hash_len

            c1 = sent_data[offset : offset + len(content1)]
            assert c1 == content1
            offset += len(content1)

            # --- File 2 ---
            header2_data = sent_data[offset : offset + 16]
            header2 = ProtocolHandler.unpack_header(header2_data)
            assert header2.op_code == b"F"
            assert header2.file_size == len(content2)
            offset += 16

            fname2 = sent_data[offset : offset + header2.name_len]
            assert fname2.decode() == "file2.txt"
            offset += header2.name_len

            offset += header2.hash_len

            c2 = sent_data[offset : offset + len(content2)]
            assert c2 == content2
            offset += len(content2)

            assert offset == len(sent_data)

        finally:
            socket.socket = original_socket
