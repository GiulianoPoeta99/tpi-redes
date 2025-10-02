from tpi_redes.networking.protocol import ProtocolHandler
from tpi_redes.networking.tcp_client import TCPClient


class TestTCPClient:
    def test_send_file(self, tmp_path):
        # Setup source file
        file_path = tmp_path / "source.txt"
        content = b"Client Test Content"
        file_path.write_bytes(content)

        # Mock socket
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

            def __exit__(self, exc_type: object, exc_val: object, exc_tb: object):
                pass

        # Mock socket.socket
        import socket

        original_socket = socket.socket

        def mock_socket_ctor(*_args, **_kwargs):
            return MockSocket()

        socket.socket = mock_socket_ctor

        try:
            client = TCPClient()
            client.send_file(file_path, "127.0.0.1", 8080)

            # Verify sent data structure
            # 1. Header (16 bytes)
            header_data = sent_data[:16]
            header = ProtocolHandler.unpack_header(header_data)

            assert header.op_code == b"F"
            assert header.file_size == len(content)

            # 2. Filename
            offset = 16
            filename_sent = sent_data[offset : offset + header.name_len]
            assert filename_sent.decode() == "source.txt"

            # 3. Hash (skip verification of exact hash value for now, just length)
            offset += header.name_len
            hash_sent = sent_data[offset : offset + header.hash_len]
            assert len(hash_sent) == header.hash_len

            # 4. Content
            offset += header.hash_len
            content_sent = sent_data[offset:]
            assert content_sent == content

        finally:
            socket.socket = original_socket
