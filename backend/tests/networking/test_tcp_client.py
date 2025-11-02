from tpi_redes.networking.protocol import ProtocolHandler
from tpi_redes.networking.tcp_client import TCPClient


class TestTCPClient:
    def test_send_files(self, tmp_path):
        # Setup source files
        file1 = tmp_path / "file1.txt"
        content1 = b"Content 1"
        file1.write_bytes(content1)

        file2 = tmp_path / "file2.txt"
        content2 = b"Content 2"
        file2.write_bytes(content2)

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

            def __exit__(self, exc_type, exc_val, exc_tb):
                pass

        # Mock socket.socket
        import socket

        original_socket = socket.socket

        def mock_socket_ctor(*args, **kwargs):
            return MockSocket()

        socket.socket = mock_socket_ctor

        try:
            client = TCPClient()
            client.send_files([file1, file2], "127.0.0.1", 8080)

            # Verification Logic
            # We expect: Header1 + Meta1 + Content1 + Header2 + Meta2 + Content2

            offset = 0

            # --- File 1 ---
            # 1. Header (16 bytes)
            header1_data = sent_data[offset : offset + 16]
            header1 = ProtocolHandler.unpack_header(header1_data)
            assert header1.op_code == b"F"
            assert header1.file_size == len(content1)
            offset += 16

            # 2. Filename
            fname1 = sent_data[offset : offset + header1.name_len]
            assert fname1.decode() == "file1.txt"
            offset += header1.name_len

            # 3. Hash
            offset += header1.hash_len

            # 4. Content
            c1 = sent_data[offset : offset + len(content1)]
            assert c1 == content1
            offset += len(content1)

            # --- File 2 ---
            # 1. Header
            header2_data = sent_data[offset : offset + 16]
            header2 = ProtocolHandler.unpack_header(header2_data)
            assert header2.op_code == b"F"
            assert header2.file_size == len(content2)
            offset += 16

            # 2. Filename
            fname2 = sent_data[offset : offset + header2.name_len]
            assert fname2.decode() == "file2.txt"
            offset += header2.name_len

            # 3. Hash
            offset += header2.hash_len

            # 4. Content
            c2 = sent_data[offset : offset + len(content2)]
            assert c2 == content2
            offset += len(content2)

            # Ensure no extra data
            assert offset == len(sent_data)

        finally:
            socket.socket = original_socket
