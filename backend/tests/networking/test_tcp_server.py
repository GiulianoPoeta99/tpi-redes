from tpi_redes.networking.tcp_server import TCPServer


class TestTCPServer:
    def test_initialization(self):
        server = TCPServer(host="127.0.0.1", port=9999, save_dir="/tmp")
        assert server.host == "127.0.0.1"
        assert server.port == 9999
        assert server.save_dir == "/tmp"

    def test_handle_client_receive_multiple_files(self, tmp_path):
        # Setup
        save_dir = tmp_path / "received"
        save_dir.mkdir()
        server = TCPServer(host="127.0.0.1", port=0, save_dir=str(save_dir))

        # Mock socket
        class MockSocket:
            def __init__(self, data_stream: bytes):
                self.data_stream = data_stream
                self.closed = False

            def recv(self, bufsize: int) -> bytes:
                if not self.data_stream:
                    return b""
                chunk = self.data_stream[:bufsize]
                self.data_stream = self.data_stream[bufsize:]
                return chunk

            def close(self):
                self.closed = True

            def settimeout(self, t):
                pass

            def getsockname(self):
                return ("127.0.0.1", 12345)

        # Prepare data: File 1 + File 2
        from tpi_redes.networking.protocol import ProtocolHandler

        # File 1
        f1_name = "file1.txt"
        f1_content = b"Content 1"
        f1_hash = "hash1"
        h1 = ProtocolHandler.pack_header(b"F", f1_name, len(f1_content), f1_hash)
        payload1 = h1 + f1_name.encode() + f1_hash.encode() + f1_content

        # File 2
        f2_name = "file2.txt"
        f2_content = b"Content 2"
        f2_hash = "hash2"
        h2 = ProtocolHandler.pack_header(b"F", f2_name, len(f2_content), f2_hash)
        payload2 = h2 + f2_name.encode() + f2_hash.encode() + f2_content

        # Combined Stream
        stream_data = payload1 + payload2

        mock_sock = MockSocket(stream_data)

        # Execute
        server.handle_client(mock_sock, ("127.0.0.1", 12345))

        # Verify File 1
        saved_f1 = save_dir / f1_name
        assert saved_f1.exists()
        assert saved_f1.read_bytes() == f1_content

        # Verify File 2
        saved_f2 = save_dir / f2_name
        assert saved_f2.exists()
        assert saved_f2.read_bytes() == f2_content
